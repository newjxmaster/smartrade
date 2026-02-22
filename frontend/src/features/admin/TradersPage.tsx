// ============================================
// Admin Traders Management Page
// ============================================

import React, { useState, useMemo } from 'react';
import {
    Users,
    Search,
    Ban,
    CheckCircle,
    MessageCircleOff,
    DollarSign,
    TrendingUp,
    TrendingDown,
    ChevronUp,
    ChevronDown,
    Eye,
    Briefcase,
    History,
    X,
    Package
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useAdminStore } from '../../store/adminStore';
import { useConfigStore } from '../../store/configStore';
import websocketService from '../../services/websocket';
import { Button, Badge, Modal } from '../../components/common';


// Sort icon component - defined outside to avoid recreation during render
interface TraderSortIconProps {
    field: 'rank' | 'name' | 'netWorth';
    sortField: 'rank' | 'name' | 'netWorth';
    sortOrder: 'asc' | 'desc';
}

const TraderSortIcon: React.FC<TraderSortIconProps> = ({ field, sortField, sortOrder }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
};

interface TraderRowProps {
    entry: {
        rank: number;
        name: string;
        netWorth: number;
    };
    avgNetWorth: number;
    isMuted: boolean;
    isBanned: boolean;
    onBan: (name: string) => void;
    onUnban: (name: string) => void;
    onToggleChat: (name: string, enabled: boolean) => void;
    onViewDetails: (entry: { rank: number; name: string; netWorth: number }) => void;
}

const TraderRow: React.FC<TraderRowProps> = ({ entry, avgNetWorth, isMuted, isBanned, onBan, onUnban, onToggleChat, onViewDetails }) => {
    const [showActions, setShowActions] = useState(false);
    const formatCurrency = useConfigStore(state => state.formatCurrency);

    // Calculate performance relative to average
    const performancePercent = avgNetWorth > 0
        ? ((entry.netWorth - avgNetWorth) / avgNetWorth) * 100
        : 0;

    return (
        <tr
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            style={{ opacity: isBanned ? 0.5 : 1, cursor: 'pointer' }}
            onClick={() => onViewDetails(entry)}
        >
            <td>
                <div className="flex items-center gap-2">
                    <span
                        className="font-bold"
                        style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: entry.rank <= 3 ? 'var(--color-warning)' : 'var(--bg-tertiary)',
                            color: entry.rank <= 3 ? 'black' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-xs)'
                        }}
                    >
                        {entry.rank}
                    </span>
                </div>
            </td>
            <td>
                <div className="flex items-center gap-2">
                    <div
                        className="font-bold"
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isBanned
                                ? 'var(--color-danger)'
                                : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--text-sm)'
                        }}
                    >
                        {isBanned ? <Ban size={14} /> : entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span className="font-medium">{entry.name}</span>
                        {isMuted && (
                            <div className="flex items-center gap-1 text-xs text-warning">
                                <MessageCircleOff size={10} />
                                Muted
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td>
                <span className="font-mono font-bold text-success">
                    {formatCurrency(entry.netWorth)}
                </span>
            </td>
            <td>
                <div className={`flex items-center gap-1 ${performancePercent >= 0 ? 'text-buy' : 'text-sell'}`}>
                    {performancePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span className="font-mono">{performancePercent >= 0 ? '+' : ''}{performancePercent.toFixed(1)}%</span>
                </div>
            </td>
            <td>
                {isBanned ? (
                    <Badge variant="danger">Banned</Badge>
                ) : (
                    <Badge variant="success">Active</Badge>
                )}
            </td>
            <td onClick={(e) => e.stopPropagation()}>
                <div className={`flex gap-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(entry)}
                        title="View Details"
                    >
                        <Eye size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleChat(entry.name, isMuted)}
                        title={isMuted ? 'Unmute Chat' : 'Mute Chat'}
                        style={{ color: isMuted ? 'var(--color-warning)' : undefined }}
                    >
                        <MessageCircleOff size={14} />
                    </Button>
                    {isBanned ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUnban(entry.name)}
                            title="Unban Trader"
                            style={{ color: 'var(--color-success)' }}
                        >
                            <CheckCircle size={14} />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onBan(entry.name)}
                            title="Ban Trader"
                            style={{ color: 'var(--color-danger)' }}
                        >
                            <Ban size={14} />
                        </Button>
                    )}
                </div>
            </td>
        </tr>
    );
};

// User Detail Modal Component
interface UserDetailModalProps {
    user: { rank: number; name: string; netWorth: number } | null;
    isOpen: boolean;
    onClose: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, isOpen, onClose }) => {
    const { trades, fetchTrades } = useAdminStore();
    const { companies, indices } = useGameStore();
    const formatCurrency = useConfigStore(state => state.formatCurrency);
    const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions'>('portfolio');
    const [userPortfolio, setUserPortfolio] = useState<Array<{
        symbol: string;
        qty: number;
        avgPrice: number;
        currentPrice: number;
        value: number;
        pnl: number;
        pnlPercent: number;
    }>>([]);

    // Mock portfolio data - in production this would come from backend
    React.useEffect(() => {
        if (user) {
            // Generate mock portfolio based on user data
            // In production, fetch actual portfolio from backend
            const mockPortfolio = companies.slice(0, 5).map((company) => {
                const indexData = indices[company.symbol];
                const currentPrice = indexData?.value || 100000;
                const avgPrice = currentPrice * (0.8 + Math.random() * 0.4); // Random avg price
                const qty = Math.floor(Math.random() * 100) + 10;
                const value = (currentPrice * qty) / 100;
                const cost = (avgPrice * qty) / 100;
                const pnl = value - cost;
                const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;

                return {
                    symbol: company.symbol,
                    qty,
                    avgPrice: avgPrice / 100,
                    currentPrice: currentPrice / 100,
                    value,
                    pnl,
                    pnlPercent,
                };
            }).filter(p => p.qty > 0);

            setUserPortfolio(mockPortfolio);

            // Fetch user transactions
            fetchTrades(0, undefined, undefined);
        }
    }, [user, companies, indices, fetchTrades]);

    // Filter trades for this user (mock - in production would filter by user_id)
    const userTrades = trades.slice(0, 10);

    if (!isOpen || !user) return null;

    const totalPortfolioValue = userPortfolio.reduce((sum, p) => sum + p.value, 0);
    const totalPnl = userPortfolio.reduce((sum, p) => sum + p.pnl, 0);

    return (
        <Modal title={`User Details: ${user.name}`} onClose={onClose} isOpen={isOpen} size="xl">
            <div style={{ minWidth: '700px', maxWidth: '90vw' }}>
                {/* User Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div className="text-muted text-sm mb-1">Net Worth</div>
                        <div className="text-xl font-bold text-success">{formatCurrency(user.netWorth)}</div>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div className="text-muted text-sm mb-1">Portfolio Value</div>
                        <div className="text-xl font-bold text-primary">{formatCurrency(totalPortfolioValue)}</div>
                    </div>
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div className="text-muted text-sm mb-1">Total P&L</div>
                        <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 p-1 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <button
                        onClick={() => setActiveTab('portfolio')}
                        className="flex items-center gap-2 px-4 py-2 rounded-md transition-all"
                        style={{
                            background: activeTab === 'portfolio' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'portfolio' ? 'white' : 'var(--text-muted)',
                            fontWeight: activeTab === 'portfolio' ? 600 : 400,
                            flex: 1,
                            justifyContent: 'center',
                        }}
                    >
                        <Briefcase size={18} />
                        <span>Portfolio</span>
                        <span style={{
                            background: activeTab === 'portfolio' ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            marginLeft: '4px',
                        }}>
                            {userPortfolio.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className="flex items-center gap-2 px-4 py-2 rounded-md transition-all"
                        style={{
                            background: activeTab === 'transactions' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'transactions' ? 'white' : 'var(--text-muted)',
                            fontWeight: activeTab === 'transactions' ? 600 : 400,
                            flex: 1,
                            justifyContent: 'center',
                        }}
                    >
                        <History size={18} />
                        <span>Transactions</span>
                        <span style={{
                            background: activeTab === 'transactions' ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            marginLeft: '4px',
                        }}>
                            {userTrades.length}
                        </span>
                    </button>
                </div>

                {/* Portfolio Tab */}
                {activeTab === 'portfolio' && (
                    <div>
                        {userPortfolio.length === 0 ? (
                            <div className="text-center py-8 text-muted">
                                <Package size={48} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                                <p>No portfolio positions</p>
                            </div>
                        ) : (
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th className="text-right">Qty</th>
                                        <th className="text-right">Avg Price</th>
                                        <th className="text-right">Current</th>
                                        <th className="text-right">Value</th>
                                        <th className="text-right">P&L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userPortfolio.map((pos) => (
                                        <tr key={pos.symbol}>
                                            <td className="font-medium">{pos.symbol}</td>
                                            <td className="text-right font-mono">{pos.qty}</td>
                                            <td className="text-right font-mono">{formatCurrency(pos.avgPrice)}</td>
                                            <td className="text-right font-mono">{formatCurrency(pos.currentPrice)}</td>
                                            <td className="text-right font-mono font-bold">{formatCurrency(pos.value)}</td>
                                            <td className={`text-right font-mono ${pos.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {pos.pnl >= 0 ? '+' : ''}{formatCurrency(pos.pnl)}
                                                <span className="text-xs ml-1">({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%)</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                    <div>
                        {userTrades.length === 0 ? (
                            <div className="text-center py-8 text-muted">
                                <History size={48} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                                <p>No transaction history</p>
                            </div>
                        ) : (
                            <table className="table w-full">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Symbol</th>
                                        <th>Side</th>
                                        <th className="text-right">Qty</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userTrades.map((trade, tradeIdx) => (
                                        <tr key={tradeIdx}>
                                            <td className="text-muted text-sm">
                                                {new Date(trade.timestamp * 1000).toLocaleString()}
                                            </td>
                                            <td className="font-medium">{trade.symbol}</td>
                                            <td>
                                                <Badge variant={trade.buyer_name === user.name ? 'success' : 'danger'}>
                                                    {trade.buyer_name === user.name ? 'Buy' : 'Sell'}
                                                </Badge>
                                            </td>
                                            <td className="text-right font-mono">{trade.qty}</td>
                                            <td className="text-right font-mono">{formatCurrency(trade.price)}</td>
                                            <td className="text-right font-mono font-bold">{formatCurrency(trade.total_value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                <div className="flex justify-end mt-6">
                    <Button variant="secondary" onClick={onClose}>
                        <X size={16} />
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export const TradersPage: React.FC = () => {
    const { leaderboard } = useGameStore();
    const formatCurrency = useConfigStore(state => state.formatCurrency);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<'rank' | 'name' | 'netWorth'>('rank');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showBanModal, setShowBanModal] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<{ rank: number; name: string; netWorth: number } | null>(null);

    // Track banned and muted users locally (would come from backend in production)
    const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
    const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());

    // Calculate average net worth for performance comparison
    const avgNetWorth = useMemo(() => {
        if (leaderboard.length === 0) return 0;
        return leaderboard.reduce((sum, t) => sum + t.netWorth, 0) / leaderboard.length;
    }, [leaderboard]);

    // Filter and sort traders
    const filteredTraders = useMemo(() => {
        let traders = [...leaderboard];

        // Filter
        if (searchQuery) {
            traders = traders.filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort
        traders.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            return sortOrder === 'asc'
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
        });

        return traders;
    }, [leaderboard, searchQuery, sortField, sortOrder]);

    const handleSort = (field: 'rank' | 'name' | 'netWorth') => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleBan = (name: string) => {
        websocketService.send({
            type: 'AdminAction',
            payload: {
                action: 'BanTrader',
                payload: { name }
            }
        });
        setBannedUsers(prev => new Set(prev).add(name));
        setShowBanModal(null);
    };

    const handleUnban = (name: string) => {
        websocketService.send({
            type: 'AdminAction',
            payload: {
                action: 'UnbanTrader',
                payload: { name }
            }
        });
        setBannedUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(name);
            return newSet;
        });
    };

    const handleToggleChat = (name: string, currentlyMuted: boolean) => {
        websocketService.send({
            type: 'AdminAction',
            payload: {
                action: currentlyMuted ? 'UnmuteTrader' : 'MuteTrader',
                payload: { name }
            }
        });
        setMutedUsers(prev => {
            const newSet = new Set(prev);
            if (currentlyMuted) {
                newSet.delete(name);
            } else {
                newSet.add(name);
            }
            return newSet;
        });
    };

    return (
        <div className="traders-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Trader Management</h1>
                    <p className="text-muted">
                        {leaderboard.length} registered traders • Click on a trader to view details
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="input-with-icon">
                        <span className="input-icon">
                            <Search size={18} />
                        </span>
                        <input
                            type="text"
                            className="input"
                            placeholder="Search traders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: '40px', width: '250px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="stat-label">
                        <Users size={14} />
                        Total Traders
                    </div>
                    <div className="stat-value">{leaderboard.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">
                        <CheckCircle size={14} />
                        Active
                    </div>
                    <div className="stat-value text-success">{leaderboard.length - bannedUsers.size}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">
                        <Ban size={14} />
                        Banned
                    </div>
                    <div className="stat-value text-danger">{bannedUsers.size}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">
                        <DollarSign size={14} />
                        Total Net Worth
                    </div>
                    <div className="stat-value text-sm">
                        {formatCurrency(leaderboard.reduce((sum, t) => sum + t.netWorth, 0))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="panel">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th
                                    style={{ width: '80px', cursor: 'pointer' }}
                                    onClick={() => handleSort('rank')}
                                >
                                    <div className="flex items-center gap-1">
                                        Rank
                                        <TraderSortIcon field="rank" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>
                                <th
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Trader
                                        <TraderSortIcon field="name" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>
                                <th
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSort('netWorth')}
                                >
                                    <div className="flex items-center gap-1">
                                        Net Worth
                                        <TraderSortIcon field="netWorth" sortField={sortField} sortOrder={sortOrder} />
                                    </div>
                                </th>
                                <th>Change</th>
                                <th>Status</th>
                                <th style={{ width: '150px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTraders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted py-8">
                                        {searchQuery ? 'No traders found matching your search' : 'No traders registered yet'}
                                    </td>
                                </tr>
                            ) : (
                                filteredTraders.map((entry) => (
                                    <TraderRow
                                        key={entry.rank}
                                        entry={entry}
                                        avgNetWorth={avgNetWorth}
                                        isMuted={mutedUsers.has(entry.name)}
                                        isBanned={bannedUsers.has(entry.name)}
                                        onBan={(name) => setShowBanModal(name)}
                                        onUnban={handleUnban}
                                        onToggleChat={handleToggleChat}
                                        onViewDetails={setSelectedUser}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ban Confirmation Modal */}
            {showBanModal && (
                <Modal
                    title="Ban Trader"
                    onClose={() => setShowBanModal(null)}
                    isOpen={true}
                >
                    <div className="text-center">
                        <Ban size={48} style={{ color: 'var(--color-danger)', margin: '0 auto 16px' }} />
                        <p className="mb-6">
                            Are you sure you want to ban <strong>{showBanModal}</strong>?
                            <br />
                            <span className="text-muted text-sm">They will be logged out immediately.</span>
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => setShowBanModal(null)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={() => handleBan(showBanModal)}>
                                <Ban size={16} />
                                Ban Trader
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* User Detail Modal */}
            <UserDetailModal
                user={selectedUser}
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
            />
        </div>
    );
};

export default TradersPage;
