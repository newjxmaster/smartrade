# SMARTRADE LIVE TRADING - BUILD SPECIFICATION
## Add Real-Money Layer to Your Existing Simulation Platform

---

## 🎯 PROJECT OVERVIEW

**Repository:** https://github.com/newjxmaster/smartrade  
**Current State:** Fully functional simulation platform (based on StockMart) ✅  
**Branch:** `real-bid-rust`  
**Platform Name:** SmarTrade

**What You Have (WORKING):**
- ✅ Rust backend with order matching engine (1000+ orders/sec)
- ✅ Real-time WebSocket trading (Tokio + Axum)
- ✅ React 19 frontend with TradingView Lightweight Charts
- ✅ Portfolio tracking, leaderboard, chat
- ✅ Admin dashboard (market control, user management)
- ✅ 463 backend tests + 136 E2E tests
- ✅ JSON file persistence (`backend/data/` folder)
- ✅ Docker deployment ready

**What You're Building:**
A **separate Node.js backend** that adds real-money capabilities:
- 💳 Payment integrations (Wave, Orange Money, Stripe)
- 📄 Company KYC document upload system (S3)
- 📊 Revenue report submission + admin review
- 💰 Dividend calculation and distribution
- 🏦 Bank API webhook for turnover verification
- 🗄️ PostgreSQL database (shared with Rust backend)
- 📈 Performance-based stock pricing (replace random volatility)

---

## 📁 YOUR CURRENT PROJECT STRUCTURE

```
smartrade/
├── backend/              ← Your Rust simulation backend (KEEP UNCHANGED)
│   ├── src/
│   │   ├── services/
│   │   │   ├── market/      # Price updates, volatility
│   │   │   ├── matching/    # Order matching engine
│   │   │   ├── auth/        # User authentication
│   │   │   └── chat/        # Real-time chat
│   │   ├── domain/
│   │   └── main.rs
│   ├── data/             ← JSON files (will migrate to PostgreSQL)
│   │   ├── users.json
│   │   ├── companies.json
│   │   ├── orders.json
│   │   ├── trades.json
│   │   └── config.json
│   ├── tests/            ← 463 tests (keep intact)
│   └── Cargo.toml
│
├── frontend/             ← Your React frontend (EXTEND, don't replace)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Trader/      # Trading desk
│   │   │   └── Admin/       # Admin dashboard
│   │   ├── components/
│   │   └── App.tsx
│   ├── tests/            ← 136 E2E tests
│   └── package.json
│
├── docs/                 ← Documentation & screenshots
├── PROMPTS/              ← Your prompt folder
├── docker-compose.yml
├── vps-deploy.sh
└── README.md

NEW STRUCTURE TO ADD:
├── live-backend/         ← NEW: Node.js backend for live trading
│   ├── src/
│   │   ├── services/
│   │   │   ├── payments/      # Wave, Orange Money, Stripe
│   │   │   ├── kyc/           # S3 document uploads
│   │   │   ├── revenue/       # Reports & dividends
│   │   │   ├── database/      # PostgreSQL Prisma
│   │   │   └── rust-sync/     # API calls to Rust backend
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
└── postgres/             ← NEW: PostgreSQL setup
    └── init.sql
```

---

## 🔧 WHAT TO MODIFY IN EXISTING CODE

### 1. Rust Backend: Disable Random Price Updates

**File:** `backend/src/services/market/market_service.rs`

```rust
// FIND THIS FUNCTION (around line 45):
pub fn update_prices(&mut self) {
    for company in &mut self.companies {
        // COMMENT OUT RANDOM VOLATILITY:
        // let change = self.generate_random_change(company);
        // company.current_price *= (1.0 + change);
        
        // Prices now ONLY change via order matching
    }
}
```

**Why:** Random price changes are unrealistic. In live mode, prices should only change when real trades happen (supply/demand) or when performance data updates the fair value estimate.

---

### 2. Rust Backend: Add PostgreSQL Support

**File:** `backend/Cargo.toml`

```toml
[dependencies]
# ... existing dependencies ...
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-rustls", "json"] }
tokio-postgres = "0.7"
```

**New File:** `backend/src/database/postgres.rs`

```rust
use sqlx::{ PgPool, Pool, Postgres };

pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = PgPool::connect(database_url).await?;
        Ok(Database { pool })
    }
    
    // Methods to read/write users, companies, orders, trades
    // This replaces the JSON file storage in backend/data/
}
```

---

### 3. Frontend: Add Live Trading Toggle

**File:** `frontend/src/pages/Login.tsx`

```typescript
// ADD MODE SELECTOR AFTER LOGIN FORM:

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'simulation' | 'live'>('simulation');

  return (
    <div className="login-container">
      <h1>Welcome to SmarTrade</h1>
      
      {/* EXISTING LOGIN FIELDS */}
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      
      {/* NEW: MODE SELECTOR */}
      <div className="mode-selector">
        <h3>Select Trading Mode:</h3>
        <label>
          <input 
            type="radio" 
            value="simulation" 
            checked={mode === 'simulation'}
            onChange={() => setMode('simulation')}
          />
          📊 Simulation Mode (Practice with virtual money)
        </label>
        <label>
          <input 
            type="radio" 
            value="live" 
            checked={mode === 'live'}
            onChange={() => setMode('live')}
          />
          💰 Live Trading (Real money, real profits)
        </label>
      </div>
      
      <button onClick={() => handleLogin(email, password, mode)}>
        Login
      </button>
    </div>
  );
}
```

**File:** `frontend/src/components/ModeIndicator.tsx` (NEW)

```typescript
// Show current mode at all times in the header

export function ModeIndicator() {
  const { mode, balance } = useUser();

  return (
    <div className={`mode-badge ${mode}`}>
      {mode === 'simulation' ? (
        <>
          <span className="icon">📊</span>
          <span>SIMULATION</span>
          <span className="balance">Virtual: {formatXOF(balance)}</span>
        </>
      ) : (
        <>
          <span className="icon">💰</span>
          <span>LIVE TRADING</span>
          <span className="balance">Real: {formatXOF(balance)}</span>
          <button onClick={() => setMode('simulation')}>Switch to Simulation</button>
        </>
      )}
    </div>
  );
}
```

---

## 🗄️ POSTGRESQL DATABASE SCHEMA

**File:** `postgres/init.sql`

```sql
-- ============================================
-- SHARED TABLES (Both Rust and Node.js access)
-- ============================================

-- Users table (replaces backend/data/users.json)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  current_mode VARCHAR(20) DEFAULT 'simulation', -- 'simulation' | 'live'
  simulation_balance_centimes BIGINT DEFAULT 10000000, -- 100,000 XOF
  live_balance_centimes BIGINT DEFAULT 0,
  kyc_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'verified' | 'rejected'
  role VARCHAR(20) DEFAULT 'trader', -- 'trader' | 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table (replaces backend/data/companies.json)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  current_price_centimes BIGINT NOT NULL,
  fair_value_centimes BIGINT, -- From performance calculation
  total_shares INT NOT NULL,
  public_shares INT NOT NULL,
  founder_shares INT NOT NULL,
  sector VARCHAR(100),
  mode VARCHAR(20) DEFAULT 'simulation', -- 'simulation' | 'live'
  pricing_strategy VARCHAR(30) DEFAULT 'random_walk', -- 'random_walk' | 'order_book_only' | 'performance_based'
  volatility VARCHAR(10) DEFAULT 'medium', -- 'low' | 'medium' | 'high' (for simulation mode)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (replaces backend/data/orders.json)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  order_type VARCHAR(10) NOT NULL, -- 'buy' | 'sell'
  order_kind VARCHAR(10) NOT NULL, -- 'market' | 'limit'
  shares INT NOT NULL,
  price_centimes BIGINT,
  filled_shares INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open', -- 'open' | 'partially_filled' | 'filled' | 'cancelled'
  mode VARCHAR(20) NOT NULL, -- CRITICAL: 'simulation' | 'live'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trades table (replaces backend/data/trades.json)
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_order_id UUID REFERENCES orders(id),
  sell_order_id UUID REFERENCES orders(id),
  company_id UUID REFERENCES companies(id),
  shares INT NOT NULL,
  price_centimes BIGINT NOT NULL,
  platform_fee_centimes BIGINT NOT NULL,
  mode VARCHAR(20) NOT NULL, -- CRITICAL: 'simulation' | 'live'
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Holdings table
CREATE TABLE holdings (
  user_id UUID REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  shares INT NOT NULL,
  avg_buy_price_centimes BIGINT NOT NULL,
  mode VARCHAR(20) NOT NULL, -- CRITICAL: 'simulation' | 'live'
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, company_id, mode)
);

-- ============================================
-- LIVE TRADING TABLES (Node.js backend only)
-- ============================================

-- Company IPO applications
CREATE TABLE company_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  desired_valuation BIGINT NOT NULL, -- in centimes
  desired_total_shares INT NOT NULL,
  dividend_ratio DECIMAL(3,2) NOT NULL DEFAULT 0.60, -- 60%
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT
);

-- KYC documents (3 required docs)
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES company_applications(id),
  document_type VARCHAR(50) NOT NULL, -- 'registration' | 'manager_id' | 'business_photo'
  file_url TEXT NOT NULL, -- S3 URL
  file_size INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Revenue reports
CREATE TABLE revenue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_revenue BIGINT NOT NULL, -- in centimes
  operating_costs BIGINT NOT NULL, -- in centimes
  net_profit BIGINT NOT NULL, -- auto-calculated
  platform_fee BIGINT NOT NULL, -- 5% of gross
  bank_statement_url TEXT, -- S3 URL
  bank_verified BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id)
);

-- Dividends
CREATE TABLE dividends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  report_id UUID REFERENCES revenue_reports(id),
  dividend_pool BIGINT NOT NULL, -- in centimes
  dividend_per_share BIGINT NOT NULL, -- in centimes
  total_shareholders INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'distributed'
  distributed_at TIMESTAMP
);

-- Dividend payouts (individual shareholder payments)
CREATE TABLE dividend_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dividend_id UUID REFERENCES dividends(id),
  user_id UUID REFERENCES users(id),
  shares_held INT NOT NULL,
  amount BIGINT NOT NULL, -- in centimes
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (payments, withdrawals, dividends)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'deposit' | 'withdrawal' | 'dividend' | 'platform_fee'
  amount BIGINT NOT NULL, -- in centimes
  method VARCHAR(50), -- 'wave' | 'orange_money' | 'stripe' | 'bank_transfer'
  external_reference VARCHAR(255), -- Payment provider transaction ID
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  mode VARCHAR(20) NOT NULL, -- 'simulation' | 'live'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Bank webhooks (daily turnover verification)
CREATE TABLE bank_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  settlement_date DATE NOT NULL,
  gross_turnover BIGINT NOT NULL, -- in centimes
  transaction_count INT NOT NULL,
  payload JSONB NOT NULL, -- Full webhook payload
  verified BOOLEAN DEFAULT true,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_company ON orders(company_id);
CREATE INDEX idx_orders_mode ON orders(mode);
CREATE INDEX idx_trades_executed ON trades(executed_at);
CREATE INDEX idx_holdings_mode ON holdings(mode);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_applications_status ON company_applications(status);
CREATE INDEX idx_reports_company ON revenue_reports(company_id);
```

---

## 🔌 API ARCHITECTURE: RUST ↔️ NODE.JS

### Communication Flow

```
┌────────────────────────────────────────────────────────┐
│                  FRONTEND (React)                       │
│  • Trading UI                                          │
│  • Admin dashboard                                     │
│  • Mode selector (simulation / live)                  │
└────────────────────────────────────────────────────────┘
           │                           │
           │ (WebSocket)               │ (HTTP REST)
           ▼                           ▼
┌──────────────────────┐    ┌─────────────────────────┐
│  RUST BACKEND        │◄──►│  NODE.JS BACKEND        │
│  (Port 3000)         │REST│  (Port 4000)            │
│                      │API │                         │
│  • Order matching    │    │  • Payments (Wave, OM)  │
│  • WebSocket trading │    │  • KYC (S3 uploads)     │
│  • Portfolio calc    │    │  • Revenue reports      │
│  • Chat, leaderboard │    │  • Dividend calc        │
│  • Market control    │    │  • Bank webhooks        │
└──────────────────────┘    └─────────────────────────┘
           │                           │
           └───────────┬───────────────┘
                       ▼
           ┌───────────────────────────┐
           │  POSTGRESQL DATABASE       │
           │  (Shared by both backends) │
           └───────────────────────────┘
```

### REST API Contracts

**Node.js → Rust Backend:**

```typescript
// Credit user wallet after payment confirmed
POST http://localhost:3000/api/rust/wallet/credit
{
  userId: "uuid",
  amount: 100000, // in centimes (1,000 XOF)
  mode: "live",
  reference: "wave_txn_123"
}

// Create company after KYC approved
POST http://localhost:3000/api/rust/companies/create
{
  symbol: "BEAN",
  name: "Bean Dreams Coffee",
  initialPrice: 1000, // 10.00 XOF
  totalShares: 5000,
  mode: "live",
  pricingStrategy: "order_book_only"
}

// Update fair value (weekly cron)
PUT http://localhost:3000/api/rust/companies/BEAN/fair-value
{
  fairValue: 1200, // 12.00 XOF
  performanceScore: 0.15
}

// Get shareholders for dividend distribution
GET http://localhost:3000/api/rust/companies/BEAN/shareholders?mode=live
// Returns: [{userId, shares}, ...]
```

---

## 💳 PAYMENT INTEGRATIONS (Node.js Backend)

### Wave Money

**File:** `live-backend/src/services/payments/wave.ts`

```typescript
import crypto from 'crypto';
import fetch from 'node-fetch';

export class WavePaymentService {
  private apiKey: string;
  private webhookSecret: string;

  async initiateDeposit(userId: string, amountXOF: number): Promise<string> {
    // 1. Create Wave checkout
    const response = await fetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: (amountXOF * 100).toString(), // Convert to centimes
        currency: 'XOF',
        success_url: `${process.env.BASE_URL}/payment/success?user=${userId}`,
        error_url: `${process.env.BASE_URL}/payment/error`,
        client_reference: userId
      })
    });

    const data = await response.json();

    // 2. Store pending transaction in PostgreSQL
    await prisma.transactions.create({
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

    // 3. Return checkout URL
    return data.wave_launch_url;
  }

  async handleWebhook(payload: string, signature: string): Promise<void> {
    // 1. Verify signature
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid webhook signature');
    }

    // 2. Parse data
    const data = JSON.parse(payload);

    if (data.checkout_status === 'complete') {
      const userId = data.client_reference;
      const amountCentimes = parseInt(data.amount);

      // 3. Call Rust backend to credit wallet
      await fetch('http://localhost:3000/api/rust/wallet/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: amountCentimes,
          mode: 'live',
          reference: `wave_${data.id}`
        })
      });

      // 4. Update transaction status
      await prisma.transactions.updateMany({
        where: {
          userId,
          externalReference: data.id,
          status: 'pending'
        },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });
    }
  }
}
```

### Orange Money

```typescript
// Similar structure to Wave
// Docs: Orange Developer Platform
```

### Stripe

```typescript
import Stripe from 'stripe';

export class StripePaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  async initiateDeposit(userId: string, amountXOF: number): Promise<string> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountXOF * 100, // Stripe expects centimes
      currency: 'xof', // Stripe supports XOF
      metadata: { userId, type: 'wallet_deposit' }
    });

    await prisma.transactions.create({
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

    return paymentIntent.client_secret!;
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const userId = paymentIntent.metadata.userId;

      // Credit wallet via Rust backend
      await fetch('http://localhost:3000/api/rust/wallet/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: paymentIntent.amount,
          mode: 'live',
          reference: `stripe_${paymentIntent.id}`
        })
      });

      // Update transaction
      await prisma.transactions.updateMany({
        where: {
          externalReference: paymentIntent.id,
          status: 'pending'
        },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });
    }
  }
}
```

---

## 📄 KYC SYSTEM (Node.js Backend)

**File:** `live-backend/src/services/kyc/s3.ts`

```typescript
import AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';

export class KYCService {
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
    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type');
    }

    // Upload to S3
    const key = `kyc/${applicationId}/${documentType}_${uuid()}.${file.originalname.split('.').pop()}`;

    await this.s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private'
    }).promise();

    // Store in database
    await prisma.kycDocuments.create({
      data: {
        applicationId,
        documentType,
        fileUrl: key,
        fileSize: file.size,
        status: 'pending'
      }
    });

    return key;
  }

  async getPresignedUrl(fileKey: string): Promise<string> {
    return this.s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: fileKey,
      Expires: 900 // 15 minutes
    });
  }
}
```

---

## 💰 DIVIDEND CALCULATION (Node.js Backend)

**File:** `live-backend/src/services/revenue/dividends.ts`

```typescript
export class DividendService {
  async calculateAndDistribute(reportId: string): Promise<void> {
    // 1. Get approved revenue report
    const report = await prisma.revenueReports.findUnique({
      where: { id: reportId },
      include: { company: true }
    });

    if (report.status !== 'approved') {
      throw new Error('Report not approved');
    }

    // 2. Calculate dividend pool
    const platformFee = Math.floor(report.grossRevenue * 0.05); // 5%
    const netProfit = report.grossRevenue - report.operatingCosts - platformFee;
    const dividendPool = Math.floor(netProfit * report.company.dividendRatio); // e.g., 60%

    // 3. Get shareholders from Rust backend
    const shareholdersResponse = await fetch(
      `http://localhost:3000/api/rust/companies/${report.company.symbol}/shareholders?mode=live`
    );
    const shareholders = await shareholdersResponse.json();

    // 4. Calculate per-share dividend
    const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
    const dividendPerShare = Math.floor(dividendPool / totalShares);

    // 5. Create dividend record
    const dividend = await prisma.dividends.create({
      data: {
        companyId: report.companyId,
        reportId: report.id,
        dividendPool,
        dividendPerShare,
        totalShareholders: shareholders.length,
        status: 'pending'
      }
    });

    // 6. Distribute to shareholders
    for (const shareholder of shareholders) {
      const payoutAmount = shareholder.shares * dividendPerShare;

      // Credit wallet via Rust backend
      await fetch('http://localhost:3000/api/rust/wallet/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: shareholder.userId,
          amount: payoutAmount,
          mode: 'live',
          reference: `dividend_${dividend.id}`
        })
      });

      // Record payout
      await prisma.dividendPayouts.create({
        data: {
          dividendId: dividend.id,
          userId: shareholder.userId,
          sharesHeld: shareholder.shares,
          amount: payoutAmount,
          paidAt: new Date()
        }
      });
    }

    // 7. Mark dividend as distributed
    await prisma.dividends.update({
      where: { id: dividend.id },
      data: {
        status: 'distributed',
        distributedAt: new Date()
      }
    });
  }
}
```

---

## 📈 PERFORMANCE-BASED PRICING (Node.js Backend)

**File:** `live-backend/src/services/revenue/fair-value.ts`

```typescript
export class FairValueCalculator {
  async updateWeekly(): Promise<void> {
    // Run every Sunday at 2 AM

    const liveCompanies = await prisma.companies.findMany({
      where: { mode: 'live' }
    });

    for (const company of liveCompanies) {
      // 1. Get last 3 months revenue reports
      const reports = await prisma.revenueReports.findMany({
        where: {
          companyId: company.id,
          status: 'approved'
        },
        orderBy: { periodEnd: 'desc' },
        take: 3
      });

      if (reports.length < 2) continue; // Not enough data

      // 2. Calculate performance metrics
      const latestRevenue = reports[0].grossRevenue;
      const oldestRevenue = reports[reports.length - 1].grossRevenue;
      const revenueGrowth = (latestRevenue - oldestRevenue) / oldestRevenue;

      const avgProfitMargin = reports.reduce((sum, r) => 
        sum + (r.netProfit / r.grossRevenue), 0
      ) / reports.length;

      const tradingVolume = await this.get30dVolume(company.id);
      const marketAvgVolume = await this.getMarketAvgVolume();
      const volumeScore = Math.min(1.0, tradingVolume / marketAvgVolume);

      const dividendsPaid = await prisma.dividends.count({
        where: {
          companyId: company.id,
          status: 'distributed',
          distributedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        }
      });
      const dividendScore = dividendsPaid === reports.length ? 1.0 : 0.0;

      // 3. Calculate performance score
      const performanceScore = 
        (revenueGrowth * 0.40) +
        (avgProfitMargin * 0.30) +
        (volumeScore * 0.20) +
        (dividendScore * 0.10);

      // 4. Calculate new fair value
      const currentFairValue = company.fairValueCentimes || company.currentPriceCentimes;
      const dampenedScore = performanceScore * 0.5; // 50% dampening
      const newFairValue = Math.floor(currentFairValue * (1 + dampenedScore));

      // Cap at ±20% change
      const maxChange = Math.floor(currentFairValue * 0.20);
      const cappedFairValue = Math.max(
        currentFairValue - maxChange,
        Math.min(newFairValue, currentFairValue + maxChange)
      );

      // 5. Update Rust backend
      await fetch(`http://localhost:3000/api/rust/companies/${company.symbol}/fair-value`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fairValue: cappedFairValue,
          performanceScore
        })
      });
    }
  }
}
```

---

## ⚙️ DEPLOYMENT

### Docker Compose (Updated)

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: smartrade
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"

  rust-backend:
    build: ./backend
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/smartrade
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      RUST_LOG: info
    ports:
      - "3000:3000"
    restart: unless-stopped

  node-backend:
    build: ./live-backend
    depends_on:
      - postgres
      - redis
      - rust-backend
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/smartrade
      RUST_BACKEND_URL: http://rust-backend:3000
      WAVE_API_KEY: ${WAVE_API_KEY}
      ORANGE_MONEY_KEY: ${ORANGE_MONEY_KEY}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_S3_BUCKET: ${AWS_S3_BUCKET}
    ports:
      - "4000:4000"
    restart: unless-stopped

  frontend:
    build: ./frontend
    depends_on:
      - rust-backend
      - node-backend
    ports:
      - "5174:5174"
    environment:
      VITE_RUST_API_URL: http://localhost:3000
      VITE_NODE_API_URL: http://localhost:4000
      VITE_SOCKET_URL: ws://localhost:3000/ws
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
      - rust-backend
      - node-backend
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## ✅ BUILD CHECKLIST

### Phase 1: Setup (Week 1)
- [ ] Create `live-backend/` folder
- [ ] Initialize Node.js + TypeScript project
- [ ] Set up Prisma with PostgreSQL
- [ ] Run `postgres/init.sql` to create tables
- [ ] Update Rust backend to use PostgreSQL (optional, can keep JSON for now)

### Phase 2: Mode Integration (Week 2)
- [ ] Add mode selector to frontend login page
- [ ] Add `ModeIndicator` component to header
- [ ] Update Rust backend to accept `mode` parameter in wallet operations
- [ ] Test mode switching

### Phase 3: Payment Integration (Week 3-4)
- [ ] Wave Money: deposit + webhook
- [ ] Orange Money: deposit + webhook
- [ ] Stripe: card payment + webhook
- [ ] Frontend deposit UI (live mode only)

### Phase 4: KYC System (Week 5)
- [ ] S3 bucket setup
- [ ] Company application form (frontend)
- [ ] Document upload API (Node.js)
- [ ] Admin KYC review interface (frontend)
- [ ] Approval workflow → Create company in Rust backend

### Phase 5: Revenue & Dividends (Week 6-7)
- [ ] Revenue report submission form (frontend)
- [ ] Bank statement upload
- [ ] Admin revenue review interface
- [ ] Dividend calculation service
- [ ] Bulk wallet credit via Rust API
- [ ] Dividend history UI

### Phase 6: Performance Pricing (Week 8)
- [ ] Fair value calculation service
- [ ] Weekly cron job (Node-cron)
- [ ] Update Rust backend to show fair value on charts
- [ ] Disable random price volatility in Rust backend

### Phase 7: Testing (Week 9-10)
- [ ] Unit tests for Node.js services
- [ ] Integration tests (payment flows)
- [ ] E2E tests (deposit → trade → dividend)
- [ ] Load testing
- [ ] Security audit

### Phase 8: Deployment (Week 11-12)
- [ ] Update `docker-compose.yml`
- [ ] Deploy to VPS
- [ ] Set up Nginx reverse proxy
- [ ] SSL certificates
- [ ] Database backups
- [ ] Monitoring (optional: Datadog/Grafana)

---

## 🎯 KEY SUCCESS FACTORS

1. **Keep Rust Backend Intact** - Don't modify the trading engine, it's perfect
2. **Mode Isolation is Critical** - Always check `mode` field in queries
3. **PostgreSQL is Shared** - Both Rust and Node.js read/write to same DB
4. **Rust → Node.js Communication** - Node.js calls Rust API for wallet/company operations
5. **Money Math Must Be Perfect** - Always use integers (centimes), never floats
6. **Payment Webhooks Must Be Reliable** - Verify signatures, implement idempotency

---

## 📝 FINAL NOTES

**What You're NOT Changing:**
- ✅ Rust order matching engine (perfect as-is)
- ✅ WebSocket real-time system
- ✅ Frontend trading UI (just adding mode toggle)
- ✅ Admin dashboard (just adding KYC/revenue tabs)
- ✅ All 463 backend tests + 136 E2E tests

**What You're Adding:**
- 💳 Node.js backend for payments, KYC, revenue, dividends
- 🗄️ PostgreSQL database (shared by both backends)
- 💰 Mode toggle (simulation vs live)
- 📊 Performance-based pricing

**Timeline:** 12 weeks with 2 developers  
**Budget:** ~$55K development + $100/month infrastructure

---

*This specification is tailored specifically for YOUR SmarTrade project. Follow it step-by-step and you'll have a production-ready live trading platform!*

**Good luck! 🚀**
