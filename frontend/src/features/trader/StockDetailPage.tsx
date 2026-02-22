// ============================================
// Unified Stock Detail Page
// Combines stock detail view with full trading desk features
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Activity,
    Clock,
    BookOpen,
    Trophy,
    Wallet,
    Repeat,
    Users,
    BarChart2,
    ChevronDown,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useConfigStore } from '../../store/configStore';
import { CandlestickChart } from '../../components/charts/CandlestickChart';
import { LoginModal } from '../../components/common';
import { MarketIndicesBar } from './components/MarketIndicesBar';
import { NewsTicker } from './components/NewsTicker';
import { PRICE_SCALE } from '../../types/models';
import websocketService from '../../services/websocket';

export const StockDetailPage: React.FC = () => {
    const { symbol } = useParams<{ symbol: string }>();
    const {
        companies,
        indices,
        orderBooks,
        candles,
        activeSymbol,
        setActiveSymbol,
        marketOpen,

        openOrders,
        portfolio,
        placeOrder,
        cancelOrder,
        money,
        lockedMoney,
        marginLocked,
        leaderboard,
        tradeHistory,
    } = useGameStore();
    const { isAuthenticated } = useAuthStore();
    const formatCurrency = useConfigStore(state => state.formatCurrency);

    // Trading state
    const [tradeSide, setTradeSide] = useState<'Buy' | 'Sell'>('Buy');
    const [tradeQty, setTradeQty] = useState('10');
    const [tradePrice, setTradePrice] = useState('');
    const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Limit');
    const [timeInForce, setTimeInForce] = useState<'GTC' | 'IOC'>('GTC');
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [activeBottomTab, setActiveBottomTab] = useState<'transactions' | 'orderbook' | 'portfolio' | 'topTraders' | 'holders'>('orderbook');

    const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState(false);

    // Set active symbol when page loads
    useEffect(() => {
        if (symbol && symbol !== activeSymbol) {
            setActiveSymbol(symbol);
        }
    }, [symbol, activeSymbol, setActiveSymbol]);

    // Request data on mount
    useEffect(() => {
        websocketService.send({ type: 'RequestSync', payload: {} });
    }, []);



    // Get market data
    const company = useMemo(() => companies.find(c => c.symbol === symbol), [companies, symbol]);
    const indexData = symbol ? indices[symbol] : undefined;
    const orderBook = symbol ? orderBooks[symbol] : undefined;
    const symbolCandles = symbol ? (candles[symbol] || []) : [];


    const bestAsk = orderBook?.asks[0]?.price;
    const bestBid = orderBook?.bids[0]?.price;
    const lastCandlePrice = symbolCandles.length > 0 ? symbolCandles[symbolCandles.length - 1].close : null;
    const currentPrice = indexData?.value || bestAsk || bestBid || lastCandlePrice || 0;
    const priceChange = indexData?.change || 0;
    const priceChangePercent = indexData?.changePercent || 0;
    const isPositive = priceChange >= 0;

    // OHLC from last candle
    const lastCandle = symbolCandles.length > 0 ? symbolCandles[symbolCandles.length - 1] : null;

    // Auto-fill price
    useEffect(() => {
        if (currentPrice && !tradePrice) {
            setTradePrice(currentPrice.toFixed(2));
        }
    }, [currentPrice, tradePrice]);

    // Update price when order type changes
    useEffect(() => {
        if (orderType === 'Limit' && currentPrice) {
            setTradePrice(currentPrice.toFixed(2));
        }
    }, [orderType, currentPrice]);

    // Max qty for depth bars
    const maxQty = useMemo(() => Math.max(
        ...(orderBook?.bids.map(b => b.quantity) || [1]),
        ...(orderBook?.asks.map(a => a.quantity) || [1])
    ), [orderBook]);

    // Calculate estimated total
    const estimatedTotal = orderType === 'Market'
        ? (parseInt(tradeQty) || 0) * (tradeSide === 'Buy' ? (bestAsk || currentPrice) : (bestBid || currentPrice))
        : (parseInt(tradeQty) || 0) * (parseFloat(tradePrice) || 0);

    // Filter orders for this symbol
    const symbolOrders = openOrders.filter(o => o.symbol === symbol);



    // Calculate total portfolio value
    const totalPortfolioValue = portfolio.reduce((sum, item) => {
        const orderBook = orderBooks[item.symbol];
        const currentPrice = orderBook?.bids[0]?.price || orderBook?.asks[0]?.price || item.averageBuyPrice;
        return sum + (currentPrice * item.qty);
    }, 0);

    // Handle trade action
    const handleTrade = () => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
            return;
        }
        if (!symbol) return;

        const qty = parseInt(tradeQty);
        if (!qty || qty <= 0) return;

        if (orderType === 'Limit') {
            const price = parseFloat(tradePrice);
            if (!price || price <= 0) return;
        }
        setShowConfirmation(true);
    };

    const confirmOrder = () => {
        if (!symbol) return;
        const qty = parseInt(tradeQty);
        
        if (orderType === 'Limit') {
            const price = parseFloat(tradePrice);
            placeOrder({
                symbol,
                side: tradeSide,
                orderType: 'Limit',
                qty,
                price,
                timeInForce,
            });
        } else {
            placeOrder({
                symbol,
                side: tradeSide,
                orderType: 'Market',
                qty,
                price: 0,
                timeInForce: 'IOC',
            });
        }
        setShowConfirmation(false);
    };

    // Handle symbol switch
    const handleSymbolSwitch = (newSymbol: string) => {
        setActiveSymbol(newSymbol);
        setIsSymbolDropdownOpen(false);
        window.history.replaceState(null, '', `/stock/${newSymbol}`);
    };

    // Get P&L for position
    const getPositionPnL = (item: typeof portfolio[0]) => {
        const itemOrderBook = orderBooks[item.symbol];
        const currentPrice = itemOrderBook?.bids[0]?.price || itemOrderBook?.asks[0]?.price || item.averageBuyPrice;
        const pnl = (currentPrice - item.averageBuyPrice) * item.qty;
        const pnlPercent = item.averageBuyPrice > 0 ? ((currentPrice - item.averageBuyPrice) / item.averageBuyPrice) * 100 : 0;
        return { pnl, pnlPercent, currentPrice };
    };

    if (!symbol) {
        return <div style={{ padding: 'var(--space-4)', color: 'var(--text-primary)' }}>No symbol specified</div>;
    }

    return (
        <div style={{ 
            background: 'var(--bg-primary)', 
            color: 'var(--text-primary)', 
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Live Market Indices Ticker */}
            <MarketIndicesBar />

            {/* Main Layout */}
            <div style={{ 
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 340px',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                maxWidth: '1600px',
                margin: '0 auto',
                width: '100%',
            }}>
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {/* Stock Header */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                    }}>
                        <Link to="/" style={{
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-1)',
                            textDecoration: 'none',
                            fontSize: 'var(--text-sm)',
                        }}>
                            <ArrowLeft size={16} />
                        </Link>

                        {/* Symbol badge */}
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 'var(--text-lg)',
                            color: 'white',
                        }}>
                            {symbol.charAt(0)}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span style={{ fontWeight: 700, fontSize: 'var(--text-xl)' }}>{symbol}</span>
                                {company && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{company.name}</span>
                                )}
                                {company?.sector && (
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '3px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        color: '#818cf8',
                                        fontWeight: 500,
                                    }}>
                                        {company.sector}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '4px' }}>
                                <span style={{ fontWeight: 700, fontSize: 'var(--text-2xl)' }}>
                                    {formatCurrency(currentPrice)}
                                </span>
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
                                    fontWeight: 500,
                                    fontSize: 'var(--text-sm)',
                                }}>
                                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                                </span>
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${marketOpen ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                                    background: marketOpen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: marketOpen ? 'var(--color-success)' : 'var(--color-danger)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                }}>
                                    <Activity size={10} />
                                    {marketOpen ? 'Open' : 'Closed'}
                                </span>
                            </div>
                        </div>

                        {/* Symbol Selector Dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-2) var(--space-3)',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-primary)',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                <BarChart2 size={16} />
                                Switch Stock
                                <ChevronDown size={14} style={{ transform: isSymbolDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>

                            {isSymbolDropdownOpen && (
                                <>
                                    <div 
                                        style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                                        onClick={() => setIsSymbolDropdownOpen(false)}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: 'var(--space-2)',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-secondary)',
                                        borderRadius: 'var(--radius-lg)',
                                        width: '280px',
                                        maxHeight: '400px',
                                        overflow: 'auto',
                                        zIndex: 50,
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                    }}>
                                        <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Select Stock</span>
                                        </div>
                                        {companies.map(c => {
                                            const companyOrderBook = orderBooks[c.symbol];
                                            const price = companyOrderBook?.asks[0]?.price || companyOrderBook?.bids[0]?.price;
                                            const isActive = c.symbol === symbol;
                                            return (
                                                <button
                                                    key={c.symbol}
                                                    onClick={() => handleSymbolSwitch(c.symbol)}
                                                    style={{
                                                        width: '100%',
                                                        padding: 'var(--space-3)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                        border: 'none',
                                                        borderBottom: '1px solid var(--border-secondary)',
                                                        color: 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                        <span style={{ fontWeight: 600 }}>{c.symbol}</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.name}</span>
                                                    </div>
                                                    {price && (
                                                        <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'monospace' }}>
                                                            {formatCurrency(price)}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Chart */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        flex: 1,
                        minHeight: '400px',
                    }}>
                        <div style={{
                            padding: 'var(--space-3) var(--space-4)',
                            borderBottom: '1px solid var(--border-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{symbol}/F.CFA</span>
                                {lastCandle && (
                                    <>
                                        <span>O <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lastCandle.open.toFixed(2)}</span></span>
                                        <span>H <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{lastCandle.high.toFixed(2)}</span></span>
                                        <span>L <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{lastCandle.low.toFixed(2)}</span></span>
                                        <span>C <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{lastCandle.close.toFixed(2)}</span></span>
                                        <span>Vol <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{lastCandle.volume.toLocaleString()}</span></span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div style={{ height: 'calc(100% - 60px)' }}>
                            <CandlestickChart symbol={symbol} height={400} />
                        </div>
                    </div>

                    {/* Bottom Tabs: Order Book / Positions / History */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                    }}>
                        {/* Tab Navigation */}
                        <div style={{
                            display: 'flex',
                            borderBottom: '1px solid var(--border-secondary)',
                        }}>
                            {[
                                { id: 'transactions', label: 'Transactions', icon: Repeat },
                                { id: 'orderbook', label: 'Order Book', icon: BookOpen },
                                { id: 'portfolio', label: 'Portfolio', icon: Wallet },
                                { id: 'topTraders', label: 'Top Traders', icon: Trophy },
                                { id: 'holders', label: 'Holders', icon: Users },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveBottomTab(tab.id as typeof activeBottomTab)}
                                    style={{
                                        flex: 1,
                                        padding: 'var(--space-3) var(--space-4)',
                                        border: 'none',
                                        background: activeBottomTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                        color: activeBottomTab === tab.id ? 'var(--color-primary-light)' : 'var(--text-muted)',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        borderBottom: activeBottomTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    }}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div style={{ padding: 'var(--space-4)', minHeight: '250px' }}>
                            {activeBottomTab === 'orderbook' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    {/* Bids */}
                                    <div>
                                        <div style={{ 
                                            fontSize: '11px', 
                                            fontWeight: 600, 
                                            color: 'var(--color-success)', 
                                            marginBottom: '8px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>Bids</div>
                                        {!orderBook?.bids.length && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>
                                                No bids
                                            </div>
                                        )}
                                        {orderBook?.bids.slice(0, 8).map((level, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '4px 0',
                                                fontSize: '12px',
                                                position: 'relative',
                                            }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: `${(level.quantity / maxQty) * 100}%`,
                                                    background: 'rgba(34, 197, 94, 0.15)',
                                                    borderRadius: '2px',
                                                }} />
                                                <span style={{ color: 'var(--color-success)', position: 'relative', fontWeight: 500 }}>
                                                    {formatCurrency(level.price)}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)', position: 'relative' }}>{level.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Asks */}
                                    <div>
                                        <div style={{ 
                                            fontSize: '11px', 
                                            fontWeight: 600, 
                                            color: 'var(--color-danger)', 
                                            marginBottom: '8px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>Asks</div>
                                        {!orderBook?.asks.length && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>
                                                No asks
                                            </div>
                                        )}
                                        {orderBook?.asks.slice(0, 8).map((level, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '4px 0',
                                                fontSize: '12px',
                                                position: 'relative',
                                            }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: `${(level.quantity / maxQty) * 100}%`,
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    borderRadius: '2px',
                                                }} />
                                                <span style={{ color: 'var(--color-danger)', position: 'relative', fontWeight: 500 }}>
                                                    {formatCurrency(level.price)}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)', position: 'relative' }}>{level.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeBottomTab === 'transactions' && (
                                <div>
                                    {/* Live Transactions Table Header */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '100px 60px 80px 100px 100px 80px',
                                        gap: 'var(--space-2)',
                                        padding: 'var(--space-2) var(--space-3)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderBottom: '1px solid var(--border-secondary)',
                                        marginBottom: 'var(--space-2)',
                                    }}>
                                        <span>Time</span>
                                        <span>Type</span>
                                        <span>Price</span>
                                        <span>Total</span>
                                        <span>Qty</span>
                                        <span style={{ textAlign: 'right' }}>Maker</span>
                                    </div>
                                    {/* Live Trades */}
                                    {tradeHistory.filter(t => t.symbol === symbol).length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                                            No transactions yet for {symbol}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                            {tradeHistory
                                                .filter(t => t.symbol === symbol)
                                                .slice(0, 20)
                                                .map((trade, i) => (
                                                <div
                                                    key={trade.trade_id}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '100px 60px 80px 100px 100px 80px',
                                                        gap: 'var(--space-2)',
                                                        padding: 'var(--space-2) var(--space-3)',
                                                        fontSize: '12px',
                                                        borderBottom: '1px solid var(--border-secondary)',
                                                        background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                    }}
                                                >
                                                    <span style={{ color: 'var(--text-muted)' }}>
                                                        {new Date(trade.timestamp * 1000).toLocaleTimeString()}
                                                    </span>
                                                    <span style={{
                                                        color: trade.side === 'Buy' ? 'var(--color-success)' : 'var(--color-danger)',
                                                        fontWeight: 600,
                                                    }}>
                                                        {trade.side}
                                                    </span>
                                                    <span>{formatCurrency(trade.price / PRICE_SCALE)}</span>
                                                    <span>{formatCurrency((trade.price / PRICE_SCALE) * trade.qty)}</span>
                                                    <span>{trade.qty}</span>
                                                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', textAlign: 'right' }}>
                                                        {trade.counterparty_id?.toString().slice(0, 6) || 'Market'}...
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeBottomTab === 'portfolio' && (
                                <div>
                                    {/* Portfolio Summary */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: 'var(--space-4)',
                                        marginBottom: 'var(--space-4)',
                                        padding: 'var(--space-3)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cash</div>
                                            <div style={{ fontWeight: 600, color: 'var(--color-primary-light)' }}>{formatCurrency(money)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Holdings</div>
                                            <div style={{ fontWeight: 600, color: 'var(--color-warning)' }}>{formatCurrency(totalPortfolioValue)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Net Worth</div>
                                            <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                                                {formatCurrency(money + lockedMoney + marginLocked + totalPortfolioValue)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Positions</div>
                                            <div style={{ fontWeight: 600 }}>{portfolio.length}</div>
                                        </div>
                                    </div>

                                    {/* Holdings List */}
                                    {portfolio.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-4)' }}>
                                            No positions yet
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                            {portfolio.map(item => {
                                                const { pnl, pnlPercent, currentPrice } = getPositionPnL(item);
                                                const isCurrentSymbol = item.symbol === symbol;
                                                return (
                                                    <div
                                                        key={item.symbol}
                                                        onClick={() => handleSymbolSwitch(item.symbol)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: 'var(--space-3)',
                                                            background: isCurrentSymbol ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: isCurrentSymbol ? '1px solid var(--color-primary)' : '1px solid transparent',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {item.symbol}
                                                                {isCurrentSymbol && <span style={{ fontSize: '10px', color: 'var(--color-primary)' }}>●</span>}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                {item.qty} @ {formatCurrency(item.averageBuyPrice)}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 600 }}>{formatCurrency(currentPrice * item.qty)}</div>
                                                            <div style={{ 
                                                                fontSize: '12px', 
                                                                color: pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                                            }}>
                                                                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeBottomTab === 'topTraders' && (
                                <div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '50px 1fr 120px',
                                        gap: 'var(--space-3)',
                                        padding: 'var(--space-2) var(--space-3)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderBottom: '1px solid var(--border-secondary)',
                                        marginBottom: 'var(--space-2)',
                                    }}>
                                        <span>Rank</span>
                                        <span>Trader</span>
                                        <span style={{ textAlign: 'right' }}>Net Worth</span>
                                    </div>
                                    {leaderboard.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                                            No trader data available
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                            {leaderboard.slice(0, 10).map((trader, i) => (
                                                <div
                                                    key={trader.userId || i}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '50px 1fr 120px',
                                                        gap: 'var(--space-3)',
                                                        alignItems: 'center',
                                                        padding: 'var(--space-3)',
                                                        background: 'var(--bg-tertiary)',
                                                        borderRadius: 'var(--radius-md)',
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: 'var(--radius-full)',
                                                        background: i < 3 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'var(--bg-secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 700,
                                                        fontSize: '12px',
                                                        color: i < 3 ? 'white' : 'var(--text-muted)',
                                                    }}>
                                                        {trader.rank}
                                                    </div>
                                                    <div style={{ fontWeight: 500 }}>{trader.name}</div>
                                                    <div style={{ fontWeight: 700, color: 'var(--color-success)', textAlign: 'right' }}>
                                                        {formatCurrency(trader.netWorth)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeBottomTab === 'holders' && (
                                <div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 100px 120px',
                                        gap: 'var(--space-3)',
                                        padding: 'var(--space-2) var(--space-3)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        borderBottom: '1px solid var(--border-secondary)',
                                        marginBottom: 'var(--space-2)',
                                    }}>
                                        <span>Holder</span>
                                        <span>Shares</span>
                                        <span style={{ textAlign: 'right' }}>Value</span>
                                    </div>
                                    {/* Show holders for current symbol */}
                                    {(() => {
                                        const symbolHolders = portfolio
                                            .filter(p => p.symbol === symbol && p.qty > 0)
                                            .sort((a, b) => b.qty - a.qty);
                                        
                                        if (symbolHolders.length === 0) {
                                            return (
                                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                                                    No holders data available for {symbol}
                                                </div>
                                            );
                                        }
                                        
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                                {symbolHolders.map((holder, i) => {
                                                    const holderValue = holder.qty * (holder.currentPrice || currentPrice);
                                                    return (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: '1fr 100px 120px',
                                                                gap: 'var(--space-3)',
                                                                alignItems: 'center',
                                                                padding: 'var(--space-3)',
                                                                background: 'var(--bg-tertiary)',
                                                                borderRadius: 'var(--radius-md)',
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: 500 }}>You</div>
                                                            <div>{holder.qty}</div>
                                                            <div style={{ fontWeight: 600, textAlign: 'right' }}>
                                                                {formatCurrency(holderValue)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {/* Quick Trade Widget */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                    }}>
                        {/* Buy/Sell Tabs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                            <button
                                onClick={() => setTradeSide('Buy')}
                                style={{
                                    padding: 'var(--space-3)',
                                    border: 'none',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    background: tradeSide === 'Buy' ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-tertiary)',
                                    color: tradeSide === 'Buy' ? 'var(--color-success)' : 'var(--text-muted)',
                                    borderBottom: tradeSide === 'Buy' ? '2px solid var(--color-success)' : '2px solid transparent',
                                }}
                            >
                                ↑ Buy
                            </button>
                            <button
                                onClick={() => setTradeSide('Sell')}
                                style={{
                                    padding: 'var(--space-3)',
                                    border: 'none',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    background: tradeSide === 'Sell' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-tertiary)',
                                    color: tradeSide === 'Sell' ? 'var(--color-danger)' : 'var(--text-muted)',
                                    borderBottom: tradeSide === 'Sell' ? '2px solid var(--color-danger)' : '2px solid transparent',
                                }}
                            >
                                ↓ Sell
                            </button>
                        </div>

                        {/* Order Form */}
                        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {/* Order Type Toggle */}
                            <div style={{
                                display: 'flex',
                                gap: 'var(--space-2)',
                                padding: '4px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                            }}>
                                <button
                                    onClick={() => setOrderType('Market')}
                                    style={{
                                        flex: 1,
                                        padding: '6px 12px',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: orderType === 'Market' ? 'var(--bg-secondary)' : 'transparent',
                                        color: orderType === 'Market' ? 'var(--text-primary)' : 'var(--text-muted)',
                                        boxShadow: orderType === 'Market' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                                    }}
                                >
                                    Market
                                </button>
                                <button
                                    onClick={() => setOrderType('Limit')}
                                    style={{
                                        flex: 1,
                                        padding: '6px 12px',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: orderType === 'Limit' ? 'var(--bg-secondary)' : 'transparent',
                                        color: orderType === 'Limit' ? 'var(--text-primary)' : 'var(--text-muted)',
                                        boxShadow: orderType === 'Limit' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none',
                                    }}
                                >
                                    Limit
                                </button>
                            </div>

                            {/* Price input */}
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                    Price (F.CFA)
                                </label>
                                <input
                                    type="number"
                                    value={tradePrice}
                                    onChange={(e) => setTradePrice(e.target.value)}
                                    placeholder="0.00"
                                    disabled={orderType === 'Market'}
                                    style={{
                                        width: '100%',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--input-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '10px 12px',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        opacity: orderType === 'Market' ? 0.5 : 1,
                                    }}
                                />
                            </div>

                            {/* Quantity input */}
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    value={tradeQty}
                                    onChange={(e) => setTradeQty(e.target.value)}
                                    placeholder="10"
                                    min="1"
                                    style={{
                                        width: '100%',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--input-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '10px 12px',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {/* Time in Force */}
                            {orderType === 'Limit' && (
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                        Time in Force
                                    </label>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <button
                                            onClick={() => setTimeInForce('GTC')}
                                            style={{
                                                flex: 1,
                                                padding: '6px 12px',
                                                border: `1px solid ${timeInForce === 'GTC' ? 'var(--color-primary)' : 'var(--border-secondary)'}`,
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: timeInForce === 'GTC' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                color: timeInForce === 'GTC' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                                            }}
                                        >
                                            GTC
                                        </button>
                                        <button
                                            onClick={() => setTimeInForce('IOC')}
                                            style={{
                                                flex: 1,
                                                padding: '6px 12px',
                                                border: `1px solid ${timeInForce === 'IOC' ? 'var(--color-primary)' : 'var(--border-secondary)'}`,
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: timeInForce === 'IOC' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                color: timeInForce === 'IOC' ? 'var(--color-primary-light)' : 'var(--text-muted)',
                                            }}
                                        >
                                            IOC
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Estimated total */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: 'var(--space-2) 0',
                                fontSize: 'var(--text-sm)',
                                borderTop: '1px solid var(--border-secondary)',
                                marginTop: 'var(--space-1)',
                            }}>
                                <span style={{ color: 'var(--text-muted)' }}>Est. Total</span>
                                <span style={{ fontWeight: 600 }}>{formatCurrency(estimatedTotal)}</span>
                            </div>

                            {/* Trade Button */}
                            <button
                                onClick={handleTrade}
                                style={{
                                    width: '100%',
                                    padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    fontSize: 'var(--text-md)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 'var(--space-2)',
                                    transition: 'all 150ms ease',
                                    background: tradeSide === 'Buy'
                                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                        : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: 'white',
                                    boxShadow: tradeSide === 'Buy'
                                        ? '0 4px 12px rgba(34, 197, 94, 0.3)'
                                        : '0 4px 12px rgba(239, 68, 68, 0.3)',
                                }}
                            >
                                {isAuthenticated ? (
                                    <>
                                        {tradeSide === 'Buy' ? 'Buy' : 'Sell'} {symbol}
                                    </>
                                ) : (
                                    'Sign in to Trade'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Open Orders */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: 'var(--space-3) var(--space-4)',
                            borderBottom: '1px solid var(--border-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} /> Open Orders
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {symbolOrders.length} active
                            </span>
                        </div>
                        <div style={{ maxHeight: '200px', overflow: 'auto', padding: 'var(--space-2)' }}>
                            {symbolOrders.length === 0 ? (
                                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                                    No open orders
                                </div>
                            ) : (
                                symbolOrders.map(order => (
                                    <div
                                        key={order.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: 'var(--space-2)',
                                            marginBottom: 'var(--space-1)',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '12px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: 'var(--radius-sm)',
                                                background: order.side === 'Buy' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: order.side === 'Buy' ? 'var(--color-success)' : 'var(--color-danger)',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                            }}>
                                                {order.side}
                                            </span>
                                            <span>{order.qty - order.filledQty} @ {formatCurrency(order.price)}</span>
                                        </div>
                                        <button
                                            onClick={() => cancelOrder(order.symbol, order.id)}
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--border-secondary)',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: 'var(--space-3) var(--space-4)',
                            borderBottom: '1px solid var(--border-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 600,
                            fontSize: 'var(--text-sm)',
                        }}>
                            <Trophy size={14} /> Leaderboard
                        </div>
                        <div style={{ maxHeight: '250px', overflow: 'auto', padding: 'var(--space-2)' }}>
                            {leaderboard.slice(0, 5).map((entry, i) => (
                                <div
                                    key={entry.userId || i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        padding: 'var(--space-2)',
                                        marginBottom: 'var(--space-1)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)',
                                    }}
                                >
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: 'var(--radius-full)',
                                        background: i < 3 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'var(--bg-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        color: i < 3 ? 'white' : 'var(--text-muted)',
                                    }}>
                                        {entry.rank}
                                    </div>
                                    <div style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{entry.name}</div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success)' }}>
                                        {formatCurrency(entry.netWorth)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* News Ticker */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
                <NewsTicker />
            </div>
            <div style={{ height: '48px' }} />

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                redirectTo="/trade"
            />

            {/* Order Confirmation Modal */}
            {showConfirmation && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                }} onClick={() => setShowConfirmation(false)}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-6)',
                        maxWidth: '400px',
                        width: '90%',
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--text-lg)' }}>Confirm Order</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Side</span>
                                <span style={{ fontWeight: 600, color: tradeSide === 'Buy' ? 'var(--color-success)' : 'var(--color-danger)' }}>{tradeSide}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Symbol</span>
                                <span style={{ fontWeight: 600 }}>{symbol}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Type</span>
                                <span style={{ fontWeight: 600 }}>{orderType}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Quantity</span>
                                <span style={{ fontWeight: 600 }}>{tradeQty}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Price</span>
                                <span style={{ fontWeight: 600 }}>
                                    {orderType === 'Market' ? 'Market Price' : formatCurrency(parseFloat(tradePrice) || 0)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-secondary)', paddingTop: 'var(--space-2)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Total</span>
                                <span style={{ fontWeight: 700 }}>{formatCurrency(estimatedTotal)}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                onClick={() => setShowConfirmation(false)}
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-3)',
                                    border: '1px solid var(--border-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmOrder}
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-3)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    background: tradeSide === 'Buy' ? 'var(--color-success)' : 'var(--color-danger)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Confirm {tradeSide}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockDetailPage;
