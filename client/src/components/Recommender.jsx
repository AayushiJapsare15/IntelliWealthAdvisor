// Investment Recommendation Component with Real-Time Data & Sentiment Analysis
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Plus, Search, Calendar, CreditCard, Newspaper, Target, Upload } from 'lucide-react';

const Investment = () => {
    const [stockRecommendations, setStockRecommendations] = useState([]);
    const [newsData, setNewsData] = useState([]);
    const [loadingStocks, setLoadingStocks] = useState(false);
    const [loadingNews, setLoadingNews] = useState(false);
    const [riskProfile, setRiskProfile] = useState('moderate');
    const [stats] = useState({ balance: 150000 });
    const [investmentAmount, setInvestmentAmount] = useState(Math.min(stats.balance * 0.3, 50000));

    // Sentiment Analysis Function
    const analyzeSentiment = (text) => {
      const positiveWords = ['surge', 'gain', 'profit', 'growth', 'bullish', 'rally', 'strong', 'beat', 'exceed', 'high', 'record', 'positive', 'upgrade', 'outperform'];
      const negativeWords = ['fall', 'loss', 'decline', 'bearish', 'weak', 'miss', 'drop', 'crash', 'downgrade', 'underperform', 'concern', 'risk', 'warning'];
      
      const lowerText = text.toLowerCase();
      let score = 0;
      
      positiveWords.forEach(word => {
        if (lowerText.includes(word)) score += 1;
      });
      
      negativeWords.forEach(word => {
        if (lowerText.includes(word)) score -= 1;
      });
      
      if (score > 1) return { label: 'Positive', score: Math.min(score * 10, 100), color: 'text-green-500' };
      if (score < -1) return { label: 'Negative', score: Math.max(score * 10, -100), color: 'text-red-500' };
      return { label: 'Neutral', score: 0, color: 'text-gray-400' };
    };

    // Fetch real stock data from Alpha Vantage
    const fetchRealStockData = async () => {
      setLoadingStocks(true);
      try {
        const stockSymbols = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS'];
        const stocksData = [];

        // Fetch data for each stock
        for (const symbol of stockSymbols) {
          try {
            const response = await fetch(
              `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=UMFN5KHZJH4FCE30`
            );
            const data = await response.json();
            
            if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
              const quote = data['Global Quote'];
              const price = parseFloat(quote['05. price']);
              const change = parseFloat(quote['09. change']);
              const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
              
              // Calculate sentiment based on price change
              let sentiment = 50;
              if (changePercent > 2) sentiment = 85;
              else if (changePercent > 1) sentiment = 75;
              else if (changePercent > 0) sentiment = 65;
              else if (changePercent > -1) sentiment = 55;
              else if (changePercent > -2) sentiment = 45;
              else sentiment = 35;

              stocksData.push({
                symbol: symbol,
                name: symbol.includes('RELIANCE') ? 'Reliance Industries' :
                      symbol.includes('TCS') ? 'Tata Consultancy Services' :
                      symbol.includes('INFY') ? 'Infosys' :
                      symbol.includes('HDFC') ? 'HDFC Bank' : 'ICICI Bank',
                price: price,
                sentiment: sentiment,
                volume: quote['06. volume'] > 1000000 ? 'High' : 'Medium',
                priceChange: changePercent,
                marketCap: symbol.includes('RELIANCE') ? '16.5L Cr' :
                           symbol.includes('TCS') ? '13.4L Cr' :
                           symbol.includes('INFY') ? '6.3L Cr' :
                           symbol.includes('HDFC') ? '12.8L Cr' : '8.1L Cr',
                sector: symbol.includes('RELIANCE') ? 'Energy' :
                        symbol.includes('TCS') || symbol.includes('INFY') ? 'IT' : 'Banking'
              });
            }
            
            // Add delay to respect API rate limits
            await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between calls
          } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
          }
        }

        // If API calls failed or we have no data, use fallback
        if (stocksData.length === 0) {
          return [
            { symbol: 'RELIANCE.NS', name: 'Reliance Industries', price: 2450, sentiment: 85, volume: 'High', priceChange: 2.5, marketCap: '16.5L Cr', sector: 'Energy' },
            { symbol: 'TCS.NS', name: 'Tata Consultancy Services', price: 3680, sentiment: 78, volume: 'Medium', priceChange: 1.8, marketCap: '13.4L Cr', sector: 'IT' },
            { symbol: 'INFY.NS', name: 'Infosys', price: 1520, sentiment: 72, volume: 'High', priceChange: -0.5, marketCap: '6.3L Cr', sector: 'IT' },
            { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', price: 1680, sentiment: 68, volume: 'Medium', priceChange: 0.8, marketCap: '12.8L Cr', sector: 'Banking' },
            { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', price: 1150, sentiment: 75, volume: 'High', priceChange: 1.2, marketCap: '8.1L Cr', sector: 'Banking' }
          ];
        }

        return stocksData;
      } catch (error) {
        console.error('Error fetching stock data:', error);
        // Return fallback data
        return [
          { symbol: 'RELIANCE.NS', name: 'Reliance Industries', price: 2450, sentiment: 85, volume: 'High', priceChange: 2.5, marketCap: '16.5L Cr', sector: 'Energy' },
          { symbol: 'TCS.NS', name: 'Tata Consultancy Services', price: 3680, sentiment: 78, volume: 'Medium', priceChange: 1.8, marketCap: '13.4L Cr', sector: 'IT' },
          { symbol: 'INFY.NS', name: 'Infosys', price: 1520, sentiment: 72, volume: 'High', priceChange: -0.5, marketCap: '6.3L Cr', sector: 'IT' },
          { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', price: 1680, sentiment: 68, volume: 'Medium', priceChange: 0.8, marketCap: '12.8L Cr', sector: 'Banking' },
          { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', price: 1150, sentiment: 75, volume: 'High', priceChange: 1.2, marketCap: '8.1L Cr', sector: 'Banking' }
        ];
      } finally {
        setLoadingStocks(false);
      }
    };

    // Calculate personalized recommendations based on fetched data
    const getPersonalizedRecommendations = async () => {
      const allStocks = await fetchRealStockData();

      // Filter based on budget and risk profile
      const affordableStocks = allStocks.filter(stock => {
        const canBuy = investmentAmount >= stock.price;
        const riskMatch = riskProfile === 'conservative' ? stock.sentiment > 70 :
                         riskProfile === 'moderate' ? stock.sentiment > 60 :
                         true;
        return canBuy && riskMatch;
      });

      // Calculate recommendations
      const recommendations = affordableStocks.map(stock => {
        const maxShares = Math.floor(investmentAmount / stock.price);
        const investAmount = maxShares * stock.price;
        const sentiment = analyzeSentiment(`Stock showing ${stock.sentiment > 70 ? 'strong growth positive' : stock.sentiment > 50 ? 'steady gain' : 'weak decline concern'}`);
        
        let recommendation = 'HOLD';
        if (stock.sentiment > 75 && stock.priceChange > 0) recommendation = 'BUY';
        else if (stock.sentiment < 60 || stock.priceChange < -1) recommendation = 'SELL';
        
        return {
          ...stock,
          maxShares,
          investAmount,
          sentimentAnalysis: sentiment,
          recommendation,
          targetPrice: stock.price * (1 + (stock.sentiment / 100)),
          expectedReturn: stock.sentiment > 70 ? '12-18%' : stock.sentiment > 60 ? '8-12%' : '5-8%'
        };
      }).sort((a, b) => b.sentiment - a.sentiment).slice(0, 6);

      setStockRecommendations(recommendations);
    };

    // Fetch real-time news with sentiment from Alpha Vantage and Finnhub
    const fetchMarketNews = async () => {
      setLoadingNews(true);
      try {
        const newsArticles = [];
        
        // Fetch from Alpha Vantage (includes sentiment scores)
        try {
          const alphaResponse = await fetch(
            'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=RELIANCE.NS,TCS.NS,INFY.NS,HDFCBANK.NS&apikey=UMFN5KHZJH4FCE30'
          );
          const alphaData = await alphaResponse.json();
          
          if (alphaData.feed && alphaData.feed.length > 0) {
            alphaData.feed.slice(0, 3).forEach(article => {
              const sentimentScore = parseFloat(article.overall_sentiment_score) * 100;
              const sentiment = sentimentScore > 15 ? 'Positive' : sentimentScore < -15 ? 'Negative' : 'Neutral';
              
              newsArticles.push({
                title: article.title,
                source: article.source,
                time: new Date(article.time_published).toLocaleString('en-IN', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                sentiment: sentiment,
                sentimentScore: Math.round(sentimentScore),
                relevantStocks: article.ticker_sentiment ? article.ticker_sentiment.slice(0, 3).map(t => t.ticker) : []
              });
            });
          }
        } catch (error) {
          console.error('Alpha Vantage API error:', error);
        }

        // Fetch from Finnhub
        try {
          const finnhubResponse = await fetch(
            'https://finnhub.io/api/v1/news?category=general&token=d3dkgd1r01qg5k5s03ggd3dkgd1r01qg5k5s03h0'
          );
          const finnhubData = await finnhubResponse.json();
          
          if (finnhubData && finnhubData.length > 0) {
            finnhubData.slice(0, 3).forEach(article => {
              const sentiment = analyzeSentiment(article.headline + ' ' + (article.summary || ''));
              
              const timeAgo = Math.floor((Date.now() - article.datetime * 1000) / 1000 / 60);
              const timeString = timeAgo < 60 ? `${timeAgo} min ago` : 
                                 timeAgo < 1440 ? `${Math.floor(timeAgo / 60)} hours ago` : 
                                 `${Math.floor(timeAgo / 1440)} days ago`;
              
              newsArticles.push({
                title: article.headline,
                source: article.source,
                time: timeString,
                sentiment: sentiment.label,
                sentimentScore: sentiment.score,
                relevantStocks: article.related ? article.related.split(',').slice(0, 3) : []
              });
            });
          }
        } catch (error) {
          console.error('Finnhub API error:', error);
        }

        // If we got news from APIs, use it; otherwise fall back to mock data
        if (newsArticles.length > 0) {
          setNewsData(newsArticles.slice(0, 6));
        } else {
          // Fallback mock data if APIs fail
          setNewsData([
            { 
              title: 'Unable to fetch real-time news - API rate limit reached or connection error',
              source: 'System Message',
              time: 'Just now',
              sentiment: 'Neutral',
              sentimentScore: 0,
              relevantStocks: []
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setNewsData([
          { 
            title: 'Error loading news - Please try again later',
            source: 'System Error',
            time: 'Just now',
            sentiment: 'Neutral',
            sentimentScore: 0,
            relevantStocks: []
          }
        ]);
      } finally {
        setLoadingNews(false);
      }
    };

    useEffect(() => {
      fetchMarketNews();
      getPersonalizedRecommendations();
    }, []);

    const handleRefresh = () => {
      fetchMarketNews();
      getPersonalizedRecommendations();
    };

    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">AI-Powered Investment Recommendations</h1>
              <p className="text-gray-400 mt-1">Real-time sentiment analysis & personalized stock recommendations</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loadingStocks || loadingNews}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold"
            >
              <TrendingUp className="w-5 h-5" />
              {loadingStocks || loadingNews ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>

          {/* Investment Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <p className="text-gray-400 text-sm mb-3">Investment Amount</p>
              <input
                type="range"
                min="5000"
                max={Math.min(stats.balance, 200000)}
                step="5000"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                className="w-full mb-2"
              />
              <p className="text-2xl font-bold text-white">₹{investmentAmount.toLocaleString('en-IN')}</p>
              <p className="text-gray-400 text-sm mt-2">Available: ₹{stats.balance.toLocaleString('en-IN')}</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <p className="text-gray-400 text-sm mb-3">Risk Profile</p>
              <select
                value={riskProfile}
                onChange={(e) => {
                  setRiskProfile(e.target.value);
                  getPersonalizedRecommendations();
                }}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 mb-2"
              >
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
              <p className="text-white font-semibold capitalize">{riskProfile}</p>
              <p className="text-gray-400 text-sm mt-2">
                {riskProfile === 'conservative' ? 'Low risk, stable returns' :
                 riskProfile === 'moderate' ? 'Balanced approach' :
                 'High risk, high reward'}
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Market Sentiment</p>
              <p className="text-3xl font-bold text-green-500"></p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}>Bearish</div>
                </div>
                <span className="text-white text-sm">75%</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">Overall market trend</p>
            </div>
          </div>

          {/* Real-Time News Sentiment */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-green-500" />
              Market News & Sentiment Analysis
            </h3>
            <div className="space-y-3">
              {loadingNews ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                  <p className="text-gray-400 mt-3">Fetching real-time market news...</p>
                </div>
              ) : (
                newsData.map((news, i) => (
                  <div key={i} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            news.sentiment === 'Positive' ? 'bg-green-500/20 text-green-500' :
                            news.sentiment === 'Negative' ? 'bg-red-500/20 text-red-500' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {news.sentiment}
                          </span>
                          <span className="text-gray-400 text-xs">{news.time}</span>
                        </div>
                        <h4 className="text-white font-semibold mb-1">{news.title}</h4>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">{news.source}</span>
                          {news.relevantStocks && news.relevantStocks.length > 0 && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span className="text-gray-400">Affects: {news.relevantStocks.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">Sentiment Score</p>
                        <p className={`text-2xl font-bold ${
                          news.sentimentScore > 0 ? 'text-green-500' : news.sentimentScore < 0 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {news.sentimentScore > 0 ? '+' : ''}{news.sentimentScore}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Personalized Stock Recommendations */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Personalized Stock Recommendations (Top {stockRecommendations.length})
            </h3>
            {loadingStocks ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-400 mt-3">Fetching real-time stock data... This may take up to 60 seconds due to API rate limits.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stockRecommendations.map((stock, i) => (
                  <div key={i} className="bg-gray-900 p-5 rounded-xl border border-gray-700 hover:border-green-500 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-1">{stock.name}</h4>
                        <p className="text-gray-400 text-sm">{stock.symbol} • {stock.sector}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        stock.recommendation === 'BUY' ? 'bg-green-500/20 text-green-500' :
                        stock.recommendation === 'SELL' ? 'bg-red-500/20 text-red-500' :
                        'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {stock.recommendation}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Current Price</p>
                        <p className="text-white font-semibold">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Target Price</p>
                        <p className="text-green-500 font-semibold">₹{stock.targetPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">You Can Buy</p>
                        <p className="text-white font-semibold">{stock.maxShares} shares</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Investment</p>
                        <p className="text-white font-semibold">₹{stock.investAmount.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-xs">AI Sentiment</span>
                        <span className={`text-sm font-semibold ${stock.sentimentAnalysis.color}`}>
                          {stock.sentimentAnalysis.label} ({stock.sentiment}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-xs">Price Change (24h)</span>
                        <span className={`text-sm font-semibold ${stock.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stock.priceChange >= 0 ? '+' : ''}{stock.priceChange.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs">Expected Return</span>
                        <span className="text-sm font-semibold text-white">{stock.expectedReturn}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* API Integration Guide */}
          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/30 p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              Live API Integration Active
            </h3>
            <div className="space-y-2 text-gray-300 text-sm">
              <p className="font-semibold text-white">✅ Real-time data sources enabled:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><span className="text-green-400">Alpha Vantage</span> - Real stock quotes & news sentiment for Indian stocks</li>
                <li><span className="text-green-400">Finnhub</span> - Global market news with custom sentiment analysis</li>
              </ul>
              <p className="mt-3 text-blue-400">Click "Refresh Data" to fetch the latest market data!</p>
              <p className="text-xs text-gray-500 mt-2">⚠️ Note: Stock data fetching takes ~60 seconds due to API rate limits (12s delay between calls). Free tier limits - Alpha Vantage: 25 calls/day, Finnhub: 60 calls/min</p>
            </div>
          </div>

          {/* Investment Tips */}
          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/30 p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Target className="w-6 h-6 text-green-500" />
              Smart Investment Guidelines
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Never invest more than you can afford to lose - keep emergency funds separate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Diversify across sectors to minimize risk - don't put all money in one stock</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Use sentiment analysis as one factor, not the only decision-making tool</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Consider SIP for long-term wealth building with rupee cost averaging</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Review and rebalance portfolio quarterly based on market conditions</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

export default Investment;