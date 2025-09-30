import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Search, RefreshCw, AlertCircle } from 'lucide-react';

const NewsUpdate = () => {
  const [cryptoData, setCryptoData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState(null);

  // Top cryptocurrencies to track
  const topCrypto = ['bitcoin', 'ethereum', 'binancecoin', 'ripple', 'cardano'];

  // Fetch real cryptocurrency data from CoinGecko
  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${topCrypto.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
      );
      const data = await response.json();
      setCryptoData(data);
    } catch (err) {
      console.error('Crypto fetch error:', err);
      setError('Failed to fetch crypto data');
    }
  };

  // Fetch financial news from NewsAPI
  const fetchNewsData = async () => {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=6&apiKey=2d0f89234eff4afa93fc56a2c17fc067`
      );
      const data = await response.json();
      setNewsData(data.articles || []);
    } catch (err) {
      console.error('News fetch error:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchCryptoData(), fetchNewsData()]);
      setLoading(false);
      setLastUpdate(new Date());
    };

    fetchAllData();

    // Real-time updates every 30 seconds for crypto
    const interval = setInterval(() => {
      fetchCryptoData();
      setLastUpdate(new Date());
    }, 30000);

    // News updates every 5 minutes
    const newsInterval = setInterval(fetchNewsData, 300000);

    return () => {
      clearInterval(interval);
      clearInterval(newsInterval);
    };
  }, []);

  const handleManualRefresh = () => {
    fetchCryptoData();
    fetchNewsData();
    setLastUpdate(new Date());
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    // Check for crypto
    if (searchQuery.toLowerCase().includes('bitcoin') || searchQuery.toLowerCase().includes('btc')) {
      window.open('https://www.coinbase.com/price/bitcoin', '_blank');
    } else {
      // General search
      window.open(`https://finance.yahoo.com/lookup?s=${searchQuery}`, '_blank');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatMarketCap = (cap) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toFixed(2)}`;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1f2937',
      color: 'white',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #10b981, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Crypto & News Dashboard
            </h1>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>
              Live updates • Last refreshed: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search crypto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  padding: '10px 40px 10px 16px',
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  color: 'white',
                  width: '280px',
                  fontSize: '14px'
                }}
              />
              <Search 
                size={20} 
                onClick={handleSearch}
                style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#10b981'
                }} 
              />
            </div>
            
            <button
              onClick={handleManualRefresh}
              style={{
                padding: '10px 16px',
                background: '#10b981',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              border: '4px solid #374151',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <p style={{ marginTop: '16px', color: '#9ca3af' }}>Loading data...</p>
          </div>
        ) : (
          <>
            {/* Crypto Section */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                  Top Cryptocurrencies
                </h2>
                <a 
                  href="https://www.coingecko.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#10b981', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px'
                  }}
                >
                  View All on CoinGecko <ExternalLink size={14} />
                </a>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {cryptoData.map((crypto) => (
                  <div 
                    key={crypto.id}
                    onClick={() => window.open(`https://www.coingecko.com/en/coins/${crypto.id}`, '_blank')}
                    style={{
                      background: '#374151',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #4b5563',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#4b5563';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={crypto.image} alt={crypto.name} style={{ width: '32px', height: '32px' }} />
                        <div>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>
                            {crypto.name}
                          </h3>
                          <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px', textTransform: 'uppercase' }}>
                            {crypto.symbol}
                          </p>
                        </div>
                      </div>
                      <ExternalLink size={16} style={{ color: '#10b981' }} />
                    </div>
                    
                    <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                      {formatPrice(crypto.current_price)}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      color: crypto.price_change_percentage_24h >= 0 ? '#10b981' : '#ef4444'
                    }}>
                      {crypto.price_change_percentage_24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>
                        {crypto.price_change_percentage_24h?.toFixed(2)}% (24h)
                      </span>
                    </div>
                    
                    <div style={{ 
                      marginTop: '12px', 
                      paddingTop: '12px', 
                      borderTop: '1px solid #4b5563',
                      fontSize: '12px',
                      color: '#9ca3af'
                    }}>
                      Market Cap: {formatMarketCap(crypto.market_cap)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* News Section */}
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                  Financial News
                </h2>
                <a 
                  href="https://www.bloomberg.com/markets" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#10b981', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px'
                  }}
                >
                  More on Bloomberg <ExternalLink size={14} />
                </a>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '16px'
              }}>
                {newsData.slice(0, 6).map((article, idx) => (
                  <div 
                    key={idx}
                    onClick={() => window.open(article.url, '_blank')}
                    style={{
                      background: '#374151',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #4b5563',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#4b5563';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {article.urlToImage && (
                      <img 
                        src={article.urlToImage} 
                        alt={article.title}
                        style={{ 
                          width: '100%', 
                          height: '180px', 
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', lineHeight: '1.4' }}>
                        {article.title}
                      </h3>
                      <p style={{ margin: '0 0 12px 0', color: '#9ca3af', fontSize: '14px', lineHeight: '1.6',
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {article.description}
                      </p>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '12px',
                      borderTop: '1px solid #4b5563',
                      fontSize: '12px',
                      color: '#9ca3af'
                    }}>
                      <span>{article.source?.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                        Read More <ExternalLink size={12} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NewsUpdate;
