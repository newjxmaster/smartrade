# BUILD LIVE TRADING PLATFORM - COMPLETE SPECIFICATION
### Clone StockMart Simulation + Add Real-Money Features

---

## 🎯 PROJECT OVERVIEW

**Mission:** Create a production-ready live trading platform by cloning the existing StockMart simulation app and adding real-money features (payments, KYC, dividends, revenue tracking) while keeping the simulation mode for practice.

**Architecture:** Two modes in ONE application - users toggle between Simulation and Live Trading at login.

---

## 📋 CORE REQUIREMENTS

### What You're Building

```
┌────────────────────────────────────────────────────────────┐
│                    UNIFIED TRADING PLATFORM                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  LOGIN SCREEN                                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Welcome to TradePlatform                           │  │
│  │  Email: [__________]                                │  │
│  │  Password: [__________]                             │  │
│  │                                                      │  │
│  │  Login As:                                          │  │
│  │  ○ Simulation Mode (Practice with virtual money)   │  │
│  │  ○ Live Trading Mode (Real money, real profits)    │  │
│  │                                                      │  │
│  │  [Login] button                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  After login, user enters either:                          │
│  • Simulation Trading (StockMart features, no changes)     │
│  • Live Trading (StockMart + real money features)          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### What Gets Cloned from StockMart (Unchanged)

| Component | Keep As-Is | Reason |
|-----------|------------|--------|
| **Order Matching Engine** | ✅ | Perfect price discovery algorithm |
| **Order Book Logic** | ✅ | Bid/ask matching is production-ready |
| **WebSocket Real-Time** | ✅ | <50ms latency, handles 100+ users |
| **Trading UI** | ✅ | Professional TradingView charts |
| **Portfolio Tracking** | ✅ | Real-time P&L calculations |
| **Leaderboard** | ✅ | Rankings and competitive features |
| **Chat System** | ✅ | Real-time global chat |
| **Admin Market Control** | ✅ | Open/close markets, circuit breakers |

### What Gets Added for Live Trading

| Feature | New Functionality |
|---------|------------------|
| **Payment System** | Wave, Orange Money, Stripe, bank transfers |
| **KYC System** | Company document upload (S3), admin review |
| **Revenue Tracking** | Monthly reports, bank API webhooks |
| **Dividend Engine** | Automatic calculation & distribution |
| **Dual Wallet System** | Separate balances for simulation vs live |
| **Company IPO Flow** | Application → KYC → Approval → Listing |
| **Performance Pricing** | Real revenue data drives fair value estimates |
| **Withdrawal System** | Cash out to Wave/Orange Money/Bank |

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌───────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19)                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Login Screen                                               │  │
│  │  • Mode selector: Simulation / Live Trading               │  │
│  │  • Sets session.mode in localStorage                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Trading Interface (Same UI for both modes)                │  │
│  │  • Candlestick charts (TradingView Lightweight Charts)    │  │
│  │  • Order book with depth visualization                     │  │
│  │  • Place order panel (buy/sell, market/limit)             │  │
│  │  • Portfolio dashboard (holdings, P&L)                     │  │
│  │  • Company listings with filters                           │  │
│  │  • Leaderboard (separate for simulation and live)         │  │
│  │  • Global chat                                              │  │
│  │                                                             │  │
│  │  Mode-Specific Elements:                                   │  │
│  │  IF simulation → "Paper Trading" badge, no deposit button │  │
│  │  IF live → "Live Trading" badge, deposit/withdraw buttons │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Business Portal (Live Mode Only)                          │  │
│  │  • Company IPO application form                            │  │
│  │  • KYC document upload (3 docs)                           │  │
│  │  • Monthly revenue report submission                       │  │
│  │  • Dividend history view                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Admin Dashboard (Dual Mode)                               │  │
│  │  • Simulation: Market control, user management            │  │
│  │  • Live: + KYC review, revenue approval, dividend trigger │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + TypeScript)                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Trading Engine Service (Cloned from StockMart Rust)      │  │
│  │  • Order matching algorithm                                │  │
│  │  • Order book management                                   │  │
│  │  • WebSocket broadcasting                                  │  │
│  │  • Trade execution                                         │  │
│  │  • Portfolio calculations                                  │  │
│  │  • Mode-aware: reads user.current_mode from DB            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Mode Router Service                                       │  │
│  │  • Checks if user is in simulation or live mode           │  │
│  │  • Routes order to simulation_wallet or live_wallet       │  │
│  │  • Prevents mixing modes (can't buy live stock with sim $)│  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Payment Service (Live Mode Only)                          │  │
│  │  • Wave Money: checkout + webhook                          │  │
│  │  • Orange Money: payment + webhook                         │  │
│  │  • Stripe: card processing + webhook                       │  │
│  │  • Bank transfers: manual verification                     │  │
│  │  • Withdrawal processing                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  KYC Service (Live Mode Only)                              │  │
│  │  • Document upload to S3                                   │  │
│  │  • Admin review workflow                                   │  │
│  │  • Approval/rejection notifications                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                      │
│                             ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Revenue & Dividend Service (Live Mode Only)               │  │
│  │  • Monthly revenue report processing                       │  │
│  │  • Bank statement verification                             │  │
│  │  • Dividend calculation (formula below)                    │  │
│  │  • Bulk wallet credit for shareholders                     │  │
│  │  • Fair value calculation (performance-based pricing)      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (PostgreSQL + Redis + S3)            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                       │  │
│  │                                                             │  │
│  │  users {                                                   │  │
│  │    id, email, password_hash,                              │  │
│  │    current_mode: 'simulation' | 'live',                   │  │
│  │    simulation_balance_centimes,                           │  │
│  │    live_balance_centimes,                                 │  │
│  │    kyc_status: 'pending' | 'verified' | 'rejected'        │  │
│  │  }                                                         │  │
│  │                                                             │  │
│  │  companies {                                               │  │
│  │    id, symbol, name, current_price_centimes,              │  │
│  │    fair_value_centimes,                                   │  │
│  │    mode: 'simulation' | 'live',                           │  │
│  │    pricing_strategy: 'random_walk' | 'order_book_only' |  │  │
│  │                      'performance_based'                   │  │
│  │  }                                                         │  │
│  │                                                             │  │
│  │  orders {                                                  │  │
│  │    id, user_id, company_id, order_type, order_kind,       │  │
│  │    shares, price_centimes, status,                        │  │
│  │    mode: 'simulation' | 'live'  ← CRITICAL                │  │
│  │  }                                                         │  │
│  │                                                             │  │
│  │  holdings {                                                │  │
│  │    user_id, company_id, shares, avg_buy_price,            │  │
│  │    mode: 'simulation' | 'live'  ← CRITICAL                │  │
│  │  }                                                         │  │
│  │                                                             │  │
│  │  transactions {                                            │  │
│  │    id, user_id, type, amount_centimes, status,            │  │
│  │    mode: 'simulation' | 'live',                           │  │
│  │    external_reference  ← Wave/Orange/Stripe txn ID        │  │
│  │  }                                                         │  │
│  │                                                             │  │
│  │  kyc_documents { ... }  ← Live mode only                  │  │
│  │  revenue_reports { ... }  ← Live mode only                │  │
│  │  dividends { ... }  ← Live mode only                      │  │
│  │                                                             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Redis Cache                                               │  │
│  │  • Session storage (includes current_mode)                │  │
│  │  • Leaderboards (separate: simulation_leaders, live_leaders)│ │
│  │  • Real-time market data                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  AWS S3 / MinIO                                            │  │
│  │  • KYC documents (company registration, ID, photos)       │  │
│  │  • Bank statements                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔢 TRADING MATHEMATICS & ALGORITHMS

### 1. Order Matching Engine (Price-Time Priority)

**Algorithm:** Clone this EXACTLY from StockMart - it's perfect!

```typescript
/**
 * Order Matching Algorithm - Price-Time Priority
 * This is the SAME for both simulation and live mode
 */

class OrderMatchingEngine {
  private orderBooks: Map<string, OrderBook>; // companyId -> OrderBook

  async placeOrder(order: Order): Promise<MatchResult> {
    // 1. Validate order
    this.validateOrder(order);
    
    // 2. Check user has sufficient balance/shares
    await this.checkFunds(order);
    
    // 3. Lock funds/shares
    await this.lockResources(order);
    
    // 4. Add to order book
    const orderBook = this.orderBooks.get(order.companyId);
    orderBook.addOrder(order);
    
    // 5. Attempt matching
    const matches = await this.matchOrder(order, orderBook);
    
    // 6. Execute trades
    for (const match of matches) {
      await this.executeTrade(match);
    }
    
    // 7. Update order status
    if (order.filledShares === order.shares) {
      order.status = 'filled';
    } else if (order.filledShares > 0) {
      order.status = 'partially_filled';
    }
    
    // 8. Broadcast updates
    await this.broadcastOrderBookUpdate(order.companyId);
    
    return { matches, order };
  }

  private async matchOrder(newOrder: Order, orderBook: OrderBook): Promise<Trade[]> {
    const trades: Trade[] = [];
    let remainingShares = newOrder.shares - newOrder.filledShares;
    
    // Get opposite side of order book
    const oppositeOrders = newOrder.orderType === 'buy' 
      ? orderBook.getAsks()  // Sorted by price ASC (lowest first)
      : orderBook.getBids(); // Sorted by price DESC (highest first)
    
    for (const existingOrder of oppositeOrders) {
      if (remainingShares <= 0) break;
      
      // Price check for limit orders
      if (newOrder.orderKind === 'limit') {
        if (newOrder.orderType === 'buy' && existingOrder.price > newOrder.price) {
          break; // Can't match - asking price too high
        }
        if (newOrder.orderType === 'sell' && existingOrder.price < newOrder.price) {
          break; // Can't match - bid price too low
        }
      }
      
      // Calculate shares to trade
      const existingRemaining = existingOrder.shares - existingOrder.filledShares;
      const sharesToTrade = Math.min(remainingShares, existingRemaining);
      
      // Trade price = existing order's price (maker gets their price)
      const tradePrice = existingOrder.price;
      
      // Create trade record
      const trade = new Trade({
        buyOrderId: newOrder.orderType === 'buy' ? newOrder.id : existingOrder.id,
        sellOrderId: newOrder.orderType === 'sell' ? newOrder.id : existingOrder.id,
        companyId: newOrder.companyId,
        shares: sharesToTrade,
        pricePerShare: tradePrice,
        executedAt: new Date(),
        mode: newOrder.mode  // ← CRITICAL: Inherit mode from order
      });
      
      trades.push(trade);
      remainingShares -= sharesToTrade;
      
      // Update filled shares
      newOrder.filledShares += sharesToTrade;
      existingOrder.filledShares += sharesToTrade;
      
      // Update existing order status
      if (existingOrder.filledShares === existingOrder.shares) {
        existingOrder.status = 'filled';
      } else {
        existingOrder.status = 'partially_filled';
      }
    }
    
    return trades;
  }

  private async executeTrade(trade: Trade): Promise<void> {
    // ALL operations in a database transaction for atomicity
    
    const buyOrder = await this.getOrder(trade.buyOrderId);
    const sellOrder = await this.getOrder(trade.sellOrderId);
    const company = await this.getCompany(trade.companyId);
    
    const tradeValue = trade.shares * trade.pricePerShare; // in centimes
    const platformFee = Math.floor(tradeValue * 0.005); // 0.5% fee
    
    // 1. Transfer money: Buyer → Seller
    await this.debitWallet(buyOrder.userId, tradeValue, buyOrder.mode);
    await this.creditWallet(sellOrder.userId, tradeValue - platformFee, sellOrder.mode);
    
    // 2. Platform takes fee
    await this.creditPlatformWallet(platformFee);
    
    // 3. Transfer shares: Seller → Buyer
    await this.debitHoldings(sellOrder.userId, company.id, trade.shares, sellOrder.mode);
    await this.creditHoldings(buyOrder.userId, company.id, trade.shares, trade.pricePerShare, buyOrder.mode);
    
    // 4. Update company's current price
    company.currentPrice = trade.pricePerShare;
    await this.updateCompany(company);
    
    // 5. Save trade record
    await this.saveTrade(trade);
    
    // 6. Emit WebSocket events
    await this.broadcastToUser(buyOrder.userId, 'order:filled', { 
      orderId: buyOrder.id, 
      shares: trade.shares, 
      price: trade.pricePerShare 
    });
    await this.broadcastToUser(sellOrder.userId, 'order:filled', { 
      orderId: sellOrder.id, 
      shares: trade.shares, 
      price: trade.pricePerShare 
    });
    
    // 7. Broadcast to company room (all watchers)
    await this.broadcastToCompanyRoom(company.id, 'trade:executed', {
      price: trade.pricePerShare,
      shares: trade.shares,
      timestamp: trade.executedAt
    });
  }
}
```

**Key Math Principles:**
- **Price-time priority:** Orders matched by best price first, then earliest timestamp
- **Maker price wins:** Trade executes at the resting order's price (not the incoming order)
- **Atomic execution:** All wallet/holdings updates in one database transaction
- **Platform fee:** 0.5% of trade value, split between buyer and seller

---

### 2. Portfolio Calculations

```typescript
/**
 * Portfolio Value Calculation
 * SAME logic for simulation and live mode
 */

interface PortfolioCalculation {
  totalInvested: number;      // Sum of all buy costs (in centimes)
  currentValue: number;       // Current market value
  unrealizedPL: number;       // Profit/Loss on holdings
  realizedPL: number;         // Profit/Loss from closed positions
  totalPL: number;            // unrealizedPL + realizedPL
  plPercent: number;          // (totalPL / totalInvested) × 100
  cashBalance: number;        // Available cash in wallet
  netWorth: number;           // currentValue + cashBalance
}

class PortfolioService {
  async calculatePortfolio(userId: string, mode: 'simulation' | 'live'): Promise<PortfolioCalculation> {
    // 1. Get user's holdings (only for current mode)
    const holdings = await db.holdings.findMany({
      where: { userId, mode }
    });
    
    // 2. Get current prices for all companies
    const companies = await db.companies.findMany({
      where: { id: { in: holdings.map(h => h.companyId) } }
    });
    const priceMap = new Map(companies.map(c => [c.id, c.currentPrice]));
    
    // 3. Calculate current value and total invested
    let totalInvested = 0;
    let currentValue = 0;
    
    for (const holding of holdings) {
      const invested = holding.shares * holding.avgBuyPrice; // What user paid
      const current = holding.shares * priceMap.get(holding.companyId)!; // Current worth
      
      totalInvested += invested;
      currentValue += current;
    }
    
    // 4. Get user's cash balance
    const user = await db.users.findUnique({ where: { id: userId } });
    const cashBalance = mode === 'simulation' 
      ? user.simulationBalanceCentimes 
      : user.liveBalanceCentimes;
    
    // 5. Calculate realized P&L (from past trades)
    const realizedPL = await this.calculateRealizedPL(userId, mode);
    
    // 6. Calculate unrealized P&L (from current holdings)
    const unrealizedPL = currentValue - totalInvested;
    
    // 7. Calculate totals
    const totalPL = unrealizedPL + realizedPL;
    const plPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    const netWorth = currentValue + cashBalance;
    
    return {
      totalInvested,
      currentValue,
      unrealizedPL,
      realizedPL,
      totalPL,
      plPercent,
      cashBalance,
      netWorth
    };
  }
  
  private async calculateRealizedPL(userId: string, mode: string): Promise<number> {
    // Get all completed sell trades for this user
    const sellTrades = await db.trades.findMany({
      where: {
        sellOrder: { userId },
        mode
      },
      include: { sellOrder: true }
    });
    
    let realizedPL = 0;
    
    for (const trade of sellTrades) {
      // What the user paid for these shares (average buy price)
      const holding = await db.holdings.findUnique({
        where: { 
          userId_companyId_mode: { 
            userId, 
            companyId: trade.companyId, 
            mode 
          } 
        }
      });
      
      const costBasis = trade.shares * holding.avgBuyPrice;
      const saleProceeds = trade.shares * trade.pricePerShare;
      
      realizedPL += (saleProceeds - costBasis);
    }
    
    return realizedPL;
  }
}
```

**Key Formulas:**
```
Total Invested = Σ(shares × avgBuyPrice) for all holdings
Current Value = Σ(shares × currentPrice) for all holdings
Unrealized P&L = Current Value - Total Invested
Realized P&L = Σ(saleProceeds - costBasis) for all past sells
Total P&L = Unrealized P&L + Realized P&L
P&L % = (Total P&L / Total Invested) × 100
Net Worth = Current Value + Cash Balance
```

---

### 3. Dividend Calculation & Distribution

```typescript
/**
 * Dividend Calculation - LIVE MODE ONLY
 * 
 * Formula:
 * 1. Platform takes 5% commission from gross revenue
 * 2. Company calculates net profit (revenue - costs)
 * 3. Company allocates X% of profit to dividends (set at IPO, typically 60%)
 * 4. Dividend pool distributed proportionally to shareholders
 */

interface RevenueReport {
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  grossRevenue: number;     // in centimes (XOF × 100)
  operatingCosts: number;   // in centimes
  netProfit: number;        // auto-calculated
  platformFee: number;      // auto-calculated (5% of gross)
}

interface DividendDistribution {
  dividendPool: number;           // Total XOF to distribute
  dividendPerShare: number;       // XOF per share (in centimes)
  shareholders: ShareholderPayout[];
}

interface ShareholderPayout {
  userId: string;
  username: string;
  sharesHeld: number;
  payoutAmount: number;  // in centimes
}

class DividendService {
  async calculateDividends(report: RevenueReport): Promise<DividendDistribution> {
    const company = await db.companies.findUnique({ 
      where: { id: report.companyId } 
    });
    
    // Step 1: Calculate platform fee (5% of gross revenue)
    const platformFee = Math.floor(report.grossRevenue * 0.05);
    report.platformFee = platformFee;
    
    // Step 2: Calculate net profit
    const netProfit = report.grossRevenue - report.operatingCosts - platformFee;
    report.netProfit = netProfit;
    
    // Step 3: Calculate dividend pool (company's dividend ratio, e.g., 60%)
    const dividendPool = Math.floor(netProfit * company.dividendRatio);
    const reinvestment = netProfit - dividendPool;
    
    // Step 4: Get all shareholders (live mode only)
    const shareholders = await db.holdings.findMany({
      where: { 
        companyId: company.id,
        mode: 'live'  // ← CRITICAL: Only live mode shareholders
      },
      include: { user: true }
    });
    
    // Step 5: Calculate total shares in circulation (public holdings)
    const totalPublicShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
    
    // Step 6: Calculate dividend per share
    const dividendPerShare = Math.floor(dividendPool / totalPublicShares);
    
    // Step 7: Calculate each shareholder's payout
    const payouts: ShareholderPayout[] = shareholders.map(sh => ({
      userId: sh.userId,
      username: sh.user.username,
      sharesHeld: sh.shares,
      payoutAmount: sh.shares * dividendPerShare
    }));
    
    return {
      dividendPool,
      dividendPerShare,
      shareholders: payouts
    };
  }
  
  async distributeDividends(distribution: DividendDistribution, companyId: string): Promise<void> {
    // Execute in a database transaction for atomicity
    
    for (const payout of distribution.shareholders) {
      // 1. Credit shareholder's wallet (live mode)
      await db.users.update({
        where: { id: payout.userId },
        data: {
          liveBalanceCentimes: {
            increment: payout.payoutAmount
          }
        }
      });
      
      // 2. Create transaction record
      await db.transactions.create({
        data: {
          userId: payout.userId,
          type: 'dividend',
          amountCentimes: payout.payoutAmount,
          mode: 'live',
          status: 'completed',
          reference: `Dividend from ${companyId}`
        }
      });
      
      // 3. Emit WebSocket notification
      await this.websocket.emitToUser(payout.userId, 'dividend:credited', {
        companyId,
        amount: payout.payoutAmount,
        shares: payout.sharesHeld,
        perShare: distribution.dividendPerShare
      });
    }
    
    // 4. Save dividend record
    await db.dividends.create({
      data: {
        companyId,
        dividendPool: distribution.dividendPool,
        dividendPerShare: distribution.dividendPerShare,
        totalShareholders: distribution.shareholders.length,
        status: 'distributed',
        distributedAt: new Date()
      }
    });
  }
}
```

**Dividend Math Example:**
```
Company: Bean Dreams Coffee Shop
Period: January 2026

Step 1: Revenue Report Submitted
  Gross Revenue:    1,250,000 XOF (125,000,000 centimes)
  Operating Costs:    800,000 XOF (80,000,000 centimes)

Step 2: Platform Fee
  Platform Fee (5%):   62,500 XOF (6,250,000 centimes)

Step 3: Net Profit
  Net Profit = 1,250,000 - 800,000 - 62,500 = 387,500 XOF

Step 4: Dividend Allocation (Company set 60% at IPO)
  Dividend Pool (60%): 232,500 XOF (23,250,000 centimes)
  Reinvestment (40%):  155,000 XOF (15,500,000 centimes)

Step 5: Public Shares
  Total Shares: 5,000
  Public Shares (70%): 3,500
  Founder Shares (30%): 1,500 (not eligible for dividends yet)

Step 6: Dividend Per Share
  Dividend per Share = 232,500 XOF ÷ 3,500 = 66.43 XOF (6,643 centimes)

Step 7: Example Payouts
  Investor A (100 shares): 100 × 66.43 = 6,643 XOF
  Investor B (50 shares):  50 × 66.43 = 3,321 XOF
  Investor C (25 shares):  25 × 66.43 = 1,661 XOF
  ... (all 3,500 shares distributed)

Total Distributed: 232,500 XOF
```

---

### 4. Performance-Based Fair Value Calculation

```typescript
/**
 * Fair Value Calculation - LIVE MODE ONLY
 * Runs weekly (Sunday 2 AM) via cron job
 * Does NOT change market price, only provides reference estimate
 */

interface PerformanceMetrics {
  revenueGrowthRate: number;     // e.g., 0.56 = 56% growth
  profitMarginScore: number;     // e.g., 0.31 = 31% margin
  tradingVolumeScore: number;    // normalized 0-1
  dividendConsistencyScore: number; // 1.0 if paid on time, 0.0 otherwise
}

class FairValueCalculator {
  async calculateFairValue(companyId: string): Promise<number> {
    const company = await db.companies.findUnique({ where: { id: companyId } });
    
    if (company.mode === 'simulation') {
      return company.currentPrice; // No fair value for simulation mode
    }
    
    // 1. Fetch last 3 months of revenue reports
    const reports = await db.revenueReports.findMany({
      where: { 
        companyId,
        status: 'approved'
      },
      orderBy: { periodEnd: 'desc' },
      take: 3
    });
    
    if (reports.length < 2) {
      return company.currentPrice; // Not enough data yet
    }
    
    // 2. Calculate performance metrics
    const metrics = this.calculateMetrics(reports, companyId);
    
    // 3. Calculate performance score (weighted average)
    const performanceScore = 
      (metrics.revenueGrowthRate * 0.40) +      // 40% weight
      (metrics.profitMarginScore * 0.30) +      // 30% weight
      (metrics.tradingVolumeScore * 0.20) +     // 20% weight
      (metrics.dividendConsistencyScore * 0.10); // 10% weight
    
    // 4. Apply dampening factor (only 50% of performance affects fair value)
    const dampenedScore = performanceScore * 0.5;
    
    // 5. Calculate new fair value
    const currentFairValue = company.fairValueEstimate || company.currentPrice;
    const newFairValue = Math.floor(currentFairValue * (1 + dampenedScore));
    
    // 6. Cap maximum change per update (±20%)
    const maxChange = Math.floor(currentFairValue * 0.20);
    const cappedFairValue = Math.max(
      currentFairValue - maxChange,
      Math.min(newFairValue, currentFairValue + maxChange)
    );
    
    return cappedFairValue;
  }
  
  private calculateMetrics(reports: RevenueReport[], companyId: string): PerformanceMetrics {
    // Revenue Growth Rate (comparing most recent to 3 months ago)
    const latestRevenue = reports[0].grossRevenue;
    const oldestRevenue = reports[reports.length - 1].grossRevenue;
    const revenueGrowthRate = (latestRevenue - oldestRevenue) / oldestRevenue;
    
    // Profit Margin (average over 3 months)
    const avgProfitMargin = reports.reduce((sum, r) => {
      const margin = r.netProfit / r.grossRevenue;
      return sum + margin;
    }, 0) / reports.length;
    
    // Trading Volume Score (last 30 days, normalized 0-1)
    const volumeLast30d = await this.getTrading30dVolume(companyId);
    const marketAvgVolume = await this.getMarketAvgVolume();
    const tradingVolumeScore = Math.min(1.0, volumeLast30d / marketAvgVolume);
    
    // Dividend Consistency (did company pay on time last 3 periods?)
    const dividendsPaid = await db.dividends.count({
      where: {
        companyId,
        distributedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        status: 'distributed'
      }
    });
    const dividendConsistencyScore = dividendsPaid === reports.length ? 1.0 : 0.0;
    
    return {
      revenueGrowthRate,
      profitMarginScore: avgProfitMargin,
      tradingVolumeScore,
      dividendConsistencyScore
    };
  }
}
```

**Fair Value Math Example:**
```
Company: Bean Dreams
Current Fair Value: 10,000 centimes (100.00 XOF)

Performance Metrics:
  Revenue Growth: +56% over 3 months → 0.56
  Profit Margin: 31% average → 0.31
  Trading Volume: 75% of market average → 0.75
  Dividend Consistency: Paid all 3 months → 1.0

Weighted Performance Score:
  (0.56 × 0.40) + (0.31 × 0.30) + (0.75 × 0.20) + (1.0 × 0.10)
  = 0.224 + 0.093 + 0.150 + 0.100
  = 0.567 (56.7% performance score)

Apply Dampening (50%):
  Dampened Score = 0.567 × 0.5 = 0.2835

Calculate New Fair Value:
  New Fair Value = 10,000 × (1 + 0.2835) = 12,835 centimes (128.35 XOF)

Check Cap (±20% max change):
  Max Increase: 10,000 × 1.20 = 12,000 centimes (120.00 XOF)
  Capped Fair Value: 12,000 centimes (120.00 XOF)

Result:
  Fair Value updated from 100.00 XOF to 120.00 XOF
  Shown as dotted line on chart
  Market price still determined by order book (might be 115.00 XOF)
```

---

### 5. Leaderboard Calculations

```typescript
/**
 * Leaderboard System
 * Separate leaderboards for simulation and live mode
 */

class LeaderboardService {
  async updateLeaderboard(mode: 'simulation' | 'live'): Promise<void> {
    // Get all users with holdings in this mode
    const users = await db.users.findMany({
      where: {
        holdings: {
          some: { mode }
        }
      }
    });
    
    // Calculate net worth for each user
    const rankings: Array<{ userId: string; username: string; netWorth: number }> = [];
    
    for (const user of users) {
      const portfolio = await this.portfolioService.calculatePortfolio(user.id, mode);
      rankings.push({
        userId: user.id,
        username: user.username,
        netWorth: portfolio.netWorth
      });
    }
    
    // Sort by net worth descending
    rankings.sort((a, b) => b.netWorth - a.netWorth);
    
    // Store in Redis sorted set for fast access
    const key = mode === 'simulation' ? 'leaderboard:simulation' : 'leaderboard:live';
    
    for (let i = 0; i < rankings.length; i++) {
      await redis.zadd(key, rankings[i].netWorth, rankings[i].userId);
    }
    
    // Broadcast update to all users
    await this.websocket.broadcastToAll('leaderboard:update', {
      mode,
      topTen: rankings.slice(0, 10)
    });
  }
  
  async getLeaderboard(mode: 'simulation' | 'live', limit: number = 100): Promise<Ranking[]> {
    const key = mode === 'simulation' ? 'leaderboard:simulation' : 'leaderboard:live';
    
    // Get top N from Redis (sorted by score/net worth)
    const userIds = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    
    // Fetch user details
    const rankings: Ranking[] = [];
    for (let i = 0; i < userIds.length; i += 2) {
      const userId = userIds[i];
      const netWorth = parseInt(userIds[i + 1]);
      
      const user = await db.users.findUnique({ where: { id: userId } });
      
      rankings.push({
        rank: rankings.length + 1,
        userId,
        username: user.username,
        netWorth,
        badges: user.badges || []
      });
    }
    
    return rankings;
  }
}
```

**Redis Storage:**
```
Key: "leaderboard:simulation"
Type: Sorted Set (ZADD/ZREVRANGE)
Members: userId → score (net worth in centimes)

Example:
ZADD leaderboard:live 15420000 "user_abc_123"  // 154,200 XOF
ZADD leaderboard:live 98750000 "user_xyz_789"  // 987,500 XOF
ZADD leaderboard:live 45600000 "user_qwe_456"  // 456,000 XOF

ZREVRANGE leaderboard:live 0 9 WITHSCORES
→ Returns top 10 users by net worth
```

---

## 🔐 MODE SEPARATION - CRITICAL IMPLEMENTATION

### Database Schema Changes

```sql
-- Add mode column to ALL relevant tables

ALTER TABLE users ADD COLUMN current_mode VARCHAR(20) DEFAULT 'simulation';
ALTER TABLE users ADD COLUMN simulation_balance_centimes BIGINT DEFAULT 10000000;  -- 100K XOF
ALTER TABLE users ADD COLUMN live_balance_centimes BIGINT DEFAULT 0;

ALTER TABLE companies ADD COLUMN mode VARCHAR(20) DEFAULT 'simulation';
ALTER TABLE companies ADD COLUMN pricing_strategy VARCHAR(30) DEFAULT 'random_walk';

ALTER TABLE orders ADD COLUMN mode VARCHAR(20) NOT NULL;
ALTER TABLE trades ADD COLUMN mode VARCHAR(20) NOT NULL;
ALTER TABLE holdings ADD COLUMN mode VARCHAR(20) NOT NULL;
CREATE UNIQUE INDEX idx_holdings_user_company_mode ON holdings(user_id, company_id, mode);

ALTER TABLE transactions ADD COLUMN mode VARCHAR(20) NOT NULL;
```

### Mode Router Middleware

```typescript
/**
 * Mode Router - Ensures operations happen in correct mode
 */

class ModeRouter {
  async routeOrder(order: OrderRequest, userId: string): Promise<Order> {
    // 1. Get user's current mode
    const user = await db.users.findUnique({ where: { id: userId } });
    const mode = user.currentMode;
    
    // 2. Get company's mode
    const company = await db.companies.findUnique({ 
      where: { symbol: order.symbol } 
    });
    
    // 3. Validate mode compatibility
    if (company.mode !== mode) {
      throw new Error(
        `Cannot trade ${order.symbol} in ${mode} mode. ` +
        `This company is only available in ${company.mode} mode.`
      );
    }
    
    // 4. Check balance in correct wallet
    const balance = mode === 'simulation' 
      ? user.simulationBalanceCentimes 
      : user.liveBalanceCentimes;
    
    const requiredFunds = order.shares * order.price;
    
    if (balance < requiredFunds) {
      throw new Error(
        `Insufficient ${mode} balance. ` +
        `Required: ${requiredFunds / 100} XOF, Available: ${balance / 100} XOF`
      );
    }
    
    // 5. Create order with mode
    const orderEntity = await db.orders.create({
      data: {
        userId,
        companyId: company.id,
        orderType: order.orderType,
        shares: order.shares,
        price: order.price,
        mode,  // ← CRITICAL
        status: 'open'
      }
    });
    
    return orderEntity;
  }
  
  async switchMode(userId: string, newMode: 'simulation' | 'live'): Promise<void> {
    // Update user's current mode
    await db.users.update({
      where: { id: userId },
      data: { currentMode: newMode }
    });
    
    // Emit WebSocket event to refresh UI
    await this.websocket.emitToUser(userId, 'mode:switched', { mode: newMode });
  }
}
```

### Frontend Mode Indicator

```typescript
/**
 * Mode Indicator Component - Always Visible
 */

function ModeIndicator() {
  const user = useUser();
  const mode = user.currentMode;

  return (
    <div className={`mode-indicator ${mode}`}>
      {mode === 'simulation' ? (
        <>
          <span className="badge badge-blue">📊 SIMULATION MODE</span>
          <span className="balance">Virtual Balance: {formatXOF(user.simulationBalanceCentimes)}</span>
          <button onClick={() => switchMode('live')}>
            Switch to Live Trading →
          </button>
        </>
      ) : (
        <>
          <span className="badge badge-green">💰 LIVE TRADING</span>
          <span className="balance">Real Balance: {formatXOF(user.liveBalanceCentimes)}</span>
          <button onClick={() => switchMode('simulation')}>
            Switch to Simulation →
          </button>
        </>
      )}
    </div>
  );
}
```

---

## 💳 PAYMENT INTEGRATIONS - COMPLETE SPECIFICATIONS

### Wave Money Integration

```typescript
/**
 * Wave Money API Integration
 * Docs: https://docs.wave.com/collect
 */

class WavePaymentService {
  private apiKey: string;
  private webhookSecret: string;

  async initiateDeposit(userId: string, amountXOF: number): Promise<string> {
    // 1. Create Wave checkout session
    const response = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: (amountXOF * 100).toString(), // Wave expects centimes as string
        currency: 'XOF',
        success_url: `${process.env.BASE_URL}/payment/success?user=${userId}`,
        error_url: `${process.env.BASE_URL}/payment/error`,
        client_reference: userId
      })
    });

    const data = await response.json();
    
    // 2. Store pending transaction
    await db.transactions.create({
      data: {
        userId,
        type: 'deposit',
        amountCentimes: amountXOF * 100,
        method: 'wave',
        status: 'pending',
        externalReference: data.id,
        mode: 'live'
      }
    });

    // 3. Return checkout URL for user to complete payment
    return data.wave_launch_url;
  }

  async handleWebhook(payload: string, signature: string): Promise<void> {
    // 1. Verify HMAC signature
    const isValid = this.verifySignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // 2. Parse webhook data
    const data = JSON.parse(payload);

    if (data.checkout_status === 'complete') {
      const userId = data.client_reference;
      const amountCentimes = parseInt(data.amount);

      // 3. Credit user's live wallet
      await db.users.update({
        where: { id: userId },
        data: {
          liveBalanceCentimes: {
            increment: amountCentimes
          }
        }
      });

      // 4. Update transaction status
      await db.transactions.updateMany({
        where: {
          userId,
          externalReference: data.id,
          status: 'pending'
        },
        data: {
          status: 'completed'
        }
      });

      // 5. Emit WebSocket notification
      await this.websocket.emitToUser(userId, 'wallet:credited', {
        amount: amountCentimes,
        method: 'wave'
      });
    }
  }

  private verifySignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload);
    const expected = hmac.digest('hex');
    return expected === signature;
  }
}
```

### Orange Money Integration

```typescript
/**
 * Orange Money Web Payment API
 * Integrate via Orange Developer Platform
 */

class OrangeMoneyService {
  private merchantKey: string;
  private apiBase: string;

  async initiateDeposit(userId: string, amountXOF: number, phone: string): Promise<string> {
    // 1. Get OAuth access token
    const token = await this.getAccessToken();

    // 2. Initiate payment
    const orderId = `OM_${userId}_${Date.now()}`;
    
    const response = await fetch(
      `${this.apiBase}/orange-money-webpay/dev/v1/webpayment`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchant_key: this.merchantKey,
          currency: 'OUV', // XOF in Orange Money terminology
          order_id: orderId,
          amount: amountXOF,
          return_url: `${process.env.BASE_URL}/payment/success`,
          cancel_url: `${process.env.BASE_URL}/payment/cancel`,
          notif_url: `${process.env.BASE_URL}/api/webhooks/orange-money`,
          lang: 'fr'
        })
      }
    );

    const data = await response.json();

    // 3. Store pending transaction
    await db.transactions.create({
      data: {
        userId,
        type: 'deposit',
        amountCentimes: amountXOF * 100,
        method: 'orange_money',
        status: 'pending',
        externalReference: orderId,
        mode: 'live'
      }
    });

    // 4. Return payment URL
    return data.payment_url;
  }

  async handleWebhook(payload: any): Promise<void> {
    if (payload.status === 'SUCCESS') {
      const orderId = payload.order_id;
      
      // Find transaction
      const transaction = await db.transactions.findFirst({
        where: { externalReference: orderId }
      });

      // Credit wallet
      await db.users.update({
        where: { id: transaction.userId },
        data: {
          liveBalanceCentimes: {
            increment: transaction.amountCentimes
          }
        }
      });

      // Update transaction
      await db.transactions.update({
        where: { id: transaction.id },
        data: { status: 'completed' }
      });

      // Notify user
      await this.websocket.emitToUser(transaction.userId, 'wallet:credited', {
        amount: transaction.amountCentimes,
        method: 'orange_money'
      });
    }
  }

  private async getAccessToken(): Promise<string> {
    // OAuth flow for Orange Money API
    // Cache token for 1 hour
    // ... implementation details
  }
}
```

### Stripe Integration (Card Payments)

```typescript
/**
 * Stripe Integration for International Cards
 */

import Stripe from 'stripe';

class StripePaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
  }

  async initiateDeposit(userId: string, amountXOF: number): Promise<string> {
    // Create Stripe Payment Intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountXOF * 100, // Stripe expects centimes
      currency: 'xof', // Stripe supports XOF for West Africa
      metadata: {
        userId,
        type: 'wallet_deposit'
      }
    });

    // Store pending transaction
    await db.transactions.create({
      data: {
        userId,
        type: 'deposit',
        amountCentimes: amountXOF * 100,
        method: 'stripe',
        status: 'pending',
        externalReference: paymentIntent.id,
        mode: 'live'
      }
    });

    // Return client secret for frontend to complete payment
    return paymentIntent.client_secret!;
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const userId = paymentIntent.metadata.userId;

      // Credit wallet
      await db.users.update({
        where: { id: userId },
        data: {
          liveBalanceCentimes: {
            increment: paymentIntent.amount
          }
        }
      });

      // Update transaction
      await db.transactions.updateMany({
        where: {
          externalReference: paymentIntent.id,
          status: 'pending'
        },
        data: { status: 'completed' }
      });

      // Notify user
      await this.websocket.emitToUser(userId, 'wallet:credited', {
        amount: paymentIntent.amount,
        method: 'stripe'
      });
    }
  }
}
```

---

## 📄 KYC DOCUMENT UPLOAD SYSTEM

```typescript
/**
 * KYC Document Upload to S3/MinIO
 * Three required documents:
 * 1. Company registration certificate
 * 2. Manager's national ID
 * 3. Business photo
 */

import AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';

class KYCService {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });
  }

  async uploadDocument(
    applicationId: string,
    documentType: 'registration' | 'manager_id' | 'business_photo',
    file: Express.Multer.File
  ): Promise<string> {
    // 1. Validate file
    this.validateFile(file, documentType);

    // 2. Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const key = `kyc/${applicationId}/${documentType}_${uuid()}.${fileExtension}`;

    // 3. Upload to S3
    await this.s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private' // Only accessible via presigned URLs
    }).promise();

    // 4. Store record in database
    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    await db.kycDocuments.create({
      data: {
        applicationId,
        documentType,
        fileUrl: key, // Store key, not full URL
        fileSize: file.size,
        status: 'pending'
      }
    });

    return fileUrl;
  }

  async getPresignedUrl(fileKey: string): Promise<string> {
    // Generate presigned URL valid for 15 minutes
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: fileKey,
      Expires: 900 // 15 minutes
    });
  }

  private validateFile(file: Express.Multer.File, documentType: string): void {
    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Allowed file types
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('File type not allowed. Only JPG, PNG, and PDF are accepted.');
    }
  }
}
```

**Frontend Upload Component:**
```typescript
function KYCUploadForm() {
  const [files, setFiles] = useState({
    registration: null,
    manager_id: null,
    business_photo: null
  });

  async function handleUpload(docType: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', docType);

    const response = await fetch('/api/kyc/upload', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      setFiles({ ...files, [docType]: file });
    }
  }

  return (
    <div className="kyc-upload-form">
      <h3>Upload Required Documents</h3>
      
      <div className="upload-box">
        <label>📄 Company Registration Certificate</label>
        <input 
          type="file" 
          accept=".jpg,.png,.pdf" 
          onChange={e => handleUpload('registration', e.target.files![0])}
        />
        {files.registration && <span className="success">✓ Uploaded</span>}
      </div>

      <div className="upload-box">
        <label>🪪 Manager's National ID</label>
        <input 
          type="file" 
          accept=".jpg,.png,.pdf" 
          onChange={e => handleUpload('manager_id', e.target.files![0])}
        />
        {files.manager_id && <span className="success">✓ Uploaded</span>}
      </div>

      <div className="upload-box">
        <label>📸 Business Photo</label>
        <input 
          type="file" 
          accept=".jpg,.png" 
          onChange={e => handleUpload('business_photo', e.target.files![0])}
        />
        {files.business_photo && <span className="success">✓ Uploaded</span>}
      </div>

      <button 
        disabled={!files.registration || !files.manager_id || !files.business_photo}
        onClick={submitApplication}
      >
        Submit Application
      </button>
    </div>
  );
}
```

---

## 🎛️ CONFIGURATION FILES

### Environment Variables

```bash
# .env file

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trading_platform"
REDIS_URL="redis://localhost:6379"

# AWS S3 (for KYC documents)
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="trading-platform-kyc"

# Payment Providers
WAVE_API_KEY="your_wave_api_key"
WAVE_WEBHOOK_SECRET="your_wave_webhook_secret"

ORANGE_MONEY_MERCHANT_KEY="your_orange_merchant_key"
ORANGE_MONEY_CLIENT_ID="your_orange_client_id"
ORANGE_MONEY_CLIENT_SECRET="your_orange_client_secret"

STRIPE_SECRET_KEY="sk_live_your_stripe_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Platform Configuration
BASE_URL="https://yourplatform.com"
JWT_SECRET="your_jwt_secret_min_32_characters"
SESSION_SECRET="your_session_secret"

# Mode Settings
DEFAULT_MODE="simulation"
SIMULATION_STARTING_BALANCE=10000000  # 100,000 XOF (in centimes)
LIVE_STARTING_BALANCE=0

# Trading Fees
PLATFORM_TRADING_FEE=0.005  # 0.5%
PLATFORM_REVENUE_COMMISSION=0.05  # 5%

# Pricing Update
FAIR_VALUE_UPDATE_CRON="0 2 * * 0"  # Every Sunday at 2 AM
PERFORMANCE_DAMPENING_FACTOR=0.5
```

### Platform Configuration

```json
// config/platform.json

{
  "modes": {
    "simulation": {
      "enabled": true,
      "startingBalance": 10000000,
      "pricingStrategy": "random_walk",
      "newsGeneration": "simulated",
      "dividendsEnabled": false,
      "withdrawalsEnabled": false
    },
    "live": {
      "enabled": true,
      "startingBalance": 0,
      "pricingStrategy": "order_book_only",
      "newsGeneration": "manual",
      "dividendsEnabled": true,
      "withdrawalsEnabled": true,
      "kycRequired": true,
      "minimumDeposit": 500000,
      "minimumWithdrawal": 100000
    }
  },
  
  "trading": {
    "orderTypes": ["market", "limit"],
    "platformFee": 0.005,
    "circuitBreakerThreshold": 0.15,
    "circuitBreakerWindow": 300,
    "maxOrderSize": 10000,
    "minOrderSize": 1
  },
  
  "dividends": {
    "minDividendRatio": 0.40,
    "maxDividendRatio": 0.80,
    "defaultDividendRatio": 0.60,
    "minPayoutThreshold": 100
  },
  
  "kyc": {
    "requiredDocuments": ["registration", "manager_id", "business_photo"],
    "maxFileSize": 10485760,
    "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"],
    "reviewTimeoutDays": 5
  }
}
```

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### Docker Compose Setup

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: trading_platform
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/trading_platform
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      NODE_ENV: production
    ports:
      - "4000:4000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: ${API_URL}
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## ✅ BUILD CHECKLIST

### Phase 1: Clone & Setup (Week 1)
- [ ] Clone StockMart repository
- [ ] Set up PostgreSQL database
- [ ] Set up Redis
- [ ] Add `mode` columns to all tables
- [ ] Implement mode router middleware
- [ ] Create dual wallet system (simulation_balance + live_balance)
- [ ] Test mode switching

### Phase 2: Payment Integration (Week 2-3)
- [ ] Wave Money API integration
- [ ] Orange Money API integration
- [ ] Stripe card payment integration
- [ ] Webhook handlers for all providers
- [ ] Transaction logging
- [ ] Deposit UI in frontend
- [ ] Withdrawal system

### Phase 3: KYC System (Week 4)
- [ ] S3/MinIO setup for file storage
- [ ] Company application form
- [ ] Document upload API (3 files)
- [ ] Admin KYC review interface
- [ ] Approval/rejection workflow
- [ ] Email notifications

### Phase 4: Revenue & Dividends (Week 5-6)
- [ ] Revenue report submission form
- [ ] Bank statement upload
- [ ] Admin revenue review interface
- [ ] Dividend calculation service
- [ ] Bulk wallet credit for shareholders
- [ ] Dividend history UI

### Phase 5: Performance Pricing (Week 7)
- [ ] Fair value calculation service
- [ ] Weekly cron job
- [ ] Performance metrics calculation
- [ ] Fair value display on charts

### Phase 6: Frontend Enhancements (Week 8)
- [ ] Mode selector on login screen
- [ ] Mode indicator always visible
- [ ] Separate leaderboards (simulation vs live)
- [ ] Business portal for companies
- [ ] Enhanced admin dashboard
- [ ] Deposit/withdraw buttons (live mode only)

### Phase 7: Testing (Week 9-10)
- [ ] Unit tests for all services
- [ ] Integration tests for payment flows
- [ ] End-to-end tests (deposit → trade → dividend → withdraw)
- [ ] Load testing (100+ concurrent users)
- [ ] Security audit
- [ ] Penetration testing

### Phase 8: Deployment (Week 11-12)
- [ ] VPS setup (Ubuntu 22.04)
- [ ] Docker containers
- [ ] Nginx reverse proxy
- [ ] SSL certificates
- [ ] Database backups
- [ ] Monitoring (Datadog/Grafana)
- [ ] Error tracking (Sentry)

---

## 📊 CRITICAL SUCCESS FACTORS

1. **Mode Isolation is CRITICAL**
   - NEVER mix simulation and live data
   - Always check `mode` field in queries
   - Test mode switching thoroughly

2. **Money Math Must Be PERFECT**
   - Always use integers (centimes), never floats
   - Test dividend calculations with real numbers
   - Verify all wallet operations are atomic (database transactions)

3. **Payment Webhooks Must Be Reliable**
   - Verify ALL webhook signatures
   - Implement idempotency (prevent double-crediting)
   - Log every webhook for debugging

4. **Order Matching Must Be Fair**
   - Clone StockMart's algorithm exactly
   - Don't modify the price-time priority logic
   - Test with high concurrency

5. **Security is NON-NEGOTIABLE**
   - Hash all passwords (bcrypt, 10 rounds minimum)
   - Validate ALL inputs
   - Rate limit API endpoints
   - Encrypt sensitive data at rest
   - Use HTTPS everywhere

---

## 🎯 FINAL DELIVERABLES

When complete, you will have:

1. **One unified platform** with simulation and live trading modes
2. **Complete payment system** (Wave, Orange Money, Stripe, bank)
3. **Full KYC workflow** with S3 document storage
4. **Automated dividend engine** with performance-based pricing
5. **Professional trading UI** with TradingView charts
6. **Real-time WebSocket** updates for prices, orders, chat
7. **Dual leaderboards** (simulation and live rankings)
8. **Admin dashboard** for managing everything
9. **Company portal** for submitting reports and announcements
10. **Production-ready deployment** with Docker

**Timeline:** 12 weeks (3 months) with 2 full-stack developers

**Budget:** 
- Development: $50,000-60,000
- Infrastructure: $100/month
- Total Year 1: ~$55,000

---

*This specification is COMPLETE and COMPREHENSIVE. Follow it step-by-step and you'll have a production-ready live trading platform with all the features of StockMart PLUS real-money capabilities.*

**Good luck building! 🚀**
