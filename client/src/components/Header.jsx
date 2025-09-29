import React from 'react';
import { DollarSign } from 'lucide-react';

const Header = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">IntelliWealth</h1>
          </div>
          <nav className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'dashboard' ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'budget' ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-white'
              }`}
            >
              Budget Recommender
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'news' ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-white'
              }`}
            >
              News Update
            </button>
            <button
              onClick={() => setActiveTab('investment')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'investment' ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-white'
              }`}
            >
              Investment
            </button>
            <div className="flex items-center gap-3 ml-4">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">U</span>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;