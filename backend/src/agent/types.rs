//! Core types for the agent simulation framework

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::domain::models::{Order, OrderSide, OrderType};
use crate::service::market::MarketSnapshot;

/// Unique identifier for agents
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AgentId(pub u64);

impl AgentId {
    pub fn new(id: u64) -> Self {
        Self(id)
    }
}

/// Types of agents in the simulation
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentType {
    Trader(TraderArchetype),
    BoardMember { company: String, role: BoardRole },
    NewsReporter,
    Analyst,
}

/// Trading archetypes - different personalities
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TraderArchetype {
    ValueInvestor,    // Buy undervalued, hold long
    DayTrader,        // Quick trades, technical
    NewsTrader,       // React to headlines
    Contrarian,       // Go against the crowd
    GrowthChaser,     // Buy momentum
    IndexFollower,    // Follow market trends
    PanicProne,       // Sell on any bad news
    Aggressive,       // High risk, all-in bets
}

/// Board member roles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BoardRole {
    Chairman,
    CEO,
    CFO,
    Director,
}

/// What agents can do during their tick
#[derive(Debug, Clone)]
pub enum AgentAction {
    /// Place a trade order
    Trade(Order),
    
    /// Send a direct message to another agent
    SendMessage {
        to: AgentId,
        content: String,
    },
    
    /// Publish news to the market
    PublishNews(NewsItem),
    
    /// Cast a vote in a board meeting
    Vote {
        meeting_id: MeetingId,
        vote: Vote,
        statement: String,
    },
    
    /// Schedule an action for later
    Schedule {
        action: Box<AgentAction>,
        execute_at: DateTime<Utc>,
    },
    
    /// Remember something (adds to context)
    Remember(String),
    
    /// No action this tick
    Idle,
}

/// Board meeting identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct MeetingId(pub u64);

/// Voting options
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Vote {
    For,
    Against,
    Abstain,
}

/// News item created by agents
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsItem {
    pub headline: String,
    pub content: String,
    pub source: String,
    pub category: NewsCategory,
    pub affected_companies: Vec<String>,
    pub sentiment: f64, // -1.0 to 1.0
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NewsCategory {
    Earnings,
    ProductLaunch,
    ExecutiveNews,
    MarketAnalysis,
    ExternalEvent,
    Rumor,
}

/// World context from external APIs
#[derive(Debug, Clone, Default)]
pub struct WorldContext {
    pub weather: HashMap<String, Weather>,
    pub headline_themes: Vec<String>,
    pub economic_mood: String,
    pub current_date: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct Weather {
    pub city: String,
    pub condition: String, // "sunny", "rain", "storm"
    pub temperature: f64,
}

/// Context passed to agents on each tick
#[derive(Debug, Clone)]
pub struct TickContext {
    pub tick_number: u64,
    pub market_data: MarketSnapshot,
    pub recent_news: Vec<NewsItem>,
    pub world_context: WorldContext,
    pub active_meetings: HashMap<String, MeetingState>,
}

/// State of an ongoing board meeting
#[derive(Debug, Clone)]
pub struct MeetingState {
    pub id: MeetingId,
    pub company_symbol: String,
    pub agenda: Option<AgendaItem>,
    pub statements: Vec<(AgentId, String)>,
    pub votes: HashMap<AgentId, Vote>,
}

#[derive(Debug, Clone)]
pub enum AgendaItem {
    Dividend { amount: Option<i64> },
    Expansion { region: String, investment: i64 },
    CostCutting { severity: String },
    ProductLaunch { product: String },
    Acquisition { target: String },
    CrisisResponse { crisis: String },
}

/// Trader profile - defines personality
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraderProfile {
    pub name: String,
    pub archetype: TraderArchetype,
    pub age: u32,
    pub background: String,
    pub personality: String,
    pub risk_tolerance: f64,    // 0.0 to 1.0
    pub greed_level: f64,       // 0.0 to 1.0
    pub fear_level: f64,        // 0.0 to 1.0
    pub patience: f64,          // 0.0 to 1.0
    pub intelligence: f64,      // 0.0 to 1.0
    pub strategy_description: String,
}

/// Executive profile for board members
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutiveProfile {
    pub name: String,
    pub role: BoardRole,
    pub age: u32,
    pub background: String,
    pub personality: String,
    pub reputation: f64, // 0.0 to 1.0
}

/// Emotional state affecting decisions
#[derive(Debug, Clone, Default)]
pub struct Emotions {
    pub confidence: f64,    // 0.0 to 1.0
    pub fear: f64,          // 0.0 to 1.0
    pub greed: f64,         // 0.0 to 1.0
    pub excitement: f64,    // 0.0 to 1.0
}

/// Core agent trait - all agents implement this
#[async_trait]
pub trait Agent: Send + Sync {
    /// Unique identifier
    fn id(&self) -> AgentId;
    
    /// Human-readable name
    fn name(&self) -> &str;
    
    /// Agent type
    fn agent_type(&self) -> AgentType;
    
    /// Called every simulation tick
    async fn tick(&mut self, ctx: &TickContext) -> Vec<AgentAction>;
    
    /// Handle chat from admin
    async fn on_chat(&mut self, message: &str) -> String;
    
    /// Get current thoughts/memory for inspection
    fn get_memory(&self) -> &[String];
}

/// Request from admin via WebSocket
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum ChatRequest {
    #[serde(rename = "list_agents")]
    ListAgents,
    
    #[serde(rename = "message")]
    Message {
        agent_id: AgentId,
        content: String,
    },
    
    #[serde(rename = "join_meeting")]
    JoinMeeting {
        company: String,
    },
    
    #[serde(rename = "get_profile")]
    GetProfile {
        agent_id: AgentId,
    },
}

/// Response to admin
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum ChatResponse {
    #[serde(rename = "agent_list")]
    AgentList { agents: Vec<AgentInfo> },
    
    #[serde(rename = "agent_message")]
    AgentMessage {
        from: AgentId,
        from_name: String,
        content: String,
        timestamp: DateTime<Utc>,
    },
    
    #[serde(rename = "agent_profile")]
    AgentProfile {
        id: AgentId,
        name: String,
        agent_type: AgentType,
        memory: Vec<String>,
        stats: serde_json::Value,
    },
    
    #[serde(rename = "meeting_update")]
    MeetingUpdate {
        company: String,
        transcript: Vec<(String, String)>, // (speaker, statement)
        active_vote: Option<VoteState>,
    },
}

#[derive(Debug, Clone, Serialize)]
pub struct AgentInfo {
    pub id: AgentId,
    pub name: String,
    pub agent_type: String,
    pub status: String, // "active", "in_meeting", "trading"
    pub last_activity: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct VoteState {
    pub motion: String,
    pub votes_for: u32,
    pub votes_against: u32,
    pub votes_abstain: u32,
}
