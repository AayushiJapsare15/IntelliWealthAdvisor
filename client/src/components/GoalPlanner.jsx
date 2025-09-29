import React, { useState, useMemo } from 'react';
import { Target, Calendar, DollarSign, ChevronRight, Zap, Brain, Check, Sparkles, Send, RefreshCw, TrendingUp, AlertTriangle, Info } from 'lucide-react';
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
    setCategoryWeights(prev => ({ ...prev, [category]: parseInt(value) }));
  };

  const canProceed = goalData.goal && goalData.targetAmount && goalData.timeline && goalData.salary;

  const handleModelSelection = (type) => {
    setModelType(type);
    if (type === 'pareto') {
      setStep('result');
      generateParetoRecommendation();
    } else {
      setStep('weights');
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

  const generateLLMRecommendation = (isRefinement = false) => {
    setIsProcessing(true);
    
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
        // Parse feedback for adjustments
        const lowerFeedback = feedback.toLowerCase();
        const adjustments = {};
        
        categories.forEach(cat => {
          const catLower = cat.toLowerCase();
          if (lowerFeedback.includes(catLower) || lowerFeedback.includes(cat)) {
            if (lowerFeedback.includes('more') || lowerFeedback.includes('increase') || lowerFeedback.includes('higher')) {
              adjustments[cat] = 'increase';
            } else if (lowerFeedback.includes('less') || lowerFeedback.includes('reduce') || lowerFeedback.includes('decrease') || lowerFeedback.includes('lower')) {
              adjustments[cat] = 'decrease';
            }
          }
        });
        
        // Apply adjustments to previous recommendation
        const previous = recommendation.recommendedBudget;
        categories.forEach(cat => {
          const current = previous[cat];
          const minAllowed = salary * REALISTIC_MINIMUMS[cat];
          const maxAllowed = salary * REALISTIC_MAXIMUMS[cat];
          
          if (adjustments[cat] === 'increase') {
            const increased = Math.min(current * 1.15, maxAllowed);
            recommendedBudget[cat] = Math.round(increased);
            
            if (increased >= maxAllowed) {
              newWarnings.push(`${cat}: Already at recommended maximum ($${maxAllowed.toFixed(0)}/month or ${(maxAllowed/salary*100).toFixed(0)}% of income)`);
              explanations[cat] = `Increased to maximum safe level. Further increases may compromise savings goal.`;
            } else {
              explanations[cat] = `Increased by 15% based on your feedback. New allocation: $${recommendedBudget[cat]}.`;
            }
          } else if (adjustments[cat] === 'decrease') {
            const decreased = Math.max(current * 0.85, minAllowed);
            recommendedBudget[cat] = Math.round(decreased);
            
            if (decreased <= minAllowed) {
              newWarnings.push(`${cat}: At minimum safe level ($${minAllowed.toFixed(0)}/month). Further cuts not recommended.`);
              explanations[cat] = `Already at minimum sustainable level to maintain basic needs.`;
            } else {
              explanations[cat] = `Reduced by 15% as requested. Savings redirected to goal.`;
            }
          } else {
            recommendedBudget[cat] = current;
            explanations[cat] = recommendation.explanations[cat];
          }
        });
        
        setAttemptCount(prev => prev + 1);
        setChatHistory(prev => [...prev, 
          { role: 'user', content: feedback },
          { role: 'assistant', content: `Adjusted plan based on your preferences. ${Object.keys(adjustments).length} categories modified.` }
        ]);
        setFeedback('');
        
      } else {
        // Initial LLM recommendation based on weights
        const totalWeight = Object.values(categoryWeights).reduce((a, b) => a + b, 0);
        const normalizedWeights = {};
        categories.forEach(cat => {
          normalizedWeights[cat] = categoryWeights[cat] / totalWeight;
        });
        
        categories.forEach(cat => {
          const current = spendingData.categoryTotals[cat];
          const weight = normalizedWeights[cat];
          const minAllowed = salary * REALISTIC_MINIMUMS[cat];
          const maxAllowed = salary * REALISTIC_MAXIMUMS[cat];
          
          // Higher weight = protect more, lower weight = cut more
          const protectionFactor = 0.7 + (weight * 0.6); // Range: 0.7 to 1.3
          let recommended = current * protectionFactor;
          
          // Apply bounds
          recommended = Math.max(minAllowed, Math.min(recommended, maxAllowed));
          
          recommendedBudget[cat] = Math.round(recommended);
          
          const percentChange = ((recommended - current) / current * 100).toFixed(0);
          const changeDirection = recommended < current ? 'reduced' : 'increased';
          
          explanations[cat] = `Priority level: ${categoryWeights[cat]}/100. ${changeDirection === 'reduced' ? 'Optimizing' : 'Protecting'} based on your stated importance. Budget ${changeDirection} by ${Math.abs(percentChange)}% to $${recommendedBudget[cat]} (${(recommended/salary*100).toFixed(1)}% of income).`;
        });
        
        setChatHistory([
          { role: 'system', content: 'AI Advisor initialized with your priority settings.' },
          { role: 'assistant', content: 'I\'ve created a personalized budget based on your priorities. You can refine it below.' }
        ]);
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
          : `Based on your priorities, I've optimized your budget to save $${achievedSavings.toFixed(0)}/month (${((achievedSavings/salary)*100).toFixed(1)}% of income). High-priority categories are better protected.`
      });
      setIsProcessing(false);
    }, 2000);
  };

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
                  <p className="text-green-500 font-semibold mb-4">AI Advisor</p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Custom priority weights</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Iterative refinement with limits</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-300">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Smart warnings for unrealistic changes</span>
                  </li>
                </ul>

                <div className="pt-4 border-t border-zinc-800">
                  <span className="text-sm text-gray-400">Best for: Detailed planning</span>
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
                {categories.map(cat => (
                  <div key={cat}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{cat}</span>
                      <span className="text-green-500 font-bold">{categoryWeights[cat]}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={categoryWeights[cat]}
                      onChange={(e) => handleWeightChange(cat, e.target.value)}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #10b981 0%, #10b981 ${categoryWeights[cat]}%, #27272a ${categoryWeights[cat]}%, #27272a 100%)`
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setStep('result');
                  generateLLMRecommendation();
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Sparkles className="w-5 h-5" />
                Generate AI Recommendation
              </button>
            </div>
          </div>
        )}

        {/* Step 3b: Results */}
        {step === 'result' && recommendation && (
          <div className="space-y-6">
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
                  <BarChart data={categories.map(cat => ({
                    category: cat,
                    current: spendingData.categoryTotals[cat],
                    recommended: recommendation.recommendedBudget[cat]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="category" stroke="#a1a1aa" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="current" fill="#6b7280" name="Current" />
                    <Bar dataKey="recommended" fill="#10b981" name="Recommended" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4">Recommended Budget</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categories.map((cat, idx) => ({
                        name: cat,
                        value: recommendation.recommendedBudget[cat]
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

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
                    {modelType === 'pareto' ? 'Pareto Optimizer' : 'AI Advisor'}
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

            {/* Expert Mode: Feedback Loop */}
            {modelType === 'llm' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-green-500" />
                  Refine Your Plan
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({5 - attemptCount} refinements remaining)
                  </span>
                </h3>
                
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
                    disabled={isProcessing || attemptCount >= 5}
                  />
                  <button
                    onClick={() => generateLLMRecommendation(true)}
                    disabled={!feedback || isProcessing || attemptCount >= 5}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-zinc-800 disabled:text-gray-500 text-black px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
                  >
                    {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Be specific about which categories to increase/decrease
                </p>
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
              <p className="text-lg font-semibold">Analyzing your finances...</p>
              <p className="text-sm text-gray-400 mt-2">Calculating optimal budget allocation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}