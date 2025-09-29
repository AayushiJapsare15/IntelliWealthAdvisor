import React from 'react';
import { TrendingUp } from 'lucide-react';

const InvestmentRecommendation = ({ stats }) => {
  const investmentRecommendations = [
    { name: 'Nifty 50 Index Fund', type: 'ETF', risk: 'Medium', return: '10-12%', allocation: '40%' },
    { name: 'Government Securities', type: 'Bonds', risk: 'Low', return: '6-7%', allocation: '30%' },
    { name: 'Large Cap Equity Fund', type: 'Mutual Fund', risk: 'High', return: '15-18%', allocation: '20%' },
    { name: 'Real Estate Investment Trust', type: 'REIT', risk: 'Medium', return: '8-10%', allocation: '10%' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Investment Recommendations</h1>
        <p className="text-gray-400 mt-1">Personalized investment suggestions based on your financial profile</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Risk Profile</p>
          <p className="text-2xl font-bold text-white">Moderate</p>
          <p className="text-gray-400 text-sm mt-2">Balanced approach</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Investment Horizon</p>
          <p className="text-2xl font-bold text-white">5-10 Years</p>
          <p className="text-gray-400 text-sm mt-2">Long-term growth</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Available for Investment</p>
          <p className="text-2xl font-bold text-white">₹{stats.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p className="text-green-500 text-sm mt-2">Current balance</p>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-6">Recommended Portfolio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investmentRecommendations.map((investment, i) => (
            <div key={i} className="bg-gray-900 p-5 rounded-xl border border-gray-700 hover:border-green-500 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-1">{investment.name}</h4>
                  <p className="text-gray-400 text-sm">{investment.type}</p>
                </div>
                <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs rounded-full">{investment.allocation}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Risk Level</p>
                  <p className={`text-sm font-semibold ${
                    investment.risk === 'Low' ? 'text-green-500' : 
                    investment.risk === 'Medium' ? 'text-yellow-500' : 'text-red-500'
                  }`}>{investment.risk}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Expected Return</p>
                  <p className="text-sm font-semibold text-white">{investment.return}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/30 p-6 rounded-xl">
        <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-500" />
          Investment Tips
        </h3>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-1">•</span>
            <span>Diversify your portfolio across different asset classes to minimize risk</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-1">•</span>
            <span>Consider SIP (Systematic Investment Plan) for mutual funds to average out costs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-1">•</span>
            <span>Review and rebalance your portfolio quarterly to maintain target allocations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-1">•</span>
            <span>Keep 3-6 months of expenses in emergency fund before aggressive investing</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default InvestmentRecommendation;