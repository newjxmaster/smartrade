// ============================================
// DEX-Style Companies List Page with Portfolio
// Public landing page showing all stocks + user portfolio
// ============================================

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Zap,
  Activity,
  Clock,
  RefreshCw,
  Wallet,
  ListOrdered,
  Package,
  History,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useConfigStore } from '../../store/configStore';
import { LoginModal } from '../../components/common';
import { NewsTicker } from '../trader/components/NewsTicker';
import websocketService from '../../services/websocket';

// Filter types
type FilterType = 'all' | 'new' | 'trending' | 'gainers' | 'losers';
type MainTab = 'companies' | 'orders' | 'portfolio';
type PortfolioTab = 'holdings' | 'activity';

// Extended company interface for display
type DisplayCompany = {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  totalShares: number;
};

export const CompaniesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    companies, 
    marketOpen, 
    indices, 
    setActiveSymbol,
    portfolio,
    tradeHistory,
    openOrders,
    money,
    lockedMoney,
    requestTradeHistory 
  } = useGameStore();
  const { isAuthenticated, user } = useAuthStore();
  const { currency } = useConfigStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingTradeSymbol, setPendingTradeSymbol] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('companies');
  const [activePortfolioTab, setActivePortfolioTab] = useState<PortfolioTab>('holdings');

  // Request companies list and trade history on mount
  useEffect(() => {
    websocketService.send({ type: 'RequestSync', payload: {} });
    if (isAuthenticated) {
      requestTradeHistory(0);
    }
  }, [isAuthenticated, requestTradeHistory]);

  // After login, navigate to trade if there was a pending symbol
  useEffect(() => {
    if (isAuthenticated && pendingTradeSymbol) {
      setActiveSymbol(pendingTradeSymbol);
      setPendingTradeSymbol(null);
      navigate('/trade');
    }
  }, [isAuthenticated, pendingTradeSymbol, navigate, setActiveSymbol]);

  // Generate display data from companies
  const displayCompanies: DisplayCompany[] = useMemo(() => {
    if (!companies || companies.length === 0) return [];

    return companies.map((company) => {
      const indexData = indices[company.symbol];
      const basePrice = 100000;
      const currentPrice = indexData?.value || (basePrice + (Math.random() * 50000 - 25000));
      const previousPrice = basePrice;
      const priceChange = currentPrice - previousPrice;
      const priceChangePercent = (priceChange / previousPrice) * 100;

      return {
        id: company.id,
        symbol: company.symbol,
        name: company.name,
        sector: company.sector || 'Other',
        currentPrice,
        priceChange,
        priceChangePercent,
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        totalShares: 1000000,
      };
    });
  }, [companies, indices]);

  // Calculate portfolio stats
  const portfolioStats = useMemo(() => {
    if (!portfolio || portfolio.length === 0) {
      return { invested: 0, remaining: 0, sold: 0, change: 0, changePercent: 0 };
    }

    // Calculate based on portfolio items (values already scaled from store)
    let invested = 0;
    let remaining = 0;
    let totalPnl = 0;
    let totalCost = 0;

    portfolio.forEach(item => {
      const costBasis = (item.costBasis || 0);
      const marketValue = (item.marketValue || 0);
      const unrealizedPnl = (item.unrealizedPnl || 0);
      
      invested += costBasis;
      remaining += marketValue;
      totalPnl += unrealizedPnl;
      totalCost += costBasis;
    });

    // Calculate sold from trade history - total_value is in raw format from API
    const sold = tradeHistory
      .filter(t => t.side === 'Sell')
      .reduce((sum, t) => sum + (t.total_value / 100), 0);

    const changePercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return { invested, remaining, sold, change: totalPnl, changePercent };
  }, [portfolio, tradeHistory]);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    websocketService.send({ type: 'RequestSync', payload: {} });
    if (isAuthenticated) {
      requestTradeHistory(0);
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Format currency - use config decimals
  const formatCurrency = (value: number): string => {
    const decimals = currency?.decimals ?? 0;
    const scaled = value / 100;
    if (scaled >= 1_000_000_000) return `${(scaled / 1_000_000_000).toFixed(decimals)}B`;
    if (scaled >= 1_000_000) return `${(scaled / 1_000_000).toFixed(decimals)}M`;
    if (scaled >= 1_000) return `${(scaled / 1_000).toFixed(decimals)}K`;
    return Math.floor(scaled).toLocaleString('en-US');
  };

  // Format full currency (for already scaled values)
  const formatFullCurrency = (value: number): string => {
    return `${Math.floor(value).toLocaleString('en-US')} F.CFA`;
  };

  // Format raw price (needs division by 100)
  const formatRawPrice = (price: number): string => {
    return `${Math.floor(price / 100).toLocaleString('en-US')} F.CFA`;
  };

  // Format price (for already scaled values like portfolio)
  const formatPrice = (price: number): string => {
    return `${Math.floor(price).toLocaleString('en-US')} F.CFA`;
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get company color
  const getCompanyStyle = (symbol: string) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-yellow-500 to-orange-500',
      'from-indigo-500 to-purple-500',
    ];
    const index = symbol.charCodeAt(0) % colors.length;
    return { gradient: colors[index], initial: symbol.charAt(0) };
  };

  // Handle company click - navigate to stock detail page
  const handleCompanyClick = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  // Filter companies
  const filteredCompanies = useMemo(() => {
    let result = [...displayCompanies];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.symbol.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query)
      );
    }

    switch (activeFilter) {
      case 'new': result = result.filter(c => c.id > 5); break;
      case 'trending': result = result.filter(c => c.volume > 5000000); break;
      case 'gainers': result = result.filter(c => c.priceChange > 0); break;
      case 'losers': result = result.filter(c => c.priceChange < 0); break;
    }

    return result;
  }, [displayCompanies, searchQuery, activeFilter]);

  // Calculate total stats
  const totalMarketCap = useMemo(() => {
    return displayCompanies.reduce((sum, c) => sum + (c.currentPrice * c.totalShares), 0);
  }, [displayCompanies]);

  const totalVolume = useMemo(() => {
    return displayCompanies.reduce((sum, c) => sum + c.volume, 0);
  }, [displayCompanies]);

  // User's open orders
  const userOpenOrders = useMemo(() => {
    return openOrders.filter(o => o.status === 'Open' || o.status === 'Partial');
  }, [openOrders]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Filters & Search Bar */}
      <div style={{ borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'var(--space-3) var(--space-4)' }}>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '0 1 300px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '8px 12px 8px 40px',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Filters - only show when on companies tab, otherwise switch back */}
            {[
              { id: 'all', label: 'All', icon: Activity },
              { id: 'new', label: 'New', icon: Clock },
              { id: 'trending', label: 'Trending', icon: Zap },
              { id: 'gainers', label: 'Gainers', icon: TrendingUp },
              { id: 'losers', label: 'Losers', icon: TrendingDown },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  setActiveFilter(filter.id as FilterType);
                  if (activeMainTab !== 'companies') {
                    setActiveMainTab('companies');
                  }
                }}
                className="flex items-center gap-1"
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  border: activeMainTab === 'companies' && activeFilter === filter.id ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                  background: activeMainTab === 'companies' && activeFilter === filter.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: activeMainTab === 'companies' && activeFilter === filter.id ? 'var(--color-primary-light)' : 'var(--text-muted)',
                  opacity: activeMainTab === 'companies' ? 1 : 0.6,
                }}
              >
                <filter.icon size={14} />
                {filter.label}
              </button>
            ))}

            <div style={{ width: '1px', height: '24px', background: 'var(--border-secondary)', margin: '0 4px' }} />

            {/* Live indicator */}
            <div className="flex items-center gap-1" style={{
              padding: '6px 12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <span style={{ position: 'relative', display: 'inline-flex', height: '8px', width: '8px' }}>
                <span style={{
                  animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                  position: 'absolute',
                  display: 'inline-flex',
                  height: '100%',
                  width: '100%',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-success-light)',
                  opacity: 0.75,
                }} />
                <span style={{
                  position: 'relative',
                  display: 'inline-flex',
                  borderRadius: '9999px',
                  height: '8px',
                  width: '8px',
                  backgroundColor: 'var(--color-success)',
                }} />
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>Live</span>
            </div>

            {/* Market status */}
            <div className="flex items-center gap-1" style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${marketOpen ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              background: marketOpen ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: marketOpen ? 'var(--color-success)' : 'var(--color-danger)',
            }}>
              <Activity size={14} />
              <span style={{ fontSize: 'var(--text-sm)' }}>{marketOpen ? 'Open' : 'Closed'}</span>
            </div>

            <div style={{ flex: 1 }} />

            {/* Main Tabs - Only show when authenticated */}
            {isAuthenticated && (
              <>
                <button
                  onClick={() => setActiveMainTab('orders')}
                  className="flex items-center gap-1"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    border: activeMainTab === 'orders' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-secondary)',
                    background: activeMainTab === 'orders' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: activeMainTab === 'orders' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                  }}
                >
                  <ListOrdered size={12} />
                  Orders
                  {userOpenOrders.length > 0 && (
                    <span style={{
                      marginLeft: '4px',
                      padding: '1px 5px',
                      background: 'var(--color-primary)',
                      borderRadius: '8px',
                      fontSize: '9px',
                      color: 'white',
                    }}>
                      {userOpenOrders.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveMainTab('portfolio')}
                  className="flex items-center gap-1"
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    border: activeMainTab === 'portfolio' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-secondary)',
                    background: activeMainTab === 'portfolio' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: activeMainTab === 'portfolio' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                  }}
                >
                  <Wallet size={12} />
                  Portfolio
                </button>
              </>
            )}

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                padding: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                transition: 'border-color 150ms ease',
              }}
            >
              <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: 'var(--space-4)' }}>
        {/* Show different content based on active tab */}
        {activeMainTab === 'companies' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Companies</p>
                <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{companies.length}</p>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>24h Volume</p>
                <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{formatCurrency(totalVolume)} F.CFA</p>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Market Cap</p>
                <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{formatCurrency(totalMarketCap)} F.CFA</p>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Filtered</p>
                <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{filteredCompanies.length}</p>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {/* Table Header */}
              <div className="grid" style={{
                gridTemplateColumns: '3fr 2fr 2fr 2fr 2fr 1fr',
                gap: '8px',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-tertiary)',
                borderBottom: '1px solid var(--border-secondary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--text-muted)',
              }}>
                <div>Company</div>
                <div>Price</div>
                <div>Market Cap</div>
                <div>Volume</div>
                <div>Change</div>
                <div>Action</div>
              </div>

              {/* Rows */}
              <div>
                {filteredCompanies.map((company) => {
                  const style = getCompanyStyle(company.symbol);
                  const marketCap = company.currentPrice * company.totalShares;
                  const isPositive = company.priceChange >= 0;

                  return (
                    <div
                      key={company.symbol}
                      onClick={() => handleCompanyClick(company.symbol)}
                      className="grid items-center"
                      style={{
                        gridTemplateColumns: '3fr 2fr 2fr 2fr 2fr 1fr',
                        gap: '8px',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border-secondary)',
                        cursor: 'pointer',
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`bg-gradient-to-br ${style.gradient}`} style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-lg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 700,
                          color: 'white',
                          flexShrink: 0,
                        }}>
                          {style.initial}
                        </div>
                        <div>
                          <span style={{ fontWeight: 500 }}>{company.symbol}</span>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>{company.name}</p>
                        </div>
                      </div>

                      <div style={{ fontWeight: 500 }}>
                        {formatRawPrice(company.currentPrice)}
                      </div>

                      <div style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(marketCap)} F.CFA
                      </div>

                      <div style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(company.volume)} F.CFA
                      </div>

                      <div className="flex items-center gap-1" style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span style={{ fontWeight: 500 }}>{isPositive ? '+' : ''}{company.priceChangePercent.toFixed(2)}%</span>
                      </div>

                      <div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCompanyClick(company.symbol); }}
                          style={{
                            padding: '4px 12px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                            opacity: 0.8,
                            transition: 'opacity 150ms ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                        >
                          Trade
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty */}
              {filteredCompanies.length === 0 && (
                <div style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No companies found.</p>
                  <button
                    onClick={handleRefresh}
                    style={{
                      marginTop: 'var(--space-2)',
                      color: 'var(--color-primary)',
                      fontSize: 'var(--text-sm)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Click to refresh
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ORDERS Tab Content */}
        {activeMainTab === 'orders' && isAuthenticated && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-secondary)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListOrdered size={20} />
                Open Orders
              </h2>
            </div>
            
            {userOpenOrders.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No open orders</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: '4px' }}>Your active orders will appear here</p>
              </div>
            ) : (
              <div>
                {/* Orders Header */}
                <div className="grid" style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
                  gap: '8px',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-secondary)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                }}>
                  <div>Symbol</div>
                  <div>Type</div>
                  <div>Side</div>
                  <div>Price</div>
                  <div>Quantity</div>
                  <div>Filled</div>
                  <div>Status</div>
                </div>
                
                {/* Orders Rows */}
                {userOpenOrders.map((order) => (
                  <div
                    key={order.id}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
                      gap: '8px',
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: '1px solid var(--border-secondary)',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{order.symbol}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{order.orderType}</div>
                    <div style={{ 
                      color: order.side === 'Buy' ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 500 
                    }}>
                      {order.side}
                    </div>
                    <div>{formatPrice(order.price)}</div>
                    <div>{order.qty}</div>
                    <div>{order.filledQty} / {order.qty}</div>
                    <div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)',
                        background: order.status === 'Open' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: order.status === 'Open' ? 'var(--color-primary-light)' : '#f59e0b',
                      }}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PORTFOLIO Tab Content */}
        {activeMainTab === 'portfolio' && isAuthenticated && (
          <>
            {/* Portfolio Summary Stats */}
            <div style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-secondary)', 
              borderRadius: 'var(--radius-lg)', 
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: 'var(--space-4)',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--border-secondary)'
              }}>
                <Wallet size={20} />
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                  {user?.name || 'My Portfolio'}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {formatFullCurrency((money + lockedMoney) / 100 + portfolioStats.remaining)}
                </span>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invested</p>
                  <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginTop: '4px' }}>
                    {formatFullCurrency(portfolioStats.invested)}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remaining</p>
                  <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginTop: '4px' }}>
                    {formatFullCurrency(portfolioStats.remaining)}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sold</p>
                  <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginTop: '4px' }}>
                    {formatFullCurrency(portfolioStats.sold)}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Change in P&L</p>
                  <p style={{ 
                    fontSize: 'var(--text-lg)', 
                    fontWeight: 600, 
                    marginTop: '4px',
                    color: portfolioStats.change >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {portfolioStats.change >= 0 ? '+' : ''}{formatFullCurrency(portfolioStats.change)}
                    <span style={{ fontSize: 'var(--text-xs)', marginLeft: '4px' }}>
                      ({portfolioStats.changePercent >= 0 ? '+' : ''}{portfolioStats.changePercent.toFixed(2)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Portfolio Tabs */}
            <div style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-secondary)', 
              borderRadius: 'var(--radius-lg)', 
              overflow: 'hidden' 
            }}>
              {/* Portfolio Tab Headers */}
              <div style={{ 
                display: 'flex', 
                borderBottom: '1px solid var(--border-secondary)',
                background: 'var(--bg-tertiary)'
              }}>
                <button
                  onClick={() => setActivePortfolioTab('holdings')}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: activePortfolioTab === 'holdings' ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderBottom: activePortfolioTab === 'holdings' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Package size={16} />
                  My Holdings
                  {portfolio.length > 0 && (
                    <span style={{
                      padding: '2px 6px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                    }}>
                      {portfolio.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActivePortfolioTab('activity')}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: activePortfolioTab === 'activity' ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderBottom: activePortfolioTab === 'activity' ? '2px solid var(--color-primary)' : '2px solid transparent',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <History size={16} />
                  Activity
                  {tradeHistory.length > 0 && (
                    <span style={{
                      padding: '2px 6px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                    }}>
                      {tradeHistory.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Holdings Tab */}
              {activePortfolioTab === 'holdings' && (
                <div>
                  {portfolio.length === 0 ? (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                      <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No holdings yet</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: '4px' }}>Start trading to build your portfolio</p>
                    </div>
                  ) : (
                    <>
                      {/* Holdings Header */}
                      <div className="grid" style={{
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                        gap: '8px',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border-secondary)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
                        color: 'var(--text-muted)',
                      }}>
                        <div>Symbol</div>
                        <div>Qty</div>
                        <div>Avg Price</div>
                        <div>Current</div>
                        <div>Value</div>
                        <div>P&L</div>
                      </div>
                      
                      {/* Holdings Rows */}
                      {portfolio.map((item) => {
                        const isPositive = (item.unrealizedPnl || 0) >= 0;
                        const style = getCompanyStyle(item.symbol);
                        
                        return (
                          <div
                            key={item.symbol}
                            onClick={() => handleCompanyClick(item.symbol)}
                            className="grid items-center"
                            style={{
                              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                              gap: '8px',
                              padding: 'var(--space-3) var(--space-4)',
                              borderBottom: '1px solid var(--border-secondary)',
                              cursor: 'pointer',
                              transition: 'background 150ms ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`bg-gradient-to-br ${style.gradient}`} style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'white',
                                flexShrink: 0,
                              }}>
                                {style.initial}
                              </div>
                              <span style={{ fontWeight: 500 }}>{item.symbol}</span>
                            </div>
                            <div>{item.qty}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>{formatPrice(item.averageBuyPrice || 0)}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>{formatPrice(item.currentPrice || 0)}</div>
                            <div style={{ fontWeight: 500 }}>{formatFullCurrency(item.marketValue || 0)}</div>
                            <div style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              {isPositive ? '+' : ''}{formatFullCurrency(item.unrealizedPnl || 0)}
                              <span style={{ fontSize: '10px', marginLeft: '4px' }}>
                                ({isPositive ? '+' : ''}{(item.unrealizedPnlPercent || 0).toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activePortfolioTab === 'activity' && (
                <div>
                  {tradeHistory.length === 0 ? (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                      <History size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No activity yet</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: '4px' }}>Your trade history will appear here</p>
                    </div>
                  ) : (
                    <>
                      {/* Activity Header */}
                      <div className="grid" style={{
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr',
                        gap: '8px',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border-secondary)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
                        color: 'var(--text-muted)',
                      }}>
                        <div>Symbol</div>
                        <div>Side</div>
                        <div>Qty</div>
                        <div>Price</div>
                        <div>Total</div>
                        <div>Time</div>
                      </div>
                      
                      {/* Activity Rows */}
                      {tradeHistory.map((trade) => {
                        const isBuy = trade.side === 'Buy';
                        const style = getCompanyStyle(trade.symbol);
                        
                        return (
                          <div
                            key={trade.trade_id}
                            className="grid items-center"
                            style={{
                              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 2fr',
                              gap: '8px',
                              padding: 'var(--space-3) var(--space-4)',
                              borderBottom: '1px solid var(--border-secondary)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`bg-gradient-to-br ${style.gradient}`} style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                color: 'white',
                                flexShrink: 0,
                              }}>
                                {style.initial}
                              </div>
                              <span style={{ fontWeight: 500 }}>{trade.symbol}</span>
                            </div>
                            <div>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 500,
                                background: isBuy ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: isBuy ? 'var(--color-success)' : 'var(--color-danger)',
                              }}>
                                {isBuy ? 'Buy' : 'Sell'}
                              </span>
                            </div>
                            <div>{trade.qty}</div>
                            <div>{formatRawPrice(trade.price)}</div>
                            <div style={{ fontWeight: 500 }}>{formatFullCurrency(trade.total_value / 100)}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                              {formatDate(trade.timestamp)}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* News Ticker */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
        <NewsTicker />
      </div>
      <div style={{ height: '48px' }} />

      {/* Login Modal - shown when unauth user tries to trade */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => { setShowLoginModal(false); setPendingTradeSymbol(null); }}
        redirectTo="/trade"
      />
    </div>
  );
};

export default CompaniesListPage;
