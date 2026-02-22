//! Trader agent implementation

use async_trait::async_trait;
use chrono::Utc;
use rand::Rng;
use serde::Deserialize;
use std::collections::HashMap;

use crate::agent::ollama::OllamaClient;
use crate::agent::types::*;
use crate::domain::models::{Order, OrderSide, OrderStatus, OrderType, TimeInForce};

/// Trading decision from LLM
#[derive(Debug, Deserialize)]
struct TradeDecision {
    action: String, // "BUY", "SELL", "HOLD"
    #[serde(default)]
    symbol: Option<String>,
    #[serde(default)]
    quantity: Option<i64>,
    #[serde(default)]
    price_target: Option<i64>,
    reasoning: String,
    #[serde(default)]
    confidence: f64,
}

/// Trader agent that makes buy/sell decisions
pub struct TraderAgent {
    id: AgentId,
    profile: TraderProfile,
    portfolio: HashMap<String, i64>, // symbol -> quantity
    cash: i64,
    memory: Vec<String>,
    emotions: Emotions,
    llm: OllamaClient,
    last_trade_tick: u64,
}

impl TraderAgent {
    /// Create new trader agent
    pub fn new(id: u64, profile: TraderProfile, initial_cash: i64, llm: OllamaClient) -> Self {
        Self {
            id: AgentId(id),
            profile,
            portfolio: HashMap::new(),
            cash: initial_cash,
            memory: Vec::with_capacity(50),
            emotions: Emotions {
                confidence: 0.5,
                fear: 0.2,
                greed: 0.3,
                excitement: 0.0,
            },
            llm,
            last_trade_tick: 0,
        }
    }
    
    /// Generate agent via LLM
    pub async fn generate(
        id: u64,
        archetype: TraderArchetype,
        llm: &OllamaClient,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        #[derive(Deserialize)]
        struct GeneratedProfile {
            name: String,
            age: u32,
            background: String,
            personality: String,
            strategy_description: String,
        }
        
        let prompt = format!(
            r#"Create a trader profile for an African stock market simulation.

Archetype: {:?}

Generate a JSON profile with:
- name: Full name (African names preferred)
- age: 25-65
- background: 1-2 sentence career history
- personality: Key traits that affect trading decisions
- strategy_description: How they approach trading

Respond ONLY with valid JSON."#,
            archetype
        );
        
        let generated: GeneratedProfile = llm.generate(&prompt).await?;
        
        // Generate random stats based on archetype
        let (risk, greed, fear, patience) = match archetype {
            TraderArchetype::ValueInvestor => (0.3, 0.3, 0.4, 0.9),
            TraderArchetype::DayTrader => (0.7, 0.6, 0.5, 0.1),
            TraderArchetype::NewsTrader => (0.6, 0.5, 0.6, 0.3),
            TraderArchetype::Contrarian => (0.5, 0.4, 0.3, 0.7),
            TraderArchetype::GrowthChaser => (0.8, 0.9, 0.3, 0.4),
            TraderArchetype::IndexFollower => (0.4, 0.4, 0.5, 0.6),
            TraderArchetype::PanicProne => (0.3, 0.2, 0.9, 0.2),
            TraderArchetype::Aggressive => (0.9, 0.9, 0.2, 0.3),
        };
        
        let profile = TraderProfile {
            name: generated.name,
            archetype,
            age: generated.age,
            background: generated.background,
            personality: generated.personality,
            risk_tolerance: risk,
            greed_level: greed,
            fear_level: fear,
            patience,
            intelligence: rand::thread_rng().gen_range(0.5..1.0),
            strategy_description: generated.strategy_description,
        };
        
        Ok(Self::new(
            id,
            profile,
            1_000_000_000, // 1 billion F.CFA starting cash
            llm.clone(),
        ))
    }
    
    /// Update emotions based on market conditions
    fn update_emotions(&mut self, portfolio_value: i64, initial_value: i64) {
        let pnl_pct = (portfolio_value as f64 - initial_value as f64) / initial_value as f64;
        
        // Winning builds confidence and greed
        if pnl_pct > 0.1 {
            self.emotions.confidence = (self.emotions.confidence + 0.1).min(1.0);
            self.emotions.greed = (self.emotions.greed + 0.05).min(1.0);
            self.emotions.fear = (self.emotions.fear - 0.05).max(0.0);
        }
        // Losing builds fear
        else if pnl_pct < -0.1 {
            self.emotions.confidence = (self.emotions.confidence - 0.1).max(0.0);
            self.emotions.greed = (self.emotions.greed - 0.05).max(0.0);
            self.emotions.fear = (self.emotions.fear + 0.1).min(1.0);
        }
    }
    
    /// Build trading prompt for LLM
    fn build_trading_prompt(&self, ctx: &TickContext) -> String {
        let portfolio_desc: Vec<String> = self
            .portfolio
            .iter()
            .filter(|(_, qty)| **qty > 0)
            .map(|(sym, qty)| format!("{}: {} shares", sym, qty))
            .collect();
        
        let portfolio_str = if portfolio_desc.is_empty() {
            "No positions (all cash)".to_string()
        } else {
            portfolio_desc.join(", ")
        };
        
        let recent_news = ctx
            .recent_news
            .iter()
            .take(3)
            .map(|n| format!("- {}: {}", n.headline, n.content.chars().take(100).collect::<String>()))
            .collect::<Vec<_>>()
            .join("\n");
        
        let prices: Vec<String> = ctx
            .market_data
            .prices
            .iter()
            .map(|(sym, price)| format!("{}: {} F.CFA", sym, price))
            .collect();
        
        format!(
            r#"You are {}, a {:?} trader in an African stock market simulation.

YOUR PROFILE:
- Age: {}
- Background: {}
- Personality: {}
- Risk tolerance: {:.0}%
- Strategy: {}

YOUR CURRENT STATE:
- Cash: {} F.CFA
- Portfolio: {}
- Emotional state: Confidence {:.0}%, Fear {:.0}%, Greed {:.0}%

MARKET CONTEXT (Tick {}):
Recent news:
{}

Current prices:
{}

YOUR RECENT ACTIVITY:
{}

DECISION TIME:
Based on your personality, strategy, and current emotions, what do you do?

Respond with JSON:
{{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "TICKER" (if trading),
  "quantity": number (if trading),
  "reasoning": "Brief explanation of your decision",
  "confidence": 0.0 to 1.0
}}"#,
            self.profile.name,
            self.profile.archetype,
            self.profile.age,
            self.profile.background,
            self.profile.personality,
            self.profile.risk_tolerance * 100.0,
            self.profile.strategy_description,
            self.cash,
            portfolio_str,
            self.emotions.confidence * 100.0,
            self.emotions.fear * 100.0,
            self.emotions.greed * 100.0,
            ctx.tick_number,
            recent_news,
            prices.join(", "),
            self.memory.iter().rev().take(3).cloned().collect::<Vec<_>>().join("\n")
        )
    }
}

#[async_trait]
impl Agent for TraderAgent {
    fn id(&self) -> AgentId {
        self.id
    }
    
    fn name(&self) -> &str {
        &self.profile.name
    }
    
    fn agent_type(&self) -> AgentType {
        AgentType::Trader(self.profile.archetype)
    }
    
    async fn tick(&mut self, ctx: &TickContext) -> Vec<AgentAction> {
        let mut actions = Vec::new();
        
        // Don't trade every tick (patience factor)
        let ticks_since_last = ctx.tick_number - self.last_trade_tick;
        let min_wait = (10.0 * (1.0 - self.profile.patience)) as u64 + 1;
        
        if ticks_since_last < min_wait {
            return vec![AgentAction::Idle];
        }
        
        // Get LLM decision
        let prompt = self.build_trading_prompt(ctx);
        
        match self.llm.generate::<TradeDecision>(&prompt).await {
            Ok(decision) => {
                // Update memory
                self.memory.push(format!(
                    "Tick {}: {} - {} (confidence: {:.0}%)",
                    ctx.tick_number,
                    decision.action,
                    decision.reasoning,
                    decision.confidence * 100.0
                ));
                
                // Trim memory
                if self.memory.len() > 50 {
                    self.memory.remove(0);
                }
                
                // Execute trade if not holding
                if decision.action == "BUY" || decision.action == "SELL" {
                    if let (Some(symbol), Some(qty)) = (decision.symbol, decision.quantity) {
                        // Validate quantity
                        if qty <= 0 {
                            return actions;
                        }
                        
                        let side = if decision.action == "BUY" {
                            OrderSide::Buy
                        } else {
                            OrderSide::Sell
                        };
                        
                        // Get current price or use market order
                        let price = ctx.market_data.prices.get(&symbol).copied().unwrap_or(0);
                        
                        // For sells, check if we own enough
                        if side == OrderSide::Sell {
                            let owned = self.portfolio.get(&symbol).copied().unwrap_or(0);
                            if owned < qty {
                                return actions; // Can't sell what we don't have
                            }
                        }
                        
                        // For buys, check if we have enough cash
                        if side == OrderSide::Buy {
                            let cost = price * qty;
                            if cost > self.cash {
                                return actions; // Can't afford
                            }
                        }
                        
                        let order = Order {
                            id: 0, // Will be assigned by engine
                            user_id: self.id.0,
                            symbol: symbol.clone(),
                            side,
                            price, // Market order at current price
                            qty: qty as u64,
                            filled_qty: 0,
                            status: OrderStatus::Open,
                            order_type: OrderType::Market,
                            time_in_force: TimeInForce::GTC,
                            timestamp: Utc::now().timestamp(),
                        };
                        
                        self.last_trade_tick = ctx.tick_number;
                        actions.push(AgentAction::Trade(order));
                        actions.push(AgentAction::Remember(decision.reasoning));
                    }
                }
            }
            Err(e) => {
                tracing::error!("Trader {} LLM error: {}", self.profile.name, e);
            }
        }
        
        actions
    }
    
    async fn on_chat(&mut self, message: &str) -> String {
        let portfolio_str = self
            .portfolio
            .iter()
            .filter(|(_, qty)| **qty > 0)
            .map(|(sym, qty)| format!("{}: {} shares", sym, qty))
            .collect::<Vec<_>>()
            .join(", ");
        
        let prompt = format!(
            r#"You are {}, a {:?} trader.

Your profile: {}
Your current portfolio: {}
Cash: {} F.CFA

A human is chatting with you: "{}"

Respond naturally as your character would. Be conversational but stay in character.
Keep your response to 1-2 sentences unless explaining a complex trading decision."#,
            self.profile.name,
            self.profile.archetype,
            self.profile.personality,
            if portfolio_str.is_empty() { "No positions" } else { &portfolio_str },
            self.cash,
            message
        );
        
        self.llm
            .generate_text(&prompt)
            .await
            .unwrap_or_else(|_| format!("{} shrugs.", self.profile.name))
    }
    
    fn get_memory(&self) -> &[String] {
        &self.memory
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_trader_creation() {
        let profile = TraderProfile {
            name: "Kwame Asante".to_string(),
            archetype: TraderArchetype::ValueInvestor,
            age: 45,
            background: "Former banker".to_string(),
            personality: "Conservative, patient".to_string(),
            risk_tolerance: 0.3,
            greed_level: 0.3,
            fear_level: 0.4,
            patience: 0.9,
            intelligence: 0.8,
            strategy_description: "Buy undervalued stocks".to_string(),
        };
        
        let llm = OllamaClient::new("http://localhost:11434", "qwen2.5:7b");
        let trader = TraderAgent::new(1, profile, 1_000_000, llm);
        
        assert_eq!(trader.id(), AgentId(1));
        assert_eq!(trader.name(), "Kwame Asante");
    }
}
