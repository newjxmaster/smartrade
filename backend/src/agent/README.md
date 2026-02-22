# AI Agent Simulation Framework

Autonomous AI agents that power the living stock market simulation using local LLM (Ollama).

## Overview

This framework creates a dynamic market where AI agents with distinct personalities trade, make corporate decisions, and generate news. Human traders compete alongside AI agents in the same market.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT SIMULATION RUNTIME                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    TRADER    │  │    BOARD     │  │       NEWS           │  │
│  │    AGENTS    │  │   MEMBERS    │  │     AGENTS           │  │
│  │              │  │              │  │                      │  │
│  │ • Kwame      │  │ • Olu        │  │ • Nia Juma           │  │
│  │ • Amina      │  │ • Fatima     │  │ • David Okonkwo      │  │
│  │ • 20+ more   │  │ • Directors  │  │ • etc.               │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                     │              │
│         └──────────────────┼─────────────────────┘              │
│                            │                                    │
│              ┌─────────────▼─────────────┐                      │
│              │      OLLAMA LLM           │                      │
│              │   (llama3.1:8b)           │                      │
│              └───────────────────────────┘                      │
│                                                                  │
│  Simulation Tick: Every 30 seconds = 1 market day               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Types

### 1. Trader Agents

AI traders with distinct personalities that compete with human traders.

**Archetypes:**
- **Value Investor** - Buys undervalued, holds long-term (e.g., Kwame Asante)
- **Day Trader** - Quick trades, technical focus (e.g., Amina Diallo)
- **News Trader** - Reacts immediately to headlines
- **Contrarian** - Goes against market sentiment
- **Growth Chaser** - Buys momentum stocks
- **Index Follower** - Tracks market trends
- **Panic Prone** - Sells at any bad news
- **Aggressive** - High-risk, all-in bets

Each trader has:
- Name, age, background (African names preferred)
- Personality traits (greed, fear, patience, confidence)
- Portfolio and trading history
- Emotional state that affects decisions
- Can chat with admin about their strategy

### 2. Board Member Agents

Corporate executives who govern companies.

**Roles:**
- **Chairman** - Sets agenda, facilitates discussion
- **CEO** - Growth-oriented, operational focus
- **CFO** - Financial prudence, risk management
- **Director** - Shareholder value, oversight

Meet to decide:
- Dividend declarations
- Expansion plans
- Cost-cutting measures
- Product launches
- Crisis responses

### 3. News Agents

Financial journalists who create market news.

- Multiple agents with different specialties and writing styles
- React to world events (weather, real news as inspiration)
- Generate earnings reports, product announcements, analysis
- Create rumors (lower credibility)

## Quick Start

### 1. Install Ollama and Download Model

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.com/install.sh | sh

# Download llama3.1:8b (you already have this!)
ollama pull llama3.1:8b

# Verify it's working
ollama list
```

### 2. Start Ollama Server

```bash
# Ollama runs as a daemon by default
# Check status:
ollama serve &

# Verify API is accessible
curl http://localhost:11434/api/tags
```

### 3. Initialize Simulation in Code

```rust
use stockmart_backend::agent::{SimulationRuntime, OllamaClient};

// Create Ollama client
let ollama = OllamaClient::new(
    "http://localhost:11434",  // Ollama URL
    "llama3.1:8b"              // Your model
);

// Verify connection
ollama.health_check().await?;

// Create runtime
let runtime = Arc::new(SimulationRuntime::new(
    market_service.clone(),  // Your market service
    ollama,
    30                       // Tick interval: 30 seconds
));

// Spawn initial agents
runtime.spawn_initial_agents(
    20,  // 20 trader agents
    4    // 4 news agents
).await;

// Start simulation loop
tokio::spawn(async move {
    runtime.run().await;
});
```

### 4. Admin Chat Interface

Agents can be chatted with via WebSocket. Connect to the admin chat endpoint and send:

```json
// List all agents
{"type": "list_agents"}

// Chat with specific agent
{
  "type": "message",
  "agent_id": 1001,
  "content": "Why did you buy TECH stock yesterday?"
}

// Join board meeting
{
  "type": "join_meeting",
  "company": "TECH"
}
```

## Configuration

### Model Selection & Fallback

The system supports automatic fallback between models:

| Model | Pros | Cons | Use Case |
|-------|------|------|----------|
| `llama3.1:8b` | Best reasoning, reliable JSON | Slower, more memory | Primary - quality trades |
| `llama3.2:3b` | Very fast, low memory | Less nuanced | Fallback - speed priority |
| `qwen2.5:7b` | Fast, good instruction following | Medium quality | Alternative option |

**Automatic Fallback**: The system tries `llama3.1:8b` first, then automatically switches to `llama3.2:3b` if the primary model isn't available.

**Manual Selection**: You can also manually switch models:
```rust
let mut client = OllamaClient::with_fallback(
    "http://localhost:11434",
    "llama3.1:8b",
    "llama3.2:3b"
);

// Auto-select best available
client.auto_select_model().await?;

// Or manually switch
client.enable_fallback();  // Switch to llama3.2:3b
client.disable_fallback(); // Switch back to llama3.1:8b
```

### Tick Interval

- **30 seconds** (default) = 1 simulation day
- **60 seconds** = Slower pace, less API load
- **10 seconds** = Fast simulation for testing

### Number of Agents

- **10-20 traders**: Good balance of activity and performance
- **4-6 news agents**: Enough variety without spam
- **3-5 board members per company**: Realistic governance

## How It Works

### Normal Day-to-Day Simulation

```
Every 30 seconds:
1. WORLD CONTEXT AGENT fetches real weather/news
2. NEWS AGENTS decide if story-worthy events occurred
3. BOARD AGENTS check if quarterly meeting needed
4. TRADER AGENTS observe market + news + meetings
5. TRADES EXECUTE in matching engine
6. MARKET UPDATES broadcast to all clients
```

### Agent Decision Process

```rust
// Each tick, every agent:
1. Receives TickContext {
     market_data,      // Current prices, volatility
     recent_news,      // Last 10 news items
     world_context,    // Weather, themes, mood
     active_meetings,  // Ongoing board meetings
   }

2. LLM generates decision based on:
   - Agent's personality and strategy
   - Current emotional state
   - Recent memory/context
   - Market conditions

3. Returns actions:
   - Trade(order)
   - PublishNews(article)
   - Vote(meeting, decision)
   - Remember(observation)
```

### Emotional System

Traders have emotions that evolve:
- **Confidence** - Increases with wins, decreases with losses
- **Fear** - Increases during crashes, decreases in bull markets
- **Greed** - Increases during rallies, decreases after losses

Emotions affect trading decisions (via LLM prompt context).

## Admin Controls

### Chat with Agents

```
You → Kwame Asante: "What's your strategy?"

Kwame: "I look for companies trading below their intrinsic value. 
        Right now I'm holding TECH because their fundamentals are 
        strong despite recent volatility."
```

### Observe Board Meetings

```
🏢 TECH CORP - Board Meeting in Session

Olu (Chairman): "Let's discuss the Q2 dividend."
Fatima (CFO): "With respect, I advise against. Cash reserves are tight."
Kwame (Director): "But investors expect it. Stock might tank."

[Vote in progress: 1 FOR, 1 AGAINST]
```

### Deploy Challenges (Optional)

Admin can trigger special scenarios:
- Flash Crash - Test panic reactions
- IPO Boom - Sudden new company rush
- Corporate Scandal - Crisis management
- Weather Crisis - Agriculture impact

## Performance Considerations

### LLM Call Frequency

- Each agent makes ~1 LLM call per tick
- 20 agents × 1 tick/minute = 20 calls/minute
- llama3.1:8b on M1 Mac: ~20-30 tokens/sec
- Average response: ~300 tokens = ~10-15 seconds

**Optimization**: Agents don't trade every tick (patience factor), reducing calls.

### Memory Management

- Each agent keeps last 50 observations
- News history: last 100 items
- Old memories are pruned automatically

## Troubleshooting

### Ollama Not Responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve &

# Check model is loaded
ollama list
```

### JSON Parsing Errors

If LLM returns malformed JSON:
1. Check Ollama logs
2. Try simpler prompts
3. Lower temperature in `OllamaClient`

### Agents Not Trading

Check:
1. Market is open
2. Agents have sufficient cash
3. LLM is responding (check logs)
4. Tick interval is appropriate

## Future Enhancements

- [ ] Vector database for long-term agent memory
- [ ] More sophisticated emotional modeling
- [ ] Inter-agent relationships (rivalries, alliances)
- [ ] Machine learning for strategy evolution
- [ ] Multi-language support (French for African markets)

## File Structure

```
src/agent/
├── mod.rs        # Module exports
├── types.rs      # Core types and Agent trait
├── ollama.rs     # LLM HTTP client
├── trader.rs     # Trader agent implementation
├── board.rs      # Board member agent implementation
├── news.rs       # News agent implementation
└── runtime.rs    # Simulation orchestrator
```
