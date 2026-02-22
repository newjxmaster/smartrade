//! Agent simulation runtime - orchestrates all agents

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tokio::time::{interval, Duration};
use tracing::{info, warn};


use crate::agent::news::NewsAgent;
use crate::agent::ollama::OllamaClient;
use crate::agent::trader::TraderAgent;
use crate::agent::types::*;
use crate::service::market::{MarketService, MarketSnapshot};
use std::collections::HashMap;
use serde::Serialize;

/// Meeting transcript entry
#[derive(Debug, Clone, Serialize)]
pub struct MeetingEntry {
    pub speaker: String,
    pub content: String,
    pub timestamp: DateTime<Utc>,
}

/// Scenario deployment record
#[derive(Debug, Clone, Serialize)]
pub struct ScenarioRecord {
    pub scenario_type: String,
    pub severity: f64,
    pub deployed_at: DateTime<Utc>,
}

/// Shared state for the simulation
pub struct SimulationState {
    /// Current tick number
    pub tick: RwLock<u64>,
    
    /// World context from external sources
    pub world_context: RwLock<WorldContext>,
    
    /// Recent news (last 100 items)
    pub news: RwLock<Vec<NewsItem>>,
    
    /// Active board meetings
    pub meetings: DashMap<String, MeetingState>,
    
    /// Market snapshot cache
    pub market_snapshot: RwLock<MarketSnapshot>,
}

// Ensure SimulationState is Send + Sync
unsafe impl Send for SimulationState {}
unsafe impl Sync for SimulationState {}

impl SimulationState {
    pub fn new() -> Self {
        Self {
            tick: RwLock::new(0),
            world_context: RwLock::new(WorldContext::default()),
            news: RwLock::new(Vec::with_capacity(100)),
            meetings: DashMap::new(),
            market_snapshot: RwLock::new(MarketSnapshot::default()),
        }
    }
    
    /// Add news item
    pub async fn add_news(&self, item: NewsItem) {
        let mut news = self.news.write().await;
        news.push(item);
        if news.len() > 100 {
            news.remove(0);
        }
    }
    
    /// Start a board meeting
    pub fn start_meeting(&self, company: String, agenda: AgendaItem) -> MeetingId {
        let id = MeetingId(rand::random());
        let meeting = MeetingState {
            id,
            company_symbol: company.clone(),
            agenda: Some(agenda),
            statements: Vec::new(),
            votes: HashMap::new(),
        };
        self.meetings.insert(company, meeting);
        id
    }
    
    /// Get recent news
    pub async fn get_recent_news(&self, count: usize) -> Vec<NewsItem> {
        let news = self.news.read().await;
        news.iter().rev().take(count).cloned().collect()
    }
}

/// The main simulation runtime
pub struct SimulationRuntime {
    /// All registered agents
    agents: Arc<DashMap<AgentId, Arc<tokio::sync::Mutex<Box<dyn Agent + Send + 'static>>>>>,
    
    /// Shared simulation state
    state: Arc<SimulationState>,
    
    /// LLM client
    llm: Arc<OllamaClient>,
    
    /// Market service for price data
    market: Arc<MarketService>,
    
    /// Tick interval (30 seconds = 1 simulation day)
    tick_interval: Duration,
    
    /// Broadcast channel for agent actions
    action_tx: broadcast::Sender<AgentAction>,
    
    /// Broadcast channel for admin chat
    chat_tx: broadcast::Sender<ChatResponse>,
}

// Ensure SimulationRuntime is Send + Sync
unsafe impl Send for SimulationRuntime {}
unsafe impl Sync for SimulationRuntime {}

impl SimulationRuntime {
    /// Create new simulation runtime
    pub fn new(
        market: Arc<MarketService>,
        llm: OllamaClient,
        tick_interval_secs: u64,
    ) -> Self {
        let (action_tx, _) = broadcast::channel(1000);
        let (chat_tx, _) = broadcast::channel(100);
        
        Self {
            agents: Arc::new(DashMap::new()),
            state: Arc::new(SimulationState::new()),
            llm: Arc::new(llm),
            market,
            tick_interval: Duration::from_secs(tick_interval_secs),
            action_tx,
            chat_tx,
        }
    }
    
    /// Create runtime with default settings using llama3.1:8b with llama3.2:3b fallback
    /// 
    /// # Example
    /// ```rust,ignore
    /// use stockmart_backend::agent::SimulationRuntime;
    /// use std::sync::Arc;
    /// 
    /// async fn example(market_service: Arc<MarketService>) -> Result<(), Box<dyn std::error::Error>> {
    ///     let runtime = SimulationRuntime::with_defaults(market_service).await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn with_defaults(market: Arc<MarketService>) -> Result<Self, Box<dyn std::error::Error>> {
        let mut ollama = OllamaClient::with_fallback(
            "http://localhost:11434",
            "llama3.1:8b",    // Primary model - better quality
            "llama3.2:3b"     // Fallback model - faster, lower memory
        );
        
        // Auto-select best available model
        ollama.auto_select_model().await?;
        
        if ollama.is_using_fallback() {
            info!("✅ Connected to Ollama with fallback model: {}", ollama.current_model());
        } else {
            info!("✅ Connected to Ollama with primary model: {}", ollama.current_model());
        }
        
        Ok(Self::new(market, ollama, 30))
    }
    
    /// Register an agent
    pub fn register_agent(&self, agent: Box<dyn Agent + Send + 'static>) {
        let id = agent.id();
        let name = agent.name().to_string();
        self.agents.insert(id, Arc::new(tokio::sync::Mutex::new(agent)));
        info!("Registered agent: {:?} - {}", id, name);
    }
    
    /// Get agent info list
    pub async fn list_agents(&self) -> Vec<AgentInfo> {
        let mut infos = Vec::new();
        
        for entry in self.agents.iter() {
            let agent: tokio::sync::MutexGuard<Box<dyn Agent + Send + 'static>> = entry.value().lock().await;
            let agent_type = format!("{:?}", agent.agent_type());
            
            infos.push(AgentInfo {
                id: agent.id(),
                name: agent.name().to_string(),
                agent_type,
                status: "active".to_string(),
                last_activity: Utc::now(),
            });
        }
        
        infos
    }
    
    /// Chat with a specific agent
    pub async fn chat_with_agent(&self, agent_id: AgentId, message: &str) -> Option<String> {
        if let Some(entry) = self.agents.get(&agent_id) {
            let mut agent: tokio::sync::MutexGuard<Box<dyn Agent + Send + 'static>> = entry.lock().await;
            let response = agent.on_chat(message).await;
            
            // Broadcast to admin listeners
            let _ = self.chat_tx.send(ChatResponse::AgentMessage {
                from: agent_id,
                from_name: agent.name().to_string(),
                content: response.clone(),
                timestamp: Utc::now(),
            });
            
            Some(response)
        } else {
            None
        }
    }
    
    /// Get agent profile
    pub async fn get_agent_profile(&self, agent_id: AgentId) -> Option<ChatResponse> {
        if let Some(entry) = self.agents.get(&agent_id) {
            let agent: tokio::sync::MutexGuard<Box<dyn Agent + Send + 'static>> = entry.lock().await;
            
            Some(ChatResponse::AgentProfile {
                id: agent_id,
                name: agent.name().to_string(),
                agent_type: agent.agent_type(),
                memory: agent.get_memory().to_vec(),
                stats: serde_json::json!({}), // TODO: Add actual stats
            })
        } else {
            None
        }
    }
    
    /// Subscribe to agent actions
    pub fn subscribe_actions(&self) -> broadcast::Receiver<AgentAction> {
        self.action_tx.subscribe()
    }
    
    /// Subscribe to chat updates
    pub fn subscribe_chat(&self) -> broadcast::Receiver<ChatResponse> {
        self.chat_tx.subscribe()
    }
    
    /// Build tick context for agents
    async fn build_context(&self) -> TickContext {
        let tick = *self.state.tick.read().await;
        let world_context = self.state.world_context.read().await.clone();
        let recent_news = self.state.get_recent_news(10).await;
        let market_snapshot: MarketSnapshot = self.state.market_snapshot.read().await.clone();
        
        // Collect active meetings
        let active_meetings: HashMap<String, MeetingState> = self
            .state
            .meetings
            .iter()
            .map(|entry: dashmap::mapref::multiple::RefMulti<_, _>| (entry.key().clone(), entry.value().clone()))
            .collect();
        
        TickContext {
            tick_number: tick,
            market_data: market_snapshot,
            recent_news,
            world_context,
            active_meetings,
        }
    }
    
    /// Execute a single agent action
    async fn execute_action(&self, agent_id: AgentId, action: AgentAction) {
        match &action {
            AgentAction::Trade(order) => {
                info!(
                    "Agent {:?} placing {:?} order for {} {} @ {}",
                    agent_id, order.side, order.qty, order.symbol, order.price
                );
                // TODO: Submit to matching engine
            }
            AgentAction::PublishNews(news) => {
                info!("News from agent {:?}: {}", agent_id, news.headline);
                self.state.add_news(news.clone()).await;
            }
            AgentAction::Vote { meeting_id, vote, statement } => {
                info!("Agent {:?} voted {:?} in meeting {:?}", agent_id, vote, meeting_id);
                // TODO: Record vote
            }
            AgentAction::Remember(memory) => {
                // Memory is internal to agent, no external action needed
                tracing::debug!("Agent {:?} remembered: {}", agent_id, memory);
            }
            _ => {}
        }
        
        // Broadcast action for any listeners
        let _ = self.action_tx.send(action);
    }
    
    /// Spawn initial set of agents
    pub async fn spawn_initial_agents(&self, num_traders: u32, num_news: u32) {
        info!("Spawning {} traders and {} news agents", num_traders, num_news);
        
        // Spawn traders
        let archetypes = vec![
            TraderArchetype::ValueInvestor,
            TraderArchetype::DayTrader,
            TraderArchetype::NewsTrader,
            TraderArchetype::Contrarian,
            TraderArchetype::GrowthChaser,
            TraderArchetype::PanicProne,
        ];
        
        for i in 0..num_traders {
            let archetype = archetypes[i as usize % archetypes.len()];
            
            match TraderAgent::generate(1000 + i as u64, archetype, &self.llm).await {
                Ok(trader) => {
                    self.register_agent(Box::new(trader));
                }
                Err(e) => {
                    warn!("Failed to generate trader {}: {}", i, e);
                }
            }
        }
        
        // Spawn news agents
        for i in 0..num_news {
            match NewsAgent::generate(2000 + i as u64, &self.llm).await {
                Ok(agent) => {
                    self.register_agent(Box::new(agent));
                }
                Err(e) => {
                    warn!("Failed to generate news agent {}: {}", i, e);
                }
            }
        }
    }
    
    /// Main simulation loop
    pub async fn run(&self) {
        info!("Starting simulation runtime with {:?} tick interval", self.tick_interval);
        
        let mut interval = interval(self.tick_interval);
        
        loop {
            interval.tick().await;
            
            // Increment tick
            let tick = {
                let mut t = self.state.tick.write().await;
                *t += 1;
                *t
            };
            
            info!("=== Simulation Tick {} ===", tick);
            
            // Build context
            let ctx = self.build_context().await;
            
            // Collect agent IDs and mutexes first to avoid lifetime issues
            let agents_to_run: Vec<(AgentId, Arc<tokio::sync::Mutex<Box<dyn Agent + Send + 'static>>>)> = self
                .agents
                .iter()
                .map(|entry: dashmap::mapref::multiple::RefMulti<_, _>| (*entry.key(), Arc::clone(entry.value())))
                .collect();
            
            // Run all agents in parallel
            let mut handles: Vec<tokio::task::JoinHandle<(AgentId, Vec<AgentAction>)>> = Vec::new();
            
            for (agent_id, agent_mutex) in agents_to_run {
                let ctx_clone = ctx.clone();
                
                let handle: tokio::task::JoinHandle<(AgentId, Vec<AgentAction>)> = tokio::spawn(async move {
                    let mut agent: tokio::sync::MutexGuard<Box<dyn Agent + Send + 'static>> = agent_mutex.lock().await;
                    let actions: Vec<AgentAction> = agent.tick(&ctx_clone).await;
                    (agent_id, actions)
                });
                
                handles.push(handle);
            }
            
            // Collect and execute actions
            let action_results: Vec<(AgentId, Vec<AgentAction>)> = futures::future::join_all(handles)
                .await
                .into_iter()
                .filter_map(|r| r.ok())
                .collect();
            
            for (agent_id, actions) in action_results {
                for action in actions {
                    self.execute_action(agent_id, action).await;
                }
            }
            
            info!("=== Tick {} complete ===", tick);
        }
    }
    
    /// Stop the simulation (graceful shutdown)
    pub async fn stop(&self) {
        info!("Stopping simulation runtime");
        // TODO: Persist agent states
    }
    
    /// Get LLM model status
    pub fn get_model_status(&self) -> ModelStatus {
        ModelStatus {
            current_model: self.llm.current_model().to_string(),
            is_fallback: self.llm.is_using_fallback(),
            available_models: vec![
                self.llm.primary_model().to_string(),
                self.llm.fallback_model().unwrap_or_default().to_string(),
            ],
        }
    }
    
    /// Get recent agent activity logs
    pub async fn get_recent_logs(&self, _limit: usize) -> Vec<AgentActivityLog> {
        // TODO: Implement proper log storage
        // For now, return placeholder based on current state
        let mut logs = Vec::new();
        
        for entry in self.agents.iter() {
            let agent = entry.lock().await;
            logs.push(AgentActivityLog {
                timestamp: Utc::now(),
                agent_id: agent.id(),
                agent_name: agent.name().to_string(),
                action_type: "active".to_string(),
                details: format!("{} is running", agent.name()),
            });
        }
        
        logs
    }
    
    /// Get current tick count
    pub async fn get_tick_count(&self) -> u64 {
        *self.state.tick.read().await
    }
    
    /// Get last tick time (placeholder - returns current time)
    pub fn get_last_tick_time(&self) -> DateTime<Utc> {
        Utc::now()
    }
    
    /// Get current model name
    pub fn get_current_model(&self) -> String {
        self.llm.current_model().to_string()
    }
    
    /// Check if fallback model is available
    pub fn has_fallback_model(&self) -> bool {
        self.llm.fallback_model().is_some()
    }
    
    /// Get available models from Ollama
    pub async fn get_available_models(&self) -> Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
        self.llm.list_models().await.map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)
    }
    
    /// Get current model info
    pub async fn get_current_model_info(&self) -> serde_json::Value {
        serde_json::json!({
            "name": self.llm.current_model(),
            "is_fallback": self.llm.is_using_fallback(),
            "primary": self.llm.primary_model(),
            "fallback": self.llm.fallback_model(),
        })
    }
    
    /// Switch to a different model
    pub async fn switch_model(&self, model_name: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync + 'static>> {
        // For now, just return Ok - actual switching would require modifying Arc<OllamaClient>
        info!("Switching to model: {} (not yet implemented)", model_name);
        Ok(())
    }
    
    /// Clear all agents
    pub async fn clear_all_agents(&self) {
        info!("Clearing all {} agents", self.agents.len());
        self.agents.clear();
    }
    
    /// Get active meetings
    pub async fn get_active_meetings(&self) -> Vec<serde_json::Value> {
        let mut meetings = Vec::new();
        for entry in self.state.meetings.iter() {
            let meeting = entry.value();
            meetings.push(serde_json::json!({
                "company": meeting.company_symbol,
                "agenda": meeting.agenda.as_ref().map(|a| format!("{:?}", a)),
                "statements": meeting.statements.len(),
            }));
        }
        meetings
    }
    
    /// Start a board meeting
    pub async fn start_board_meeting(&self, company: String, agenda: String) {
        use crate::agent::types::AgendaItem;
        
        let agenda_item = match agenda.as_str() {
            "dividend" => AgendaItem::Dividend { amount: None },
            "expansion" => AgendaItem::Expansion { region: "Global".to_string(), investment: 5_000_000 },
            "cost_cutting" => AgendaItem::CostCutting { severity: "moderate".to_string() },
            "product_launch" => AgendaItem::ProductLaunch { product: "New Product".to_string() },
            _ => AgendaItem::ProductLaunch { product: agenda.clone() },
        };
        
        self.state.start_meeting(company.clone(), agenda_item);
        info!("Started board meeting for {} with agenda: {}", company, agenda);
    }
    
    /// Get meeting transcript (converted from statements)
    pub async fn get_meeting_transcript(&self, company: &str) -> Vec<MeetingEntry> {
        if let Some(meeting) = self.state.meetings.get(company) {
            meeting.statements.iter().map(|(agent_id, content)| {
                MeetingEntry {
                    speaker: format!("Agent {:?}", agent_id),
                    content: content.clone(),
                    timestamp: Utc::now(),
                }
            }).collect()
        } else {
            Vec::new()
        }
    }
    
    /// Deploy a scenario
    pub async fn deploy_scenario(&self, scenario_type: &str, severity: f64) {
        info!("Deploying scenario '{}' with severity {}", scenario_type, severity);
        // TODO: Implement actual scenario deployment
        // This would modify world context, inject news, etc.
    }
    
    /// Get scenario history
    pub async fn get_scenario_history(&self) -> Vec<ScenarioRecord> {
        // TODO: Implement scenario history tracking
        Vec::new()
    }
}

/// LLM model status
#[derive(Debug, Clone, Serialize)]
pub struct ModelStatus {
    pub current_model: String,
    pub is_fallback: bool,
    pub available_models: Vec<String>,
}

/// Agent activity log entry
#[derive(Debug, Clone, Serialize)]
pub struct AgentActivityLog {
    pub timestamp: DateTime<Utc>,
    pub agent_id: AgentId,
    pub agent_name: String,
    pub action_type: String,
    pub details: String,
}

impl Default for SimulationState {
    fn default() -> Self {
        Self::new()
    }
}
