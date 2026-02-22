# HYBRID ARCHITECTURE: STOCKMART + CUSTOM BACKEND
## Two-App System with Real-Money Layer

---

## 🎯 EXECUTIVE SUMMARY

**Your Approach: BRILLIANT!**

Keep StockMart as the **trading engine** and build a separate **business logic app** that handles:
- Real money (payments, KYC, dividends)
- Company management
- Revenue verification
- Regulatory compliance

The two apps communicate via **REST APIs** and share a **PostgreSQL database**.

**Benefits:**
1. ✅ Don't touch StockMart's proven trading engine
2. ✅ Build business logic in comfortable tech stack (Node.js/Python)
3. ✅ Can have both LIVE (real money) and PAPER (simulation) modes
4. ✅ Toggle between random pricing (paper) and performance pricing (live)
5. ✅ Each app has clear responsibility
6. ✅ Easy to maintain and scale independently

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │        STOCKMART FRONTEND (React + TypeScript)              │    │
│  │  - Trading desk, charts, order book, portfolio              │    │
│  │  - Company listings, leaderboard, chat                      │    │
│  │  - Paper trading mode / Live trading mode toggle            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │      BUSINESS PORTAL (React/Next.js - NEW)                  │    │
│  │  - Company application & KYC upload                         │    │
│  │  - Revenue report submission                                │    │
│  │  - Bank statement upload                                    │    │
│  │  - Dividend history view                                    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │        ADMIN DASHBOARD (Hybrid - both apps)                 │    │
│  │  - StockMart admin: Market control, circuit breakers        │    │
│  │  - Business admin: KYC review, revenue approval             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────┐      ┌───────────────────────────┐   │
│  │   STOCKMART BACKEND      │◄────►│  BUSINESS LOGIC BACKEND   │   │
│  │   (Rust - UNCHANGED)     │ REST │  (Node.js/TypeScript)     │   │
│  │                          │ API  │                           │   │
│  │  • Order matching        │      │  • Payment processing     │   │
│  │  • Price discovery       │      │  • KYC management        │   │
│  │  • WebSocket trading     │      │  • Revenue verification   │   │
│  │  • Portfolio tracking    │      │  • Dividend calculation   │   │
│  │  • Chat & leaderboard    │      │  • Bank API integration   │   │
│  │  • Paper/Live modes      │      │  • Compliance & audit     │   │
│  └──────────────────────────┘      └───────────────────────────┘   │
│              │                                   │                   │
│              └───────────────┬───────────────────┘                   │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              SHARED POSTGRESQL DATABASE                       │  │
│  │                                                               │  │
│  │  ┌─────────────────┐      ┌──────────────────────────────┐  │  │
│  │  │  StockMart      │      │  Business Logic Schemas      │  │  │
│  │  │  Schemas        │      │                              │  │  │
│  │  │  • users        │      │  • kyc_documents            │  │  │
│  │  │  • orders       │      │  • company_applications     │  │  │
│  │  │  • trades       │      │  • revenue_reports          │  │  │
│  │  │  • holdings     │      │  • dividends                │  │  │
│  │  │  • companies    │      │  • bank_webhooks            │  │  │
│  │  │  • wallets      │      │  • transactions             │  │  │
│  │  └─────────────────┘      └──────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 REDIS (Shared Cache)                          │  │
│  │  • User sessions (both apps)                                 │  │
│  │  • Leaderboard rankings                                      │  │
│  │  • Real-time market data                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              AWS S3 / MinIO (File Storage)                    │  │
│  │  • KYC documents (PDFs, images)                              │  │
│  │  • Bank statements                                           │  │
│  │  • Company photos                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  • Wave Money API                                                    │
│  • Orange Money API                                                  │
│  • Stripe API                                                        │
│  • Partner Bank Webhook (daily settlements)                          │
│  • SMS Gateway (OTP, notifications)                                  │
│  • Email Service (SendGrid / AWS SES)                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 DATA FLOW EXAMPLES

### Flow 1: User Deposits Money (Wave)

```
┌──────┐     1. Deposit    ┌────────────────┐    4. Sync wallet   ┌───────────┐
│ User │ ───────────────► │ Business Logic │ ──────────────────► │ StockMart │
└──────┘                   │    Backend     │                      │  Backend  │
   │                       └────────────────┘                      └───────────┘
   │                              │                                       │
   │                              │ 2. Wave API                           │
   │                              ▼                                       │
   │                       ┌────────────┐                                 │
   │                       │  Wave API  │                                 │
   │                       └────────────┘                                 │
   │                              │                                       │
   │                              │ 3. Webhook                            │
   │                              ▼                                       │
   │                       ┌────────────────┐                             │
   │                       │   PostgreSQL   │                             │
   │                       │  • transaction │ ◄────────────────────────────┘
   │                       │  • wallet      │      5. Update balance
   │                       └────────────────┘
   │                              │
   │ ◄────────────────────────────┘
        6. Notification
         "1,000 XOF credited"

STEP BY STEP:

1. User clicks "Deposit 1,000 XOF via Wave" in StockMart UI
   → Frontend calls: POST /api/business/wallet/deposit/wave
   
2. Business Logic Backend:
   → Creates Wave checkout session
   → Returns Wave payment URL
   → User redirected to Wave to complete payment
   
3. Wave confirms payment → sends webhook to:
   POST /api/business/webhooks/wave
   
4. Business Logic Backend:
   → Verifies webhook signature
   → Creates transaction record in PostgreSQL
   → Calls StockMart API: POST /api/stockmart/wallet/credit
     Body: { userId: "123", amount: 100000 } // in centimes
   
5. StockMart Backend:
   → Updates user's wallet balance
   → Emits WebSocket event: 'wallet:credited'
   
6. User sees notification in StockMart UI:
   "Your wallet has been credited with 1,000 XOF"
```

---

### Flow 2: Company Applies for IPO

```
┌─────────┐  1. Submit      ┌────────────────┐  5. Create company  ┌───────────┐
│ Company │ ─────────────► │ Business Logic │ ──────────────────► │ StockMart │
│ Manager │                 │    Backend     │                      │  Backend  │
└─────────┘                 └────────────────┘                      └───────────┘
    │                               │                                     │
    │                               │                                     │
    │                               ▼                                     │
    │                        ┌────────────┐                               │
    │                        │     S3     │                               │
    │                        │ (KYC docs) │                               │
    │                        └────────────┘                               │
    │                               │                                     │
    │                               │ 2. Store                            │
    │                               ▼                                     │
    │                        ┌────────────────┐                           │
    │                        │   PostgreSQL   │                           │
    │                        │ • applications │                           │
    │                        │ • kyc_docs     │                           │
    │                        └────────────────┘                           │
    │                               │                                     │
    │                               │ 3. Admin reviews                    │
    │ ┌──────┐                      │    (Business Portal)                │
    │ │Admin │ ────────────────────►│                                     │
    │ └──────┘   4. Approve          │                                     │
    │                               │                                     │
    │                               │                                     │
    │                               ▼                                     │
    │                        POST /api/stockmart/companies/create         │
    │                        {                                            │
    │                          symbol: "BEAN",                            │
    │                          name: "Bean Dreams",                       │
    │                          initial_price: 10000,                      │
    │                          shares: 5000,                             │
    │                          mode: "live"  // not "paper"              │
    │                        }                                            │
    │                                                                     │
    │                                                              Company listed!
    │ ◄──────────────────────────────────────────────────────────────────┘
         6. Notification: "Your company is now trading!"

STEP BY STEP:

1. Company Manager fills application form in Business Portal:
   → Business name, sector, bank account
   → Uploads: registration cert, manager ID, business photo
   → POST /api/business/companies/apply
   
2. Business Logic Backend:
   → Uploads files to S3
   → Stores application in PostgreSQL (status: PENDING)
   → Notifies admin via email
   
3. Admin opens Business Portal:
   → Reviews KYC documents (view from S3)
   → Checks bank account validity
   → Decides: Approve or Reject
   
4. Admin clicks "Approve" → Sets IPO parameters:
   → Initial valuation: 50,000 XOF
   → Total shares: 5,000
   → Price per share: 10 XOF (auto-calculated)
   → POST /api/business/companies/:id/approve
   
5. Business Logic Backend:
   → Updates application status to APPROVED
   → Calls StockMart API to create company:
     POST /api/stockmart/companies/create
     {
       "symbol": "BEAN",
       "name": "Bean Dreams Coffee Shop",
       "initial_price": 1000,  // 10.00 XOF in centimes
       "total_shares": 5000,
       "public_shares": 3500,  // 70%
       "founder_shares": 1500, // 30%
       "sector": "Food & Beverage",
       "mode": "live",
       "performance_pricing": true  // Use real revenue data
     }
   
6. StockMart Backend:
   → Creates company in database
   → Makes shares available for trading
   → Emits WebSocket event to all users
   → Company Manager sees success notification
```

---

### Flow 3: Monthly Revenue Report & Dividend

```
┌─────────┐  1. Submit       ┌────────────────┐   5. Calculate    ┌─────────────┐
│ Company │ ──────────────► │ Business Logic │ ────────────────► │  Economy    │
│ Manager │                  │    Backend     │                    │  Service    │
└─────────┘                  └────────────────┘                    └─────────────┘
                                     │                                    │
                                     │ 2. Store                           │
                                     ▼                                    │
                              ┌────────────┐                              │
                              │     S3     │                              │
                              │ (Bank stmt)│                              │
                              └────────────┘                              │
                                     │                                    │
                                     ▼                                    │
                              ┌────────────────┐                          │
                              │   PostgreSQL   │                          │
                              │ • revenue_rpt  │ ◄────────────────────────┘
                              │ • dividends    │        6. Store results
                              └────────────────┘
                                     │
                                     │ 3. Admin reviews
                         ┌──────┐   │    (Business Portal)
                         │Admin │───┘
                         └──────┘   4. Approve
                                     │
                                     │ 7. Distribute
                                     ▼
                              POST /api/stockmart/wallet/bulk-credit
                              [
                                { userId: "001", amount: 4200 },  // 42.00 XOF
                                { userId: "002", amount: 2100 },  // 21.00 XOF
                                ...
                              ]
                                     │
                                     ▼
                              ┌───────────┐
                              │ StockMart │
                              │  Backend  │ ────► Credit all shareholders
                              └───────────┘
                                     │
                                     ▼
                              Investors see: "Dividend received: 42 XOF from BEAN"

STEP BY STEP:

1. Company Manager submits monthly report (Business Portal):
   → Period: Jan 1 - Jan 31, 2026
   → Gross revenue: 1,250,000 XOF
   → Operating costs: 800,000 XOF
   → Net profit: 450,000 XOF
   → Upload bank statement PDF
   → POST /api/business/companies/:id/revenue-report
   
2. Business Logic Backend:
   → Uploads bank statement to S3
   → Stores report in PostgreSQL (status: PENDING)
   → If bank API is connected: auto-verifies against bank data
   → Notifies admin for review
   
3. Admin reviews report:
   → Views bank statement from S3
   → Checks if revenue matches bank deposits
   → If discrepancy > 5%: Request correction
   → If OK: Clicks "Approve"
   
4. Admin approves report:
   → PUT /api/business/reports/:id/approve
   
5. Business Logic Backend triggers dividend calculation:
   
   Calculate Dividend:
   ┌─────────────────────────────────────────────┐
   │ Gross Revenue:     1,250,000 XOF           │
   │ Platform Fee (5%):    -62,500 XOF          │
   │ Net Revenue:       1,187,500 XOF           │
   │                                             │
   │ Operating Costs:    -800,000 XOF           │
   │ Net Profit:          387,500 XOF           │
   │                                             │
   │ Dividend Pool (60%): 232,500 XOF           │
   │ Reinvestment (40%):  155,000 XOF           │
   │                                             │
   │ Total Public Shares: 3,500                 │
   │ Dividend per Share:  66.43 XOF             │
   └─────────────────────────────────────────────┘
   
6. Store dividend record in PostgreSQL:
   → dividend_id: "div_001"
   → company_id: "BEAN"
   → amount_per_share: 6643 (in centimes)
   → status: PENDING_DISTRIBUTION
   
7. Fetch all shareholders from StockMart:
   → GET /api/stockmart/companies/BEAN/shareholders
   → Returns: [
       { userId: "001", shares: 100 },
       { userId: "002", shares: 50 },
       ...
     ]
   
8. Calculate payouts & credit wallets:
   → For each shareholder:
     payout = shares × dividend_per_share
   
   → Bulk credit via StockMart API:
     POST /api/stockmart/wallet/bulk-credit
     [
       { userId: "001", amount: 6643, reference: "div_001" },  // 100 shares × 66.43 XOF
       { userId: "002", amount: 3321, reference: "div_001" },  // 50 shares × 66.43 XOF
       ...
     ]
   
9. StockMart Backend:
   → Updates all user wallets atomically
   → Emits WebSocket events to each user
   → Logs transactions
   
10. Investors see notification:
    → "You received 66.43 XOF dividend from Bean Dreams"
    → Portfolio shows dividend history
```

---

### Flow 4: Performance-Based Price Update (Weekly Cron)

```
┌─────────────┐   1. Trigger    ┌────────────────┐   3. Calculate   ┌──────────┐
│   Cron Job  │ ──────────────► │ Business Logic │ ──────────────► │ Economy  │
│ (Every Sun) │                  │    Backend     │                  │ Service  │
└─────────────┘                  └────────────────┘                  └──────────┘
                                        │                                  │
                                        │                                  │
                                        ▼                                  │
                                 ┌────────────────┐                        │
                                 │   PostgreSQL   │                        │
                                 │ • revenue_rpts │                        │
                                 │ • trades       │ ◄──────────────────────┘
                                 └────────────────┘      2. Fetch data
                                        │
                                        │ 4. Update fair value
                                        ▼
                                 PUT /api/stockmart/companies/:symbol/fair-value
                                 {
                                   "symbol": "BEAN",
                                   "fair_value": 11500,  // 115.00 XOF
                                   "performance_score": 0.15  // +15%
                                 }
                                        │
                                        ▼
                                 ┌───────────┐
                                 │ StockMart │
                                 │  Backend  │ ────► Update company.fair_value_estimate
                                 └───────────┘
                                        │
                                        ▼
                                 Traders see fair value update on chart

STEP BY STEP:

1. Cron job runs every Sunday at 2 AM:
   → Triggers: POST /api/business/economy/update-fair-values
   
2. Business Logic Backend fetches data for each company:
   → Last 3 months revenue reports
   → Last 30 days trading volume
   → Dividend payment consistency
   
3. Economy Service calculates performance score:
   
   For "Bean Dreams" (BEAN):
   ┌─────────────────────────────────────────────┐
   │ Revenue Growth:                             │
   │   Month 1: 800K XOF                        │
   │   Month 2: 1.0M XOF                        │
   │   Month 3: 1.25M XOF                       │
   │   Growth Rate: +56% over 3 months          │
   │   Score: 0.56 × 0.40 = 0.224               │
   │                                             │
   │ Profit Margin:                              │
   │   Avg: 387K / 1.25M = 31%                  │
   │   Score: 0.31 × 0.30 = 0.093               │
   │                                             │
   │ Trading Volume:                             │
   │   30-day volume: 150K XOF                  │
   │   Normalized: 0.75                         │
   │   Score: 0.75 × 0.20 = 0.15                │
   │                                             │
   │ Dividend Consistency:                       │
   │   Paid on time: Yes                        │
   │   Score: 1.0 × 0.10 = 0.10                 │
   │                                             │
   │ Total Performance Score: 0.567 (56.7%)     │
   └─────────────────────────────────────────────┘
   
   Current Fair Value: 10,000 XOF (100.00 XOF)
   New Fair Value: 10,000 × (1 + 0.567 × 0.5) = 12,835 XOF (128.35 XOF)
                                   ^
                   (Dampening factor: only 50% of performance score applied)
   
4. Business Logic Backend updates StockMart:
   → PUT /api/stockmart/companies/BEAN/fair-value
     {
       "fair_value": 12835,
       "performance_score": 0.567,
       "updated_at": "2026-02-23T02:00:00Z"
     }
   
5. StockMart Backend:
   → Updates company.fair_value_estimate
   → Does NOT change market price (that's still supply/demand)
   → Fair value is shown as reference line on chart
   
6. Traders see update in UI:
   → Chart shows dotted line at 128.35 XOF (fair value)
   → Current market price might be 115.00 XOF (undervalued!)
   → Tooltip: "Fair Value: 128.35 XOF (+15% from revenue growth)"
```

---

## 🔌 API CONTRACTS BETWEEN THE TWO APPS

### Business Logic → StockMart API

```typescript
// BASE URL: http://localhost:3000/api/stockmart

// ============================================
// USER & WALLET MANAGEMENT
// ============================================

// Create user in StockMart when they register in Business app
POST /api/stockmart/users/create
Body: {
  userId: string;          // UUID from Business app
  username: string;
  email: string;
  initialBalance: number;  // in centimes (100000 = 1,000 XOF)
}
Response: { success: true, user: { ... } }

// Credit user wallet (after payment confirmed)
POST /api/stockmart/wallet/credit
Body: {
  userId: string;
  amount: number;          // in centimes
  reference: string;       // transaction ID from Business app
  description: string;     // "Wave deposit" | "Dividend from BEAN"
}
Response: { success: true, newBalance: number }

// Bulk credit (for dividend distribution)
POST /api/stockmart/wallet/bulk-credit
Body: {
  credits: Array<{
    userId: string;
    amount: number;
    reference: string;
    description: string;
  }>
}
Response: { success: true, processed: number, failed: number }

// Get user balance
GET /api/stockmart/users/:userId/balance
Response: { 
  balance: number, 
  locked: number,  // funds locked in open orders
  available: number 
}

// ============================================
// COMPANY MANAGEMENT
// ============================================

// Create company after KYC approval
POST /api/stockmart/companies/create
Body: {
  companyId: string;       // UUID from Business app
  symbol: string;          // "BEAN"
  name: string;            // "Bean Dreams Coffee Shop"
  initialPrice: number;    // in centimes (1000 = 10.00 XOF)
  totalShares: number;     // 5000
  publicShares: number;    // 3500 (70%)
  founderShares: number;   // 1500 (30%)
  sector: string;
  description: string;
  city: string;
  country: string;
  mode: "live" | "paper";  // Enable live or paper trading mode
  performancePricing: boolean;  // true = use real revenue, false = random walk
}
Response: { success: true, company: { ... } }

// Update company fair value (weekly cron)
PUT /api/stockmart/companies/:symbol/fair-value
Body: {
  fairValue: number;       // in centimes
  performanceScore: number; // 0.567 = +56.7%
  updatedAt: string;       // ISO timestamp
}
Response: { success: true }

// Mark company as bankrupt (if business fails)
PUT /api/stockmart/companies/:symbol/status
Body: { status: "bankrupt" }
Response: { success: true }

// ============================================
// SHAREHOLDING QUERIES
// ============================================

// Get all shareholders for dividend distribution
GET /api/stockmart/companies/:symbol/shareholders
Response: {
  shareholders: Array<{
    userId: string;
    username: string;
    shares: number;
    avgBuyPrice: number;
  }>
}

// Get user's holdings
GET /api/stockmart/users/:userId/holdings
Response: {
  holdings: Array<{
    symbol: string;
    companyName: string;
    shares: number;
    avgBuyPrice: number;
    currentValue: number;
  }>,
  totalValue: number
}

// ============================================
// MARKET DATA
// ============================================

// Get current market price
GET /api/stockmart/companies/:symbol/price
Response: {
  symbol: string;
  currentPrice: number;    // Last trade price
  fairValue: number;       // From performance calculation
  change24h: number;
  change24hPct: number;
}

// Get trading volume
GET /api/stockmart/companies/:symbol/volume
Query: ?period=30d
Response: {
  volume: number,          // Total XOF traded
  trades: number,          // Number of trades
  avgTradeSize: number
}

// ============================================
// MODE MANAGEMENT
// ============================================

// Toggle between paper and live mode for a company
PUT /api/stockmart/companies/:symbol/mode
Body: { 
  mode: "live" | "paper",
  performancePricing: boolean  // Only matters in live mode
}
Response: { success: true, currentMode: "live" }

// Get current mode
GET /api/stockmart/companies/:symbol/mode
Response: { mode: "live" | "paper", performancePricing: boolean }
```

---

### StockMart → Business Logic API (Webhooks)

```typescript
// BASE URL: http://localhost:4000/api/business

// ============================================
// EVENT NOTIFICATIONS (StockMart sends these)
// ============================================

// User placed an order (for audit trail)
POST /api/business/webhooks/order-placed
Body: {
  userId: string;
  symbol: string;
  orderType: "buy" | "sell";
  orderKind: "market" | "limit";
  shares: number;
  price?: number;
  timestamp: string;
}

// Trade executed (for revenue tracking, platform fees)
POST /api/business/webhooks/trade-executed
Body: {
  tradeId: string;
  buyUserId: string;
  sellUserId: string;
  symbol: string;
  shares: number;
  price: number;
  platformFee: number;     // 0.5% of trade value
  timestamp: string;
}

// User withdrew funds (for payment processing)
POST /api/business/webhooks/withdrawal-requested
Body: {
  userId: string;
  amount: number;
  method: "wave" | "orange_money" | "bank_transfer";
  timestamp: string;
}

// Circuit breaker triggered (admin notification)
POST /api/business/webhooks/circuit-breaker
Body: {
  symbol: string;
  reason: string;          // "Price dropped 15% in 1 hour"
  priceChange: number;
  timestamp: string;
}
```

---

## 🗄️ SHARED POSTGRESQL SCHEMA

```sql
-- ============================================
-- STOCKMART TABLES (Unchanged)
-- ============================================

CREATE TABLE sm_users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  balance_centimes BIGINT NOT NULL DEFAULT 0,  -- in centimes
  locked_centimes BIGINT NOT NULL DEFAULT 0,   -- funds in open orders
  role VARCHAR(50) NOT NULL DEFAULT 'trader',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sm_companies (
  id UUID PRIMARY KEY,
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  current_price_centimes BIGINT NOT NULL,      -- Last trade price
  fair_value_centimes BIGINT,                  -- From performance calculation
  total_shares INT NOT NULL,
  public_shares INT NOT NULL,
  founder_shares INT NOT NULL,
  sector VARCHAR(100),
  mode VARCHAR(10) NOT NULL DEFAULT 'paper',   -- 'paper' | 'live'
  performance_pricing BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sm_orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES sm_users(id),
  company_id UUID REFERENCES sm_companies(id),
  order_type VARCHAR(10) NOT NULL,  -- 'buy' | 'sell'
  order_kind VARCHAR(10) NOT NULL,  -- 'market' | 'limit'
  shares INT NOT NULL,
  price_centimes BIGINT,
  filled_shares INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sm_trades (
  id UUID PRIMARY KEY,
  buy_order_id UUID REFERENCES sm_orders(id),
  sell_order_id UUID REFERENCES sm_orders(id),
  company_id UUID REFERENCES sm_companies(id),
  shares INT NOT NULL,
  price_centimes BIGINT NOT NULL,
  platform_fee_centimes BIGINT NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sm_holdings (
  user_id UUID REFERENCES sm_users(id),
  company_id UUID REFERENCES sm_companies(id),
  shares INT NOT NULL,
  avg_buy_price_centimes BIGINT NOT NULL,
  PRIMARY KEY (user_id, company_id)
);

-- ============================================
-- BUSINESS LOGIC TABLES (New)
-- ============================================

CREATE TABLE bl_company_applications (
  id UUID PRIMARY KEY,
  manager_name VARCHAR(255) NOT NULL,
  manager_email VARCHAR(255) NOT NULL,
  manager_phone VARCHAR(50) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) NOT NULL,
  sector VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  bank_account VARCHAR(100) NOT NULL,
  desired_valuation BIGINT NOT NULL,       -- in centimes
  desired_total_shares INT NOT NULL,
  dividend_ratio DECIMAL(3,2) NOT NULL,    -- 0.60 = 60%
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID,
  review_notes TEXT
);

CREATE TABLE bl_kyc_documents (
  id UUID PRIMARY KEY,
  application_id UUID REFERENCES bl_company_applications(id),
  document_type VARCHAR(50) NOT NULL,  -- 'registration' | 'manager_id' | 'business_photo'
  file_url TEXT NOT NULL,              -- S3 URL
  file_size INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bl_revenue_reports (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,            -- References sm_companies(id)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_revenue BIGINT NOT NULL,       -- in centimes
  operating_costs BIGINT NOT NULL,     -- in centimes
  net_profit BIGINT NOT NULL,          -- auto-calculated
  platform_fee BIGINT NOT NULL,        -- 5% of gross
  bank_statement_url TEXT,             -- S3 URL
  bank_verified BOOLEAN DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID
);

CREATE TABLE bl_dividends (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  report_id UUID REFERENCES bl_revenue_reports(id),
  dividend_pool BIGINT NOT NULL,       -- in centimes
  dividend_per_share BIGINT NOT NULL,  -- in centimes
  total_shareholders INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  distributed_at TIMESTAMP
);

CREATE TABLE bl_dividend_payouts (
  id UUID PRIMARY KEY,
  dividend_id UUID REFERENCES bl_dividends(id),
  user_id UUID REFERENCES sm_users(id),
  shares_held INT NOT NULL,
  amount BIGINT NOT NULL,              -- in centimes
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bl_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES sm_users(id),
  type VARCHAR(50) NOT NULL,           -- 'deposit' | 'withdrawal' | 'dividend'
  amount BIGINT NOT NULL,              -- in centimes
  method VARCHAR(50),                  -- 'wave' | 'orange_money' | 'stripe'
  external_reference VARCHAR(255),     -- Payment provider transaction ID
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE bl_bank_webhooks (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  settlement_date DATE NOT NULL,
  gross_turnover BIGINT NOT NULL,      -- in centimes
  transaction_count INT NOT NULL,
  payload JSONB NOT NULL,              -- Full webhook payload
  verified BOOLEAN DEFAULT true,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_sm_orders_user ON sm_orders(user_id);
CREATE INDEX idx_sm_orders_company ON sm_orders(company_id);
CREATE INDEX idx_sm_orders_status ON sm_orders(status);
CREATE INDEX idx_sm_trades_executed ON sm_trades(executed_at);
CREATE INDEX idx_bl_applications_status ON bl_company_applications(status);
CREATE INDEX idx_bl_reports_company ON bl_revenue_reports(company_id);
CREATE INDEX idx_bl_reports_status ON bl_revenue_reports(status);
CREATE INDEX idx_bl_dividends_status ON bl_dividends(status);
CREATE INDEX idx_bl_transactions_user ON bl_transactions(user_id);
```

---

## 🔄 LIVE MODE vs PAPER MODE

### Feature Comparison

| Feature | Paper Mode (Simulation) | Live Mode (Real Money) |
|---------|-------------------------|------------------------|
| **User Balance** | Virtual (resets on game init) | Real money from deposits |
| **Stock Pricing** | Random walk simulation | Order book + performance-based fair value |
| **Dividends** | Simulated (no real payout) | Real XOF credited to wallet |
| **KYC** | Not required | Required for deposits/withdrawals |
| **Company Listing** | Admin creates instantly | KYC approval required |
| **Revenue Reports** | Not applicable | Required monthly |
| **Bank Integration** | Not applicable | Daily turnover webhooks |
| **Withdrawals** | Not applicable | Wave/Orange Money/Bank transfer |
| **Platform Fees** | Simulated | Real fees collected |

### Toggle Implementation

```typescript
// In StockMart Backend - add mode field to companies

class Company {
  mode: 'paper' | 'live';
  performancePricing: boolean;
  
  getPriceChange(): number {
    if (this.mode === 'paper') {
      // Random walk based on volatility
      return this.generateRandomChange();
    } else {
      // Live mode:
      if (this.performancePricing) {
        // Fair value already set by Business Logic app
        // Market price = order book (supply/demand)
        return 0; // No artificial price changes
      } else {
        // Hybrid: order book for price, but no fair value overlay
        return 0;
      }
    }
  }
}

// Example: Enable live mode for approved company
PUT /api/stockmart/companies/BEAN/mode
Body: { 
  mode: "live", 
  performancePricing: true 
}

// Frontend displays:
if (company.mode === 'live') {
  <Badge color="green">LIVE</Badge>
  <Text>Real money, performance-based pricing</Text>
} else {
  <Badge color="blue">PAPER</Badge>
  <Text>Simulation mode, practice trading</Text>
}
```

### Use Cases for Dual Modes

**Paper Mode:**
- New users practice before depositing real money
- Trading competitions with virtual prizes
- Educational sessions for students
- A/B testing new features without risk

**Live Mode:**
- Real investment platform
- Companies raise actual capital
- Investors earn real dividends
- Platform earns fees from trades and revenue

**User Experience:**
```
User Dashboard:
┌─────────────────────────────────────┐
│  Your Accounts                      │
├─────────────────────────────────────┤
│  📊 PAPER TRADING                   │
│     Balance: 50,000 XOF (virtual)   │
│     Holdings: 3 companies           │
│     [Switch to Paper Trading] ─────►│
│                                     │
│  💰 LIVE TRADING                    │
│     Balance: 15,420 XOF (real)      │
│     Holdings: 2 companies           │
│     [Switch to Live Trading] ──────►│
└─────────────────────────────────────┘

Companies can be in both modes:
- Bean Dreams (LIVE) - real revenue, real dividends
- Test Corp (PAPER) - for practice
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
┌────────────────────────────────────────────────────────────┐
│                   PRODUCTION SERVER (VPS)                   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │               Nginx (Reverse Proxy)                   │ │
│  │           Port 80 (HTTP) / 443 (HTTPS)                │ │
│  └──────────────────────────────────────────────────────┘ │
│            │                          │                     │
│            ▼                          ▼                     │
│  ┌──────────────────┐      ┌──────────────────────────┐   │
│  │  StockMart       │      │  Business Logic          │   │
│  │  Frontend        │      │  Portal (Next.js)        │   │
│  │  (Static Files)  │      │  Port 4001               │   │
│  │  /var/www/sm     │      │  /var/www/portal         │   │
│  └──────────────────┘      └──────────────────────────┘   │
│            │                                                │
│            │ (WebSocket + API calls)                       │
│            ▼                                                │
│  ┌──────────────────┐      ┌──────────────────────────┐   │
│  │  StockMart       │◄────►│  Business Logic          │   │
│  │  Backend (Rust)  │ REST │  Backend (Node.js)       │   │
│  │  Port 3000       │ API  │  Port 4000               │   │
│  └──────────────────┘      └──────────────────────────┘   │
│            │                          │                     │
│            └────────────┬─────────────┘                     │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │            PostgreSQL Database (Port 5432)            │ │
│  │  • sm_* tables (StockMart)                           │ │
│  │  • bl_* tables (Business Logic)                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │               Redis (Port 6379)                       │ │
│  │  • Session storage                                    │ │
│  │  • Leaderboard cache                                 │ │
│  │  • Real-time market data                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                          │
│  • AWS S3 / MinIO (KYC docs)                               │
│  • Wave API                                                 │
│  • Orange Money API                                         │
│  • Stripe API                                               │
│  • Bank Webhook (incoming)                                  │
└────────────────────────────────────────────────────────────┘
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/trading-platform

upstream stockmart_backend {
  server localhost:3000;
}

upstream business_backend {
  server localhost:4000;
}

# Main trading platform
server {
  listen 80;
  server_name trade.yourplatform.com;
  
  # StockMart Frontend
  location / {
    root /var/www/stockmart/frontend/dist;
    try_files $uri /index.html;
  }
  
  # StockMart Backend (WebSocket + API)
  location /ws {
    proxy_pass http://stockmart_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
  
  location /api/stockmart {
    proxy_pass http://stockmart_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
  
  # Business Logic Backend
  location /api/business {
    proxy_pass http://business_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}

# Business Portal (for company managers)
server {
  listen 80;
  server_name business.yourplatform.com;
  
  location / {
    proxy_pass http://localhost:4001;  # Next.js portal
    proxy_set_header Host $host;
  }
}
```

---

## 📅 IMPLEMENTATION TIMELINE

### Week 1-2: Setup & Architecture
- [ ] Set up two separate repos:
  - `stockmart` (clone existing, minimal changes)
  - `business-logic-backend` (new Node.js/TypeScript)
- [ ] Set up shared PostgreSQL database
- [ ] Define API contracts (OpenAPI spec)
- [ ] Create database migration scripts
- [ ] Set up Redis for shared cache

### Week 3-4: StockMart Modifications
- [ ] Add PostgreSQL adapter (replace JSON files)
- [ ] Add API endpoints for Business Logic app to call
- [ ] Add `mode` field to companies (paper/live toggle)
- [ ] Add `performancePricing` flag
- [ ] Implement webhook endpoints to notify Business app
- [ ] Test with sample data

### Week 5-6: Business Logic Backend - Core
- [ ] Set up Node.js/Express/TypeScript project
- [ ] Implement user registration & auth
- [ ] Sync user creation with StockMart
- [ ] Implement wallet credit API (call StockMart)

### Week 7-8: Payment Integrations
- [ ] Wave Money deposit + webhook
- [ ] Orange Money deposit + webhook
- [ ] Stripe card deposit + webhook
- [ ] Withdrawal processing
- [ ] Transaction logging

### Week 9-10: Company KYC System
- [ ] Company application form API
- [ ] S3/MinIO file upload integration
- [ ] Admin review workflow
- [ ] Sync approved companies to StockMart
- [ ] IPO parameter setting

### Week 11-12: Revenue & Dividends
- [ ] Revenue report submission
- [ ] Bank webhook integration (or statement upload)
- [ ] Dividend calculation service
- [ ] Shareholder query from StockMart
- [ ] Bulk wallet credit for dividends

### Week 13-14: Economy Engine
- [ ] Performance score calculation
- [ ] Fair value update cron job (weekly)
- [ ] Company revenue tracking
- [ ] Platform fee collection

### Week 15-16: Frontend Portals
- [ ] Business Portal (Next.js):
  - Company application form
  - Revenue report submission
  - Dividend history
- [ ] Admin Dashboard enhancements:
  - KYC review UI
  - Revenue report approval
  - Dividend distribution trigger

### Week 17-18: Testing & Polish
- [ ] End-to-end testing (deposit → trade → dividend → withdraw)
- [ ] Load testing (simulate 100+ users)
- [ ] Security audit
- [ ] Documentation
- [ ] Deployment scripts

### Week 19-20: Pilot Launch
- [ ] Deploy to production VPS
- [ ] Onboard 1-2 pilot companies
- [ ] Invite 20-50 beta investors
- [ ] Monitor and fix issues
- [ ] Collect feedback

**Total Timeline: ~5 months** (20 weeks with 1-2 developers)

---

## 💰 COST BREAKDOWN

### Development Costs
| Resource | Duration | Rate | Cost |
|----------|----------|------|------|
| Full-stack developer | 20 weeks | $2,000/week | $40,000 |
| UI/UX designer | 4 weeks | $1,500/week | $6,000 |
| DevOps engineer | 2 weeks | $2,500/week | $5,000 |
| **Total Development** | | | **$51,000** |

### Infrastructure Costs (Monthly)
| Service | Cost |
|---------|------|
| VPS (Hetzner 8GB) | $9/month |
| PostgreSQL managed (DigitalOcean) | $15/month |
| S3 storage (100GB) | $5/month |
| Domain + SSL | $2/month |
| Email service (SendGrid) | $15/month |
| SMS gateway (Twilio) | $20/month |
| Monitoring (Datadog) | $15/month |
| **Total Monthly** | **$81/month** |

### Payment Provider Fees
- Wave: ~2.5% per transaction
- Orange Money: ~2.9% per transaction
- Stripe: 2.9% + $0.30 per transaction
- Bank transfer: Varies by partner bank

### First Year Total
- Development: $51,000 (one-time)
- Infrastructure: $81 × 12 = $972/year
- **Total Year 1: ~$52,000**

**Subsequent years: $972/year infrastructure only**

---

## ✅ KEY ADVANTAGES OF THIS APPROACH

1. **Proven Trading Engine**: StockMart is battle-tested, handles 100+ users
2. **Clear Separation**: Business logic isolated from trading logic
3. **Tech Stack Flexibility**: Use Node.js/Python for business app (easier to hire)
4. **Dual Mode**: Paper trading for engagement, live for real money
5. **Incremental Development**: Build and test features independently
6. **Easy Maintenance**: Each app can be updated without breaking the other
7. **Scalability**: Can scale trading engine and business logic separately

---

## ⚠️ RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| **StockMart API changes** | High | Fork StockMart, control your own version |
| **Database sync issues** | High | Use transactions, implement retry logic |
| **Payment webhook failures** | Critical | Implement idempotency keys, manual reconciliation |
| **Performance bottleneck** | Medium | Load test early, optimize queries, add caching |
| **Security vulnerabilities** | Critical | Regular security audits, penetration testing |
| **Regulatory compliance** | Critical | Consult lawyers, implement KYC/AML from day 1 |

---

## 🎯 SUCCESS METRICS

### Month 1-3 (Pilot)
- 2 companies listed
- 50 investors onboarded
- 500+ trades executed
- 2+ dividend distributions successful
- Zero payment processing errors

### Month 4-6 (Growth)
- 10 companies listed
- 500 investors
- 10,000+ trades
- $100,000+ total platform volume
- 95%+ uptime

### Year 1 (Scale)
- 50 companies listed
- 5,000 investors
- $5M+ platform volume
- Platform profitable (fees > costs)

---

*End of Architecture Document*

---

## 📞 NEXT STEPS

**Immediate Actions:**
1. ✅ Review this architecture with your team
2. ✅ Decide on tech stack for Business Logic app (Node.js recommended)
3. ✅ Set up development environment
4. ✅ Clone StockMart and test locally
5. ✅ Create API contract document (OpenAPI spec)
6. ✅ Set up shared PostgreSQL database
7. ✅ Start Week 1 tasks

**Questions to Answer:**
- Who will be your lead developer?
- Do you have a designer or will you use StockMart UI as-is?
- Which payment providers will you start with? (Wave + Orange Money recommended)
- Do you have a partner bank identified for turnover webhooks?
- What's your target launch date?

Let me know when you're ready to start building! I can provide:
- Detailed API specification (OpenAPI)
- Database migration scripts
- Payment integration code examples
- Deployment automation scripts
- Testing strategy document

Your hybrid approach is **smart and practical** — you get the best of both worlds!
