import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Target, Calendar, DollarSign, ChevronRight, Zap, Brain, Check, Sparkles, Send, RefreshCw, TrendingUp, AlertTriangle, Info, Database, Settings, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const categories = ['Housing', 'Food', 'Transportation', 'Entertainment', 'Healthcare', 'Other'];

// Realistic spending baselines (% of salary)
const REALISTIC_MINIMUMS = {
  'Housing': 0.25,
  'Food': 0.10,
  'Transportation': 0.08,
  'Healthcare': 0.05,
  'Entertainment': 0.03,
  'Other': 0.05
};

const REALISTIC_MAXIMUMS = {
  'Housing': 0.45,
  'Food': 0.25,
  'Transportation': 0.20,
  'Healthcare': 0.15,
  'Entertainment': 0.20,
  'Other': 0.20
};

// RAG Configuration
const CATEGORY_TO_BUCKET = {
  'Housing': 'essentials',
  'Food': 'essentials', 
  'Transportation': 'essentials',
  'Healthcare': 'essentials',
  'Entertainment': 'discretionary',
  'Other': 'discretionary'
};

const DEFAULT_PRIORITY_WEIGHTS = {
  essentials: 1.0,
  debt: 1.5,
  savings_goal: 1.2,
  discretionary: 0.7,
  subscriptions: 0.8,
  investment: 1.0
};

export default function GoalPlanner() {
  const [step, setStep] = useState('input');
  const [goalData, setGoalData] = useState({
    goal: '',
    targetAmount: '',
    timeline: '',
    salary: ''
  });
  const [modelType, setModelType] = useState('');
  const [categoryWeights, setCategoryWeights] = useState({
    'Housing': 50,
    'Food': 50,
    'Transportation': 50,
    'Entertainment': 50,
    'Healthcare': 50,
    'Other': 50
  });
  const [recommendation, setRecommendation] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // RAG State
  const [ragStatus, setRagStatus] = useState({ embedded: false, indexed: false });
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [userMultipliers, setUserMultipliers] = useState({});
  const [weightChangeTimeout, setWeightChangeTimeout] = useState(null);
  const [hasInitialRecommendation, setHasInitialRecommendation] = useState(false);

  // Generate realistic current spending
  const spendingData = useMemo(() => {
    if (!goalData.salary) return { categoryTotals: {} };
    
    const salary = parseFloat(goalData.salary);
    const totals = {};
    let sum = 0;
    
    categories.forEach((cat, idx) => {
      const randomFactor = 0.8 + Math.random() * 0.4;
      const basePercent = (REALISTIC_MINIMUMS[cat] + REALISTIC_MAXIMUMS[cat]) / 2;
      const amount = salary * basePercent * randomFactor;
      totals[cat] = Math.round(amount);
      sum += totals[cat];
    });
    
    // Normalize to leave only 5-10% for savings currently
    const targetSpending = salary * (0.92 + Math.random() * 0.05);
    const ratio = targetSpending / sum;
    Object.keys(totals).forEach(cat => {
      totals[cat] = Math.round(totals[cat] * ratio);
    });
    
    return { categoryTotals: totals };
  }, [goalData.salary]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGoalData(prev => ({ ...prev, [name]: value }));
  };

  const handleWeightChange = (category, value) => {
    const newValue = parseInt(value);
    setCategoryWeights(prev => ({ ...prev, [category]: newValue }));
    
    // Debounce the recommendation update
    if (weightChangeTimeout) {
      clearTimeout(weightChangeTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (hasInitialRecommendation && step === 'result') {
        console.log('Weight changed for', category, 'to', newValue, '- updating recommendations');
        generateLLMRecommendation(false, true); // true for isWeightChange
      }
    }, 300); // Reduced to 300ms for more responsiveness
    
    setWeightChangeTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (weightChangeTimeout) {
        clearTimeout(weightChangeTimeout);
      }
    };
  }, [weightChangeTimeout]);

  const canProceed = goalData.goal && goalData.targetAmount && goalData.timeline && goalData.salary;

  const handleModelSelection = (type) => {
    setModelType(type);
    if (type === 'pareto') {
      setStep('result');
      generateParetoRecommendation();
    } else {
      setStep('weights');
      // Initialize multipliers for expert mode
      const initialMultipliers = {};
      Object.keys(DEFAULT_PRIORITY_WEIGHTS).forEach(k => {
        initialMultipliers[k] = 1.0;
      });
      setUserMultipliers(initialMultipliers);
    }
  };

  const generateParetoRecommendation = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const salary = parseFloat(goalData.salary);
      const targetAmount = parseFloat(goalData.targetAmount);
      const timeline = parseInt(goalData.timeline);
      const requiredMonthlySavings = targetAmount / timeline;
      
      // Calculate savings rate needed
      const savingsRate = requiredMonthlySavings / salary;
      
      // Pareto analysis: find top spending categories
      const spending = Object.entries(spendingData.categoryTotals)
        .sort((a, b) => b[1] - a[1]);
      
      const totalSpending = spending.reduce((sum, [_, amt]) => sum + amt, 0);
      const paretoCategories = [];
      let cumulative = 0;
      
      for (const [cat, amt] of spending) {
        cumulative += amt;
        paretoCategories.push(cat);
        if (cumulative / totalSpending >= 0.8) break;
      }
      
      // Generate recommended budget with detailed reasoning
      const recommendedBudget = {};
      const explanations = {};
      const newWarnings = [];
      
      categories.forEach(cat => {
        const current = spendingData.categoryTotals[cat];
        const minAllowed = salary * REALISTIC_MINIMUMS[cat];
        const maxAllowed = salary * REALISTIC_MAXIMUMS[cat];
        
        let recommended;
        let reason;
        
        if (paretoCategories.includes(cat)) {
          // Apply 80/20 optimization to top categories
          const reductionFactor = savingsRate < 0.3 ? 0.85 : 0.75;
          recommended = Math.max(current * reductionFactor, minAllowed);
          reason = `High-impact category (${((current/salary)*100).toFixed(0)}% of income). Applying Pareto principle: reduce by ${((1-reductionFactor)*100).toFixed(0)}% to maximize savings efficiency while maintaining ${cat.toLowerCase()} quality.`;
        } else {
          // Minor adjustments for other categories
          recommended = Math.max(current * 0.95, minAllowed);
          reason = `Lower-impact category. Minimal ${((0.05)*100).toFixed(0)}% reduction maintains lifestyle balance.`;
        }
        
        // Ensure within realistic bounds
        if (recommended < minAllowed) {
          recommended = minAllowed;
          reason += ` ⚠️ Already at minimum safe level ($${minAllowed.toFixed(0)}/month).`;
          newWarnings.push(`${cat} is at minimum safe spending level.`);
        }
        
        recommendedBudget[cat] = Math.round(recommended);
        explanations[cat] = reason;
      });
      
      const totalRecommendedSpending = Object.values(recommendedBudget).reduce((a, b) => a + b, 0);
      const achievedSavings = salary - totalRecommendedSpending;
      
      // Check if goal is achievable
      if (achievedSavings < requiredMonthlySavings) {
        newWarnings.push(`Goal requires $${requiredMonthlySavings.toFixed(0)}/month but maximum feasible savings is $${achievedSavings.toFixed(0)}/month. Consider extending timeline to ${Math.ceil(targetAmount / achievedSavings)} months.`);
      }
      
      setWarnings(newWarnings);
      setRecommendation({
        recommendedBudget,
        monthlySavings: achievedSavings,
        savingsRate: (achievedSavings / salary) * 100,
        paretoCategories,
        explanations,
        goalProjection: {
          monthlyProgress: achievedSavings,
          totalByTimeline: achievedSavings * timeline,
          goalAmount: targetAmount,
          achievable: achievedSavings * timeline >= targetAmount,
          actualTimeNeeded: Math.ceil(targetAmount / achievedSavings)
        },
        message: `Pareto analysis identified ${paretoCategories.join(', ')} as your highest-impact spending categories (80% of spending). By optimizing these areas, you can save $${achievedSavings.toFixed(0)}/month (${((achievedSavings/salary)*100).toFixed(1)}% of income) while minimizing lifestyle disruption.`
      });
      setIsProcessing(false);
    }, 1500);
  };

  // RAG Functions
  const createTransactionEmbedding = (tx) => {
    const text = `${tx.category || ''} ${tx.merchant_payee_name || ''} ${tx.narration_ || ''} ${tx.amount}`;
    
    const features = {
      amount: Math.log(Math.abs(tx.amount || 1)),
      isDebit: tx.transaction_type === 'debit' ? 1 : 0,
      category: tx.category || '',
      merchant: tx.merchant_payee_name || '',
      dayOfMonth: new Date().getDate() / 31,
      month: new Date().getMonth() / 12
    };
    
    return { text, features, tx };
  };

  const buildVectorStore = (txns) => {
    // Simulate building embeddings from transactions
    const embeddings = txns.map(tx => createTransactionEmbedding(tx));
    setRagStatus({ embedded: true, indexed: true });
    return embeddings;
  };

  const retrieveRelevantDocs = (query, embeddings, topK = 15) => {
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ');
    
    const scored = embeddings.map(emb => {
      let score = 0;
      const textLower = emb.text.toLowerCase();
      
      keywords.forEach(kw => {
        if (textLower.includes(kw)) score += 5;
      });
      
      // Simulate recency scoring
      const daysSince = Math.random() * 90; // Random days for simulation
      score += Math.max(0, 10 - daysSince / 30);
      
      score += Math.log(Math.abs(emb.tx.amount || 1)) / 10;
      
      return { ...emb, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.tx);
  };

  const computeUserStats = (txns, months = 3) => {
    // Simulate user stats computation
    const spendByBucket = {};
    const categorySpend = {};
    let totalSpend = 0;
    let totalIncome = parseFloat(goalData.salary) * months;
    
    categories.forEach(cat => {
      const bucket = CATEGORY_TO_BUCKET[cat];
      const amount = spendingData.categoryTotals[cat] * months;
      
      totalSpend += amount;
      spendByBucket[bucket] = (spendByBucket[bucket] || 0) + amount;
      categorySpend[cat] = amount;
    });
    
    return {
      totalSpend,
      totalIncome,
      spendByBucket,
      categorySpend,
      recentCount: categories.length * months,
      avgMonthlySpend: totalSpend / months,
      avgMonthlyIncome: totalIncome / months
    };
  };

  const generateRAGPrompt = (userStats, retrievedDocs, priorityWeights, timeline, target) => {
    const retrievedText = retrievedDocs.slice(0, 5).map(tx => 
      `- ${tx.category}: $${tx.amount} on typical spending patterns`
    ).join('\n');
    
    return `You are an expert personal finance assistant analyzing spending patterns using RAG (Retrieval Augmented Generation).

USER FINANCIAL PROFILE:
- Total spend (last 3 months): $${userStats.totalSpend.toFixed(2)}
- Average monthly spend: $${userStats.avgMonthlySpend.toFixed(2)}
- Average monthly income: $${userStats.avgMonthlyIncome.toFixed(2)}
- Current monthly savings: $${(userStats.avgMonthlyIncome - userStats.avgMonthlySpend).toFixed(2)}

SPENDING BY CATEGORY (3 months total):
${Object.entries(userStats.spendByBucket).map(([k, v]) => `  • ${k}: $${v.toFixed(2)}`).join('\n')}

DETAILED CATEGORY BREAKDOWN:
${Object.entries(userStats.categorySpend).map(([k, v]) => `  • ${k}: $${v.toFixed(2)} (monthly avg: $${(v/3).toFixed(2)})`).join('\n')}

PRIORITY WEIGHTS (from Reinforcement Learning):
${Object.entries(priorityWeights).map(([k, v]) => `  • ${k}: ${v.toFixed(2)}x multiplier`).join('\n')}

RELEVANT SPENDING PATTERNS (RAG Retrieved):
${retrievedText}

USER SAVINGS GOAL:
Save $${target} in ${timeline} months (requires $${(target/timeline).toFixed(2)}/month)

ANALYSIS REQUIRED:
1. Check if timeline is realistic (savings should not exceed 40% of monthly income)
2. If unrealistic, calculate extended timeline needed
3. For each spending category, recommend monthly budget considering:
   - Priority weights (higher weight = more lenient budget)
   - Essential vs discretionary nature
   - Current spending patterns
   - User's reinforcement learning multipliers
4. Calculate total monthly savings achievable with recommendations

OUTPUT FORMAT (JSON only):
{
  "is_timeline_realistic": boolean,
  "timeline_months": number (original or extended),
  "extended_timeline": number or null,
  "monthly_savings": number,
  "monthly_budget_by_category": {
    "Housing": recommended_monthly_amount,
    "Food": recommended_monthly_amount,
    "Transportation": recommended_monthly_amount,
    "Entertainment": recommended_monthly_amount,
    "Healthcare": recommended_monthly_amount,
    "Other": recommended_monthly_amount
  },
  "notes": "Brief explanation (2-3 sentences max)",
  "key_insights": ["insight1", "insight2", "insight3"]
}

Provide ONLY the JSON response, no additional text.`;
  };

  const callGroqLLM = async (prompt) => {
    if (!apiKey) {
      throw new Error('Please configure your Groq API key first');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analysis expert. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Groq API call failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const generateRAGRecommendation = async () => {
    setIsProcessing(true);
    
    try {
      // Step 1: Build vector store (simulated)
      const simulatedTransactions = categories.map(cat => ({
        category: cat,
        amount: spendingData.categoryTotals[cat],
        transaction_type: 'debit',
        merchant_payee_name: `Typical ${cat} spending`,
        date_time: new Date().toISOString()
      }));
      
      const embeddings = buildVectorStore(simulatedTransactions);
      
      // Step 2: Compute user stats
      const userStats = computeUserStats(simulatedTransactions, 3);
      
      // Step 3: Apply multipliers to priority weights
      const adjustedWeights = {};
      Object.entries(DEFAULT_PRIORITY_WEIGHTS).forEach(([k, v]) => {
        adjustedWeights[k] = v * (userMultipliers[k] || 1.0);
      });
      
      // Step 4: Retrieve relevant documents using RAG
      const query = `spending patterns ${goalData.targetAmount} savings ${goalData.timeline} months budget optimization`;
      const retrievedDocs = retrieveRelevantDocs(query, embeddings, 10);
      
      // Step 5: Generate RAG prompt
      const prompt = generateRAGPrompt(userStats, retrievedDocs, adjustedWeights, goalData.timeline, goalData.targetAmount);
      
      // Step 6: Call Groq LLM
      const llmResponse = await callGroqLLM(prompt);
      
      // Step 7: Parse LLM response
      let parsedResponse;
      try {
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          parsedResponse = JSON.parse(llmResponse);
        }
      } catch (e) {
        console.error('Failed to parse LLM response:', e);
        throw new Error('Invalid LLM response format');
      }
      
      // Step 8: Format recommendations
      const explanations = {};
      const newWarnings = [];
      
      categories.forEach(cat => {
        const current = spendingData.categoryTotals[cat];
        const recommended = parsedResponse.monthly_budget_by_category[cat];
        const bucket = CATEGORY_TO_BUCKET[cat];
        
        explanations[cat] = `RAG analysis with ${bucket} priority (${adjustedWeights[bucket].toFixed(2)}x). AI recommends $${recommended} based on similar spending patterns and your savings goal.`;
      });
      
      if (!parsedResponse.is_timeline_realistic) {
        newWarnings.push(`Timeline extended to ${parsedResponse.extended_timeline} months for realistic savings.`);
      }
      
      setWarnings(newWarnings);
      setRecommendation({
        recommendedBudget: parsedResponse.monthly_budget_by_category,
        monthlySavings: parsedResponse.monthly_savings,
        savingsRate: (parsedResponse.monthly_savings / parseFloat(goalData.salary)) * 100,
        explanations,
        goalProjection: {
          monthlyProgress: parsedResponse.monthly_savings,
          totalByTimeline: parsedResponse.monthly_savings * goalData.timeline,
          goalAmount: parseFloat(goalData.targetAmount),
          achievable: parsedResponse.monthly_savings * goalData.timeline >= parseFloat(goalData.targetAmount),
          actualTimeNeeded: parsedResponse.extended_timeline || goalData.timeline
        },
        message: `RAG + LLM analysis complete! Retrieved ${retrievedDocs.length} relevant spending patterns. ${parsedResponse.notes}`,
        keyInsights: parsedResponse.key_insights,
        ragStats: {
          retrievedDocs: retrievedDocs.length,
          embedded: true,
          userMultipliers: adjustedWeights
        }
      });
      
      setChatHistory([
        { role: 'system', content: 'RAG AI Advisor initialized with transaction embeddings.' },
        { role: 'assistant', content: `I've analyzed ${retrievedDocs.length} spending patterns using RAG. ${parsedResponse.notes}` }
      ]);
      
      setIsProcessing(false);
    } catch (error) {
      console.error('Error generating RAG recommendations:', error);
      setWarnings([`RAG Analysis Failed: ${error.message}. Using fallback method.`]);
      generateLLMRecommendation(false, false); // Fallback to original method with proper parameters
    }
  };

  const generateLLMRecommendation = (isRefinement = false, isWeightChange = false) => {
    if (modelType === 'llm' && apiKey && !isWeightChange) {
      generateRAGRecommendation();
      return;
    }
    
    // Fallback to original LLM logic if no API key or other issues
    setIsProcessing(true);
    
    if (!hasInitialRecommendation && !isRefinement) {
      setHasInitialRecommendation(true);
    }
    
    if (isRefinement && attemptCount >= 5) {
      setWarnings(prev => [...prev, '⚠️ Too many refinements requested. Current plan represents optimal balance given constraints.']);
      setIsProcessing(false);
      return;
    }
    
    setTimeout(() => {
      const salary = parseFloat(goalData.salary);
      const targetAmount = parseFloat(goalData.targetAmount);
      const timeline = parseInt(goalData.timeline);
      const requiredMonthlySavings = targetAmount / timeline;
      
      let recommendedBudget = {};
      let explanations = {};
      const newWarnings = [];
      
      if (isRefinement && feedback) {
        // Enhanced feedback parsing with better natural language processing
        const lowerFeedback = feedback.toLowerCase();
        const adjustments = {};
        
        // Define synonyms for better matching
        const increaseWords = ['more', 'increase', 'higher', 'boost', 'raise', 'up', 'additional', 'extra', 'need more', 'want more'];
        const decreaseWords = ['less', 'reduce', 'decrease', 'lower', 'cut', 'down', 'minimize', 'slash', 'trim'];
        
        categories.forEach(cat => {
          const catLower = cat.toLowerCase();
          const catSynonyms = {
            'housing': ['housing', 'rent', 'mortgage', 'home'],
            'food': ['food', 'groceries', 'eating', 'meals', 'dining'],
            'transportation': ['transportation', 'transport', 'car', 'gas', 'fuel', 'commute', 'travel'],
            'entertainment': ['entertainment', 'fun', 'movies', 'games', 'leisure', 'hobby'],
            'healthcare': ['healthcare', 'health', 'medical', 'doctor', 'medicine'],
            'other': ['other', 'misc', 'miscellaneous']
          };
          
          const relevantSynonyms = catSynonyms[catLower] || [catLower];
          const categoryMentioned = relevantSynonyms.some(synonym => lowerFeedback.includes(synonym));
          
          if (categoryMentioned) {
            // Look for increase indicators near the category mention
            const hasIncrease = increaseWords.some(word => lowerFeedback.includes(word));
            const hasDecrease = decreaseWords.some(word => lowerFeedback.includes(word));
            
            // Check context around the category mention
            relevantSynonyms.forEach(synonym => {
              const index = lowerFeedback.indexOf(synonym);
              if (index !== -1) {
                const before = lowerFeedback.substring(Math.max(0, index - 20), index);
                const after = lowerFeedback.substring(index, Math.min(lowerFeedback.length, index + synonym.length + 20));
                const context = before + after;
                
                const contextHasIncrease = increaseWords.some(word => context.includes(word));
                const contextHasDecrease = decreaseWords.some(word => context.includes(word));
                
                if (contextHasIncrease && !adjustments[cat]) {
                  adjustments[cat] = 'increase';
                } else if (contextHasDecrease && !adjustments[cat]) {
                  adjustments[cat] = 'decrease';
                }
              }
            });
            
            // Fallback to global indicators
            if (!adjustments[cat]) {
              if (hasIncrease) {
                adjustments[cat] = 'increase';
              } else if (hasDecrease) {
                adjustments[cat] = 'decrease';
              }
            }
          }
        });
        
        // Apply adjustments to previous recommendation with better rebalancing
        const previous = recommendation.recommendedBudget;
        let totalAdjustment = 0;
        const tempBudget = { ...previous };
        
        categories.forEach(cat => {
          const current = previous[cat];
          const minAllowed = salary * REALISTIC_MINIMUMS[cat];
          const maxAllowed = salary * REALISTIC_MAXIMUMS[cat];
          
          if (adjustments[cat] === 'increase') {
            const targetIncrease = current * 0.15;
            const actualIncrease = Math.min(targetIncrease, maxAllowed - current);
            tempBudget[cat] = Math.round(current + actualIncrease);
            totalAdjustment += actualIncrease;
            
            if (actualIncrease < targetIncrease) {
              newWarnings.push(`${cat}: Limited increase due to maximum budget constraint ($${maxAllowed.toFixed(0)}/month)`);
            }
            explanations[cat] = `Increased by $${actualIncrease.toFixed(0)} based on your feedback. New allocation: $${tempBudget[cat]}.`;
          } else if (adjustments[cat] === 'decrease') {
            const targetDecrease = current * 0.15;
            const actualDecrease = Math.min(targetDecrease, current - minAllowed);
            tempBudget[cat] = Math.round(current - actualDecrease);
            totalAdjustment -= actualDecrease;
            
            if (actualDecrease < targetDecrease) {
              newWarnings.push(`${cat}: Limited decrease due to minimum budget constraint ($${minAllowed.toFixed(0)}/month)`);
            }
            explanations[cat] = `Reduced by $${actualDecrease.toFixed(0)} as requested. Savings redirected to goal.`;
          } else {
            explanations[cat] = recommendation.explanations[cat];
          }
        });
        
        // Redistribute remaining adjustment across non-adjusted categories
        if (Math.abs(totalAdjustment) > 1) {
          const nonAdjustedCategories = categories.filter(cat => !adjustments[cat]);
          const adjustmentPerCategory = -totalAdjustment / nonAdjustedCategories.length;
          
          nonAdjustedCategories.forEach(cat => {
            const current = tempBudget[cat];
            const minAllowed = salary * REALISTIC_MINIMUMS[cat];
            const maxAllowed = salary * REALISTIC_MAXIMUMS[cat];
            const newAmount = Math.max(minAllowed, Math.min(maxAllowed, current + adjustmentPerCategory));
            tempBudget[cat] = Math.round(newAmount);
            
            if (Math.abs(adjustmentPerCategory) > 10) {
              explanations[cat] += ` Adjusted by $${adjustmentPerCategory.toFixed(0)} to rebalance budget.`;
            }
          });
        }
        
        recommendedBudget = tempBudget;
        
        setAttemptCount(prev => prev + 1);
        
        // Log adjustments for debugging
        console.log('Detected adjustments:', adjustments);
        console.log('Feedback parsed:', feedback);
        
        const adjustmentList = Object.entries(adjustments).map(([cat, action]) => `${cat}: ${action}`).join(', ');
        const responseMessage = Object.keys(adjustments).length > 0 
          ? `Adjusted ${Object.keys(adjustments).length} categories: ${adjustmentList}. Budget redistributed accordingly.`
          : 'No specific category adjustments detected. Please be more specific (e.g., "increase food budget" or "reduce entertainment").';
        
        setChatHistory(prev => [...prev, 
          { role: 'user', content: feedback },
          { role: 'assistant', content: responseMessage }
        ]);
        setFeedback('');
        
      } else {
        // Initial LLM recommendation based on weights
        console.log('Generating recommendation with weights:', categoryWeights);
        console.log('Is weight change:', isWeightChange);
        
        const totalWeight = Object.values(categoryWeights).reduce((a, b) => a + b, 0);
        const normalizedWeights = {};
        categories.forEach(cat => {
          normalizedWeights[cat] = categoryWeights[cat] / totalWeight;
        });
        
        console.log('Normalized weights:', normalizedWeights);
        
        // Calculate target savings and available budget for cuts
        const currentTotalSpending = Object.values(spendingData.categoryTotals).reduce((a, b) => a + b, 0);
        const currentSavings = salary - currentTotalSpending;
        const targetSavings = Math.max(requiredMonthlySavings, currentSavings);
        const neededCuts = Math.max(0, currentTotalSpending + currentSavings - salary + targetSavings);
        
        // Weight-based allocation that properly respects user priorities
        const targetTotalSpending = salary - targetSavings;
        
        // Calculate weighted distribution of target spending
        let weightedBudget = {};
        let totalWeightedAmount = 0;
        
        // First, calculate ideal weighted amounts (ignoring constraints)
        categories.forEach(cat => {
          const weight = normalizedWeights[cat];
          const idealAmount = targetTotalSpending * weight;
          weightedBudget[cat] = idealAmount;
          totalWeightedAmount += idealAmount;
        });
        
        // Apply constraints and redistribute as needed
        let constrainedBudget = {};
        let availableForRedistribution = 0;
        let unconstrainedCategories = [];
        
        categories.forEach(cat => {
          const idealAmount = weightedBudget[cat];
          const minAllowed = salary * REALISTIC_MINIMUMS[cat];
          const maxAllowed = salary * REALISTIC_MAXIMUMS[cat];
          
          if (idealAmount < minAllowed) {
            // Category needs minimum - take from others
            constrainedBudget[cat] = minAllowed;
            availableForRedistribution -= (minAllowed - idealAmount);
          } else if (idealAmount > maxAllowed) {
            // Category exceeds maximum - redistribute excess
            constrainedBudget[cat] = maxAllowed;
            availableForRedistribution += (idealAmount - maxAllowed);
          } else {
            // Category can use ideal amount
            constrainedBudget[cat] = idealAmount;
            unconstrainedCategories.push(cat);
          }
        });
        
        // Redistribute available funds among unconstrained categories based on weights
        if (Math.abs(availableForRedistribution) > 1 && unconstrainedCategories.length > 0) {
          const unconstrainedTotalWeight = unconstrainedCategories.reduce((sum, cat) => sum + normalizedWeights[cat], 0);
          
          unconstrainedCategories.forEach(cat => {
            const redistributionShare = (normalizedWeights[cat] / unconstrainedTotalWeight) * availableForRedistribution;
            constrainedBudget[cat] += redistributionShare;
            
            // Ensure still within bounds after redistribution
            const minAllowed = salary * REALISTIC_MINIMUMS[cat];
            const maxAllowed = salary * REALISTIC_MAXIMUMS[cat];
            constrainedBudget[cat] = Math.max(minAllowed, Math.min(maxAllowed, constrainedBudget[cat]));
          });
        }
        
        // Final assignment with explanations
        categories.forEach(cat => {
          const final = constrainedBudget[cat];
          recommendedBudget[cat] = Math.round(final);
          
          const current = spendingData.categoryTotals[cat];
          const percentChange = ((final - current) / current * 100).toFixed(0);
          const changeDirection = final < current ? 'reduced' : 'increased';
          const weightPercent = (normalizedWeights[cat] * 100).toFixed(1);
          
          explanations[cat] = `Priority: ${categoryWeights[cat]}/100 (${weightPercent}% of budget). ${changeDirection === 'reduced' ? 'Optimized' : 'Protected'} based on your preferences. Budget ${changeDirection} by ${Math.abs(percentChange)}% to $${recommendedBudget[cat]} (${(final/salary*100).toFixed(1)}% of income).`;
        });
        
        if (!isWeightChange) {
          setChatHistory([
            { role: 'system', content: 'AI Advisor initialized with your priority settings.' },
            { role: 'assistant', content: 'I\'ve created a personalized budget based on your priorities. You can refine it below.' }
          ]);
        } else {
          setChatHistory(prev => [...prev, 
            { role: 'assistant', content: 'Budget updated automatically based on your priority changes.' }
          ]);
        }
      }
      
      const totalRecommendedSpending = Object.values(recommendedBudget).reduce((a, b) => a + b, 0);
      const achievedSavings = salary - totalRecommendedSpending;
      
      // Validation warnings
      if (achievedSavings < requiredMonthlySavings) {
        const shortfall = requiredMonthlySavings - achievedSavings;
        newWarnings.push(`⚠️ Current plan saves $${achievedSavings.toFixed(0)}/month but goal requires $${requiredMonthlySavings.toFixed(0)}/month. Shortfall: $${shortfall.toFixed(0)}/month.`);
      }
      
      if (achievedSavings / salary < 0.1) {
        newWarnings.push(`💡 Savings rate is ${((achievedSavings/salary)*100).toFixed(1)}%. Consider cutting discretionary spending further.`);
      }
      
      setWarnings(newWarnings);
      setRecommendation({
        recommendedBudget,
        monthlySavings: achievedSavings,
        savingsRate: (achievedSavings / salary) * 100,
        explanations,
        goalProjection: {
          monthlyProgress: achievedSavings,
          totalByTimeline: achievedSavings * timeline,
          goalAmount: targetAmount,
          achievable: achievedSavings * timeline >= targetAmount,
          actualTimeNeeded: Math.ceil(targetAmount / achievedSavings)
        },
        message: isRefinement 
          ? `Plan updated! Now saving $${achievedSavings.toFixed(0)}/month. ${achievedSavings * timeline >= targetAmount ? '✓ Goal achievable' : '⚠️ May need timeline adjustment'}`
          : isWeightChange
          ? `Budget automatically updated based on your priority changes. Now saving $${achievedSavings.toFixed(0)}/month (${((achievedSavings/salary)*100).toFixed(1)}% of income).`
          : `Based on your priorities, I've optimized your budget to save $${achievedSavings.toFixed(0)}/month (${((achievedSavings/salary)*100).toFixed(1)}% of income). High-priority categories are better protected.`
      });
      setIsProcessing(false);
    }, 2000);
  };

  const handleFeedback = (isPositive) => {
    const feedback = {
      timestamp: new Date().toISOString(),
      positive: isPositive,
      recommendations: recommendation
    };
    
    setFeedbackHistory([...feedbackHistory, feedback]);

    if (!isPositive && modelType === 'llm') {
      const alpha = 0.15;
      const newMultipliers = { ...userMultipliers };
      
      categories.forEach(cat => {
        const bucket = CATEGORY_TO_BUCKET[cat];
        const current = spendingData.categoryTotals[cat];
        const recommended = recommendation.recommendedBudget[cat];
        
        if (current > recommended * 1.1) { // If significantly over recommended
          newMultipliers[bucket] = (newMultipliers[bucket] || 1.0) * (1 + alpha);
        }
      });
      
      setUserMultipliers(newMultipliers);
    }
  };

  // Calculate preview budget based on current weights
  const previewBudget = useMemo(() => {
    if (!goalData.salary) return {};
    
    const salary = parseFloat(goalData.salary);
    const targetAmount = parseFloat(goalData.targetAmount) || 0;
    const timeline = parseInt(goalData.timeline) || 12;
    const requiredSavings = targetAmount / timeline;
    const targetSpending = salary - requiredSavings;
    
    const totalWeight = Object.values(categoryWeights).reduce((a, b) => a + b, 0);
    const preview = {};
    
    categories.forEach(cat => {
      const weight = categoryWeights[cat] / totalWeight;
      const idealAmount = targetSpending * weight;
      const minAllowed = salary * REALISTIC_MINIMUMS[cat];
      const maxAllowed = salary * REALISTIC_MAXIMUMS[cat];
      
      preview[cat] = Math.max(minAllowed, Math.min(maxAllowed, idealAmount));
    });
    
    return preview;
  }, [categoryWeights, goalData.salary, goalData.targetAmount, goalData.timeline]);

  // Prepare data for charts
  const chartData = useMemo(() => {
    if (!recommendation) return [];
    
    return categories.map(cat => ({
      category: cat,
      current: spendingData.categoryTotals[cat],
      recommended: recommendation.recommendedBudget[cat],
      change: recommendation.recommendedBudget[cat] - spendingData.categoryTotals[cat],
      percentChange: ((recommendation.recommendedBudget[cat] - spendingData.categoryTotals[cat]) / spendingData.categoryTotals[cat] * 100)
    }));
  }, [recommendation, spendingData]);

  const pieChartData = useMemo(() => {
    if (!recommendation) return [];
    
    const totalRecommended = Object.values(recommendation.recommendedBudget).reduce((a, b) => a + b, 0);
    
    return categories.map((cat, idx) => ({
      name: cat,
      value: recommendation.recommendedBudget[cat],
      percent: (recommendation.recommendedBudget[cat] / totalRecommended * 100).toFixed(1),
      current: spendingData.categoryTotals[cat],
      color: COLORS[idx % COLORS.length]
    }));
  }, [recommendation, spendingData]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            Smart Financial Goal Planner
          </h1>
          <p className="text-gray-400">AI-powered budget optimization with detailed insights</p>
        </header>

        {/* Step 1: Goal Input */}
        {step === 'input' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Target className="w-6 h-6 text-green-500" />
                Define Your Goal
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">What's your financial goal?</label>
                  <input
                    type="text"
                    name="goal"
                    value={goalData.goal}
                    onChange={handleInputChange}
                    placeholder="e.g., Buy a car, Vacation, Emergency fund"
                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Target Amount ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="targetAmount"
                      value={goalData.targetAmount}
                      onChange={handleInputChange}
                      placeholder="10000"
                      className="w-full bg-black border border-zinc-700 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-green-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Timeline (months)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="timeline"
                      value={goalData.timeline}
                      onChange={handleInputChange}
                      placeholder="12"
                      className="w-full bg-black border border-zinc-700 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-green-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Monthly Salary ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="salary"
                      value={goalData.salary}
                      onChange={handleInputChange}
                      placeholder="5000"
                      className="w-full bg-black border border-zinc-700 rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-green-500 transition"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setStep('model')}
                  disabled={!canProceed}
                  className={`w-full py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                    canProceed
                      ? 'bg-green-500 hover:bg-green-600 text-black'
                      : 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue to Model Selection
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Model Selection */}
        {step === 'model' && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">Choose Your Planning Approach</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div
                onClick={() => handleModelSelection('pareto')}
                className="bg-zinc-900 border-2 border-zinc-800 hover:border-green-500 rounded-2xl p-8 cursor-pointer transition group"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition">
                    <Zap className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Beginner Mode</h3>
                  <p className="text-green-500 font-semibold mb-4">Pareto Optimizer</p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Zero configuration needed</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>80/20 rule: Optimize high-impact areas</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Detailed explanations per category</span>
                  </li>
                </ul>

                <div className="pt-4 border-t border-zinc-800">
                  <span className="text-sm text-gray-400">Best for: First-time planners</span>
                </div>
              </div>

              <div
                onClick={() => handleModelSelection('llm')}
                className="bg-zinc-900 border-2 border-zinc-800 hover:border-green-500 rounded-2xl p-8 cursor-pointer transition group"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition">
                    <Brain className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Expert Mode</h3>
                  <p className="text-green-500 font-semibold mb-4">RAG + LLM Advisor</p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Retrieval Augmented Generation (RAG)</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Reinforcement learning with feedback</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Groq LLM integration for smart analysis</span>
                  </li>
                </ul>

                <div className="pt-4 border-t border-zinc-800">
                  <span className="text-sm text-gray-400">Best for: Advanced planning with AI</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3a: Weight Configuration */}
        {step === 'weights' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Brain className="w-6 h-6 text-green-500" />
                Set Your Priorities
              </h2>
              <p className="text-gray-400 mb-8">Higher values = protect more, lower values = cut more</p>

              <div className="space-y-6 mb-8">
                {categories.map(cat => {
                  const previewAmount = previewBudget[cat] || 0;
                  const currentAmount = spendingData.categoryTotals[cat] || 0;
                  const percentOfBudget = goalData.salary ? ((previewAmount / parseFloat(goalData.salary)) * 100).toFixed(1) : '0';
                  
                  return (
                    <div key={cat} className="bg-zinc-800/50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-lg">{cat}</span>
                        <div className="text-right">
                          <div className="text-green-500 font-bold text-lg">{categoryWeights[cat]}</div>
                          <div className="text-sm text-gray-400">Priority</div>
                        </div>
                      </div>
                      
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={categoryWeights[cat]}
                        onChange={(e) => handleWeightChange(cat, e.target.value)}
                        className="w-full h-3 bg-zinc-700 rounded-lg appearance-none cursor-pointer mb-3"
                        style={{
                          background: `linear-gradient(to right, #10b981 0%, #10b981 ${categoryWeights[cat]}%, #27272a ${categoryWeights[cat]}%, #27272a 100%)`
                        }}
                      />
                      
                      <div className="flex justify-between text-sm">
                        <div className="text-gray-400">
                          Current: <span className="text-white font-medium">${Math.round(currentAmount)}</span>
                        </div>
                        <div className="text-green-400">
                          Preview: <span className="font-medium">${Math.round(previewAmount)}</span> ({percentOfBudget}%)
                        </div>
                      </div>
                      
                      {Math.abs(previewAmount - currentAmount) > 10 && (
                        <div className="mt-2 text-xs">
                          <span className={previewAmount > currentAmount ? 'text-yellow-400' : 'text-green-400'}>
                            {previewAmount > currentAmount ? '↑' : '↓'} 
                            ${Math.abs(previewAmount - currentAmount).toFixed(0)} 
                            ({((previewAmount - currentAmount) / currentAmount * 100).toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* API Key Configuration for Expert Mode */}
              {modelType === 'llm' && (
                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-green-500" />
                      <span className="text-white font-semibold">Groq API Configuration</span>
                      {apiKey && <span className="text-green-500 text-sm">✓ Connected</span>}
                    </div>
                    <button
                      onClick={() => setShowApiInput(!showApiInput)}
                      className="text-green-500 text-sm hover:text-green-400"
                    >
                      {showApiInput ? 'Hide' : apiKey ? 'Update' : 'Configure'}
                    </button>
                  </div>
                  {showApiInput && (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Groq API key (free at groq.com)"
                        className="flex-1 bg-black text-white px-4 py-2 rounded-lg border border-zinc-700"
                      />
                      <button
                        onClick={() => setShowApiInput(false)}
                        className="px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-600 font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  )}
                  <p className="text-gray-400 text-xs mt-2">
                    Get a free API key at <a href="https://console.groq.com" target="_blank" className="text-green-400 underline">console.groq.com</a>
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setStep('result');
                  generateLLMRecommendation(false, false);
                }}
                disabled={modelType === 'llm' && !apiKey}
                className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition ${
                  modelType === 'llm' && !apiKey
                    ? 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-black'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                {modelType === 'llm' ? 'Generate RAG + LLM Analysis' : 'Generate AI Recommendation'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3b: Results */}
        {step === 'result' && recommendation && (
          <div className="space-y-6">
            {/* RAG Status for Expert Mode */}
            {modelType === 'llm' && (
              <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-purple-500" />
                    <span className="text-white font-semibold">RAG System Status</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${ragStatus.embedded ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="text-gray-300">Embeddings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-gray-300">{recommendation.ragStats?.retrievedDocs || 0} patterns retrieved</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-bold text-yellow-500 mb-2">Important Notices</h3>
                    <ul className="space-y-2">
                      {warnings.map((warning, idx) => (
                        <li key={idx} className="text-gray-300 text-sm">{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Goal Projection */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-500" />
                Goal Achievement Projection
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold text-green-500 mb-1">
                    ${recommendation.goalProjection.totalByTimeline.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    Total saved by month {goalData.timeline}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your goal:</span>
                      <span className="font-semibold">${recommendation.goalProjection.goalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly savings:</span>
                      <span className="font-semibold text-green-500">${recommendation.monthlySavings.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Savings rate:</span>
                      <span className="font-semibold">{recommendation.savingsRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  {recommendation.goalProjection.achievable ? (
                    <div className="text-center">
                      <Check className="w-16 h-16 text-green-500 mx-auto mb-3" />
                      <div className="text-lg font-bold text-green-500">Goal Achievable!</div>
                      <div className="text-sm text-gray-400">On track to reach ${recommendation.goalProjection.goalAmount} in {goalData.timeline} months</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
                      <div className="text-lg font-bold text-yellow-500">Timeline Adjustment Needed</div>
                      <div className="text-sm text-gray-400">Estimated {recommendation.goalProjection.actualTimeNeeded} months needed at current rate</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress visualization */}
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={Array.from({ length: parseInt(goalData.timeline) + 1 }, (_, i) => ({
                    month: i,
                    saved: recommendation.monthlySavings * i,
                    goal: recommendation.goalProjection.goalAmount
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" stroke="#a1a1aa" label={{ value: 'Months', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="saved" stroke="#10b981" strokeWidth={3} name="Projected Savings" />
                    <Line type="monotone" dataKey="goal" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Goal Target" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Goal Summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">{goalData.goal}</h3>
                  <p className="text-gray-400">
                    {goalData.timeline} months • ${goalData.salary}/month salary
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-500">
                    ${recommendation.monthlySavings.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-400">Monthly Savings</div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Current vs Recommended */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Spending Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="category" stroke="#a1a1aa" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value, name) => [`$${value}`, name]}
                    />
                    <Legend />
                    <Bar dataKey="current" fill="#6b7280" name="Current" />
                    <Bar dataKey="recommended" fill="#10b981" name="Recommended" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown - FIXED PIE CHART */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Recommended Budget Allocation</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      formatter={(value, name, props) => {
                        const current = props.payload.current;
                        const change = ((value - current) / current * 100).toFixed(1);
                        const changeSymbol = change > 0 ? '+' : '';
                        return [
                          <div key="tooltip" className="text-sm">
                            <div className="font-semibold">{props.payload.name}</div>
                            <div>Recommended: ${value} ({props.payload.percent}%)</div>
                            <div>Current: ${current}</div>
                            <div style={{ color: change >= 0 ? '#ef4444' : '#10b981' }}>
                              Change: {changeSymbol}{change}%
                            </div>
                          </div>
                        ];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Budget Change Summary */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {chartData.map((item, idx) => {
                    const isIncrease = item.percentChange > 0;
                    return (
                      <div key={item.category} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                        <span className="text-gray-300">{item.category}</span>
                        <span className={isIncrease ? 'text-red-500' : 'text-green-500'}>
                          {isIncrease ? '↑' : '↓'} {Math.abs(item.percentChange).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Key Insights for RAG Mode */}
            {modelType === 'llm' && recommendation.keyInsights && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  AI Insights from RAG Analysis
                </h3>
                <ul className="space-y-2">
                  {recommendation.keyInsights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-300">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Explanations */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-green-500" />
                Detailed Budget Breakdown & Reasoning
              </h3>
              <div className="space-y-4">
                {categories.map(cat => {
                  const current = spendingData.categoryTotals[cat];
                  const recommended = recommendation.recommendedBudget[cat];
                  const change = recommended - current;
                  const percentChange = (change / current * 100).toFixed(1);
                  
                  return (
                    <div key={cat} className="border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{cat}</h4>
                          <div className="flex gap-4 text-sm mb-2">
                            <span className="text-gray-400">
                              Current: <span className="text-white font-medium">${current}</span>
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-400">
                              Recommended: <span className="text-green-500 font-medium">${recommended}</span>
                            </span>
                            <span className={`font-semibold ${change < 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                              {change < 0 ? '↓' : '↑'} ${Math.abs(change)} ({change < 0 ? '' : '+'}${percentChange}%)
                            </span>
                          </div>
                        </div>
                        {modelType === 'llm' && (
                          <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded text-xs">
                            <div className={`w-2 h-2 rounded-full ${
                              CATEGORY_TO_BUCKET[cat] === 'essentials' ? 'bg-blue-500' :
                              CATEGORY_TO_BUCKET[cat] === 'discretionary' ? 'bg-yellow-500' : 'bg-gray-500'
                            }`} />
                            <span className="text-gray-400">{CATEGORY_TO_BUCKET[cat]}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {recommendation.explanations[cat]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Message */}
            <div className="bg-zinc-900 border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  {modelType === 'pareto' ? <Zap className="w-5 h-5 text-green-500" /> : <Brain className="w-5 h-5 text-green-500" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-2 text-green-500">
                    {modelType === 'pareto' ? 'Pareto Optimizer' : 'RAG + LLM Advisor'}
                  </div>
                  <p className="text-gray-300">{recommendation.message}</p>
                  
                  {modelType === 'pareto' && recommendation.paretoCategories && (
                    <div className="mt-4 p-4 bg-black/50 rounded-lg">
                      <div className="text-sm text-gray-400 mb-2">Key Optimization Areas (80% of spending):</div>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.paretoCategories.map(cat => (
                          <span key={cat} className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-sm text-green-500">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expert Mode: Enhanced Feedback Loop */}
            {modelType === 'llm' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                  Refine Your Plan
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    (Reinforcement Learning Active)
                  </span>
                </h3>
                
                {/* Feedback Buttons */}
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => handleFeedback(true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 text-green-500 py-3 rounded-lg hover:bg-green-500/30 transition"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    Accept Plan
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 text-red-500 py-3 rounded-lg hover:bg-red-500/30 transition"
                  >
                    <ThumbsDown className="w-5 h-5" />
                    Refine Further
                  </button>
                </div>

                {chatHistory.length > 2 && (
                  <div className="mb-4 space-y-3 max-h-40 overflow-y-auto">
                    {chatHistory.slice(2).map((msg, idx) => (
                      <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-gray-400' : 'text-green-400'}`}>
                        <span className="font-semibold">{msg.role === 'user' ? 'You: ' : 'AI: '}</span>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g., I need more for travel, reduce entertainment..."
                    className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={() => generateLLMRecommendation(true, false)}
                    disabled={!feedback || isProcessing}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-zinc-800 disabled:text-gray-500 text-black px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
                  >
                    {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Quick test buttons for debugging */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => setFeedback('increase food budget')}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded-lg transition"
                  >
                    Test: More Food
                  </button>
                  <button
                    onClick={() => setFeedback('reduce entertainment spending')}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded-lg transition"
                  >
                    Test: Less Entertainment
                  </button>
                  <button
                    onClick={() => setFeedback('more housing less transportation')}
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded-lg transition"
                  >
                    Test: Housing ↑ Transport ↓
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Be specific about which categories to increase/decrease. Try the test buttons above or use natural language.
                </p>

                {/* Learning History */}
                {feedbackHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Learning History</h4>
                    <div className="space-y-2">
                      {feedbackHistory.slice(-3).reverse().map((fb, i) => (
                        <div key={i} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded text-xs">
                          <div className="flex items-center gap-2">
                            {fb.positive ? (
                              <ThumbsUp className="w-3 h-3 text-green-500" />
                            ) : (
                              <ThumbsDown className="w-3 h-3 text-red-500" />
                            )}
                            <span className="text-gray-300">
                              {fb.positive ? 'Accepted' : 'Refined'} plan
                            </span>
                          </div>
                          <span className="text-gray-500">
                            {new Date(fb.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep('input');
                  setRecommendation(null);
                  setChatHistory([]);
                  setModelType('');
                  setWarnings([]);
                  setAttemptCount(0);
                  setFeedbackHistory([]);
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 rounded-lg transition"
              >
                Start Over
              </button>
              <button
                onClick={() => alert('Plan saved successfully! 💾 You can now track your progress.')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-black font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Check className="w-5 h-5" />
                Accept Plan
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-green-500/20 rounded-2xl p-8 text-center">
              <RefreshCw className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold">
                {modelType === 'llm' ? 'Running RAG Pipeline...' : 'Analyzing your finances...'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {modelType === 'llm' ? 'Retrieving patterns and generating AI insights' : 'Calculating optimal budget allocation'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}