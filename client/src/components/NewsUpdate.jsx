import React from 'react';
import { Search, Newspaper } from 'lucide-react';

const NewsUpdate = () => {
  const newsData = [
    { id: 1, title: 'RBI Maintains Repo Rate at 6.5%', source: 'Economic Times', time: '2 hours ago', category: 'Economy' },
    { id: 2, title: 'Nifty 50 Hits New All-Time High', source: 'Moneycontrol', time: '5 hours ago', category: 'Markets' },
    { id: 3, title: 'Rupee Strengthens Against Dollar', source: 'Business Standard', time: '1 day ago', category: 'Currency' },
    { id: 4, title: 'Gold Prices Surge Amid Global Uncertainty', source: 'CNBC TV18', time: '1 day ago', category: 'Commodities' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Financial News</h1>
        <p className="text-gray-400 mt-1">Stay updated with the latest financial news and market trends</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search news..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
          />
        </div>
        <select className="bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700">
          <option>All Categories</option>
          <option>Economy</option>
          <option>Markets</option>
          <option>Currency</option>
          <option>Commodities</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {newsData.map((news) => (
          <div key={news.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition-colors cursor-pointer">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs rounded-full">{news.category}</span>
                  <span className="text-gray-400 text-sm">{news.time}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{news.title}</h3>
                <p className="text-gray-400 text-sm">{news.source}</p>
              </div>
              <Newspaper className="w-8 h-8 text-green-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsUpdate;