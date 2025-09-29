import React from 'react';
import { Target, TrendingUp } from 'lucide-react';

const BudgetRecommender = ({ stats, getBudgetRecommendations }) => {
  const budgetRecommendations = getBudgetRecommendations();
  const potentialSavings = budgetRecommendations.reduce((sum, item) => sum + (item.current - item.recommended), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Budget Recommender</h1>
        <p className="text-gray-400 mt-1">AI-powered budget recommendations based on your spending patterns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Recommended Budget</p>
          <p className="text-3xl font-bold text-white">₹{(stats.totalExpenses * 0.85).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-green-500 text-sm mt-2">15% reduction target</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Current Spending</p>
          <p className="text-3xl font-bold text-white">₹{stats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-red-500 text-sm mt-2">Total expenses</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Potential Savings</p>
          <p className="text-3xl font-bold text-white">₹{potentialSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-green-500 text-sm mt-2">Follow recommendations</p>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-6">Category-wise Budget Analysis</h3>
        {budgetRecommendations.length > 0 ? (
          <div className="space-y-6">
            {budgetRecommendations.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-green-500" />
                    <span className="text-white font-semibold">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">Recommended: <span className="text-white">₹{item.recommended.toLocaleString('en-IN')}</span></span>
                    <span className="text-gray-400">Current: <span className={
                      item.status === 'good' ? 'text-green-500' : item.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
                    }>₹{item.current.toLocaleString('en-IN')}</span></span>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.status === 'good' ? 'bg-green-500' : item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((item.current / item.recommended) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {item.status === 'good' && 'You\'re doing great! Stay within this budget.'}
                  {item.status === 'warning' && 'Slightly over budget. Consider reducing spending.'}
                  {item.status === 'danger' && 'Significantly over budget! Review your expenses.'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">No budget data available</div>
        )}
      </div>

      <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/30 p-6 rounded-xl">
        <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-500" />
          Smart Savings Tips
        </h3>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-1">•</span>
            <span>Review your top spending categories and identify areas to cut back</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-1">•</span>
            <span>Set up automatic savings transfers of ₹{(stats.totalIncome * 0.2).toLocaleString('en-IN', { maximumFractionDigits: 0 })} per month (20% rule)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-1">•</span>
            <span>Track daily expenses to stay aware of spending patterns</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BudgetRecommender;