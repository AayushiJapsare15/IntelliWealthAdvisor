import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

// Import components
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import BudgetRecommender from './components/BudgetRecommender';
import NewsUpdate from './components/NewsUpdate';
import InvestmentRecommendation from './components/InvestmentRecommendation';
import AddTransactionModal from './components/AddTransactionModal';

const FinancialAdvisorApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    balance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    savingsRate: 0
  });

  // Load CSV file on component mount
  useEffect(() => {
    if (isLoggedIn) {
      loadTransactionsFromFile();
    }
  }, [isLoggedIn]);

  const loadTransactionsFromFile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/transactions.csv');
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processedData = results.data.map((row, index) => ({
            id: row.transaction_id || `trans-${index}`,
            accountId: row.account_id,
            dateTime: row.date_time,
            amount: parseFloat(row.amount) || 0,
            currency: row.currency,
            transactionType: row.transaction_type,
            merchantCategory: row.category || 'Other',
            narration: row.narration || '',
            balanceAfter: parseFloat(row.balance_after_transaction) || 0
          }));

          setTransactions(processedData);
          calculateStats(processedData);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error reading file:', error);
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const income = data
      .filter(t => t.transactionType === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = data
      .filter(t => t.transactionType === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = data.length > 0 ? data[data.length - 1].balanceAfter : 0;
    const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0;

    setStats({
      balance: balance,
      totalIncome: income,
      totalExpenses: expenses,
      savingsRate: savingsRate
    });
  };

  // Get expense breakdown by category
  const getExpenseBreakdown = () => {
    const categoryTotals = {};
    
    transactions
      .filter(t => t.transactionType === 'debit')
      .forEach(t => {
        const category = t.merchantCategory || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
      });

    const colors = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    
    return Object.entries(categoryTotals)
      .map(([name, value], index) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  // Get weekly transaction data
  const getWeeklyData = () => {
    const weeklyData = {};
    
    transactions.forEach(t => {
      if (!t.dateTime) return;
      
      const date = new Date(t.dateTime);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { date: weekKey, income: 0, expense: 0 };
      }
      
      if (t.transactionType === 'credit') {
        weeklyData[weekKey].income += t.amount;
      } else {
        weeklyData[weekKey].expense += t.amount;
      }
    });

    return Object.values(weeklyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-4)
      .map((week, index) => ({
        date: `Week ${index + 1}`,
        income: parseFloat(week.income.toFixed(2)),
        expense: parseFloat(week.expense.toFixed(2))
      }));
  };

  // Get recent transactions (last 10)
  const getRecentTransactions = () => {
    return transactions
      .slice(-10)
      .reverse()
      .map(t => ({
        id: t.id,
        date: t.dateTime ? new Date(t.dateTime).toLocaleDateString() : 'N/A',
        title: t.narration,
        category: t.merchantCategory,
        type: t.transactionType === 'credit' ? 'INCOME' : 'EXPENSE',
        amount: t.amount,
        transDate: t.dateTime ? new Date(t.dateTime).toLocaleDateString() : 'N/A',
        payment: 'Bank Account',
        frequency: 'One-time',
        currency: t.currency
      }));
  };

  // Budget recommendations based on actual data
  const getBudgetRecommendations = () => {
    const categoryTotals = {};
    
    transactions
      .filter(t => t.transactionType === 'debit')
      .forEach(t => {
        const category = t.merchantCategory || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
      });

    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, current]) => {
        const recommended = current * 0.85;
        const ratio = current / recommended;
        let status = 'good';
        if (ratio > 1.2) status = 'danger';
        else if (ratio > 1.1) status = 'warning';
        
        return {
          category,
          recommended: parseFloat(recommended.toFixed(2)),
          current: parseFloat(current.toFixed(2)),
          status
        };
      });
  };

  // Main App Layout
  if (!isLoggedIn) {
    return <LoginScreen setIsLoggedIn={setIsLoggedIn} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard 
            loading={loading}
            stats={stats}
            transactions={transactions}
            setShowAddTransaction={setShowAddTransaction}
            loadTransactionsFromFile={loadTransactionsFromFile}
            getExpenseBreakdown={getExpenseBreakdown}
            getWeeklyData={getWeeklyData}
            getRecentTransactions={getRecentTransactions}
          />
        )}
        {activeTab === 'budget' && (
          <BudgetRecommender 
            stats={stats}
            getBudgetRecommendations={getBudgetRecommendations}
          />
        )}
        {activeTab === 'news' && <NewsUpdate />}
        {activeTab === 'investment' && (
          <InvestmentRecommendation stats={stats} />
        )}
      </main>

      {showAddTransaction && (
        <AddTransactionModal setShowAddTransaction={setShowAddTransaction} />
      )}
    </div>
  );
};

export default FinancialAdvisorApp;