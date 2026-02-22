//! News reporter agent implementation

use async_trait::async_trait;
use chrono::Utc;
use rand::seq::SliceRandom;
use serde::Deserialize;

use crate::agent::ollama::OllamaClient;
use crate::agent::types::*;

/// Generated news article
#[derive(Debug, Deserialize)]
struct GeneratedNews {
    headline: String,
    content: String,
    affected_companies: Vec<String>,
    sentiment: f64, // -1.0 to 1.0
    category: String,
}

/// News reporter agent that generates market news
pub struct NewsAgent {
    id: AgentId,
    name: String,
    specialty: Vec<String>, // Sectors they focus on
    style: String,          // Writing style
    memory: Vec<String>,
    llm: OllamaClient,
    ticks_since_last_story: u64,
}

impl NewsAgent {
    /// Create new news agent
    pub fn new(id: u64, name: String, specialty: Vec<String>, style: String, llm: OllamaClient) -> Self {
        Self {
            id: AgentId(id),
            name,
            specialty,
            style,
            memory: Vec::with_capacity(20),
            llm,
            ticks_since_last_story: 0,
        }
    }
    
    /// Generate news reporter via LLM
    pub async fn generate(
        id: u64,
        llm: &OllamaClient,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        #[derive(Deserialize)]
        struct GeneratedReporter {
            name: String,
            specialty_sectors: Vec<String>,
            writing_style: String,
        }
        
        let prompt = format!(
            r#"Create a financial journalist for an African stock market news service.

Generate JSON:
- name: Full name (African names preferred)
- specialty_sectors: Array of 2-3 sectors they focus on (e.g., ["Technology", "Agriculture", "Banking"])
- writing_style: Their journalistic approach (e.g., "investigative", "analytical", "sensational", "measured")

Respond ONLY with valid JSON."#
        );
        
        let generated: GeneratedReporter = llm.generate(&prompt).await?;
        
        Ok(Self::new(
            id,
            generated.name,
            generated.specialty_sectors,
            generated.writing_style,
            llm.clone(),
        ))
    }
    
    /// Decide if we should write a story this tick
    fn should_write_story(&self, ctx: &TickContext) -> bool {
        // Base probability increases with time since last story
        let base_prob = 0.1 + (self.ticks_since_last_story as f64 * 0.05);
        
        // More likely if there's significant market movement
        let market_activity = ctx.market_data.volatility.unwrap_or(0.0);
        let activity_boost = market_activity * 0.3;
        
        // Check if we have something newsworthy
        let recent_major_events = ctx
            .recent_news
            .iter()
            .filter(|n| n.sentiment.abs() > 0.5)
            .count();
        
        let event_boost = if recent_major_events > 0 { 0.2 } else { 0.0 };
        
        let total_prob = (base_prob + activity_boost + event_boost).min(0.8);
        
        rand::random::<f64>() < total_prob
    }
    
    /// Build news generation prompt
    fn build_news_prompt(&self, ctx: &TickContext) -> String {
        let weather_str = ctx
            .world_context
            .weather
            .iter()
            .map(|(city, w)| format!("{}: {} ({}°C)", city, w.condition, w.temperature))
            .collect::<Vec<_>>()
            .join("; ");
        
        let price_changes: Vec<String> = ctx
            .market_data
            .prices
            .iter()
            .map(|(sym, price)| {
                // Mock price change since we don't have historical data in context
                let change = rand::random::<f64>() * 10.0 - 5.0;
                format!("{}: {} ({:+.1}%)", sym, price, change)
            })
            .collect();
        
        let recent_stories = ctx
            .recent_news
            .iter()
            .take(5)
            .map(|n| format!("- {}", n.headline))
            .collect::<Vec<_>>()
            .join("\n");
        
        format!(
            r#"You are {}, a financial journalist for SMART Exchange News.

YOUR STYLE: {}
Your specialties: {}

WORLD CONTEXT:
- Date: {}
- Weather: {}
- Economic mood: {}
- Themes: {}

MARKET DATA:
Current prices and changes:
{}

RECENT STORIES (don't repeat these):
{}

WRITE A NEWS STORY:
Based on world context and market conditions, write a compelling financial news story.
Focus on your specialties if relevant, but can cover any major market news.

Consider:
- Weather impacts on agriculture/energy
- Market trends and price movements
- Company activities
- Economic conditions
- World events affecting markets

Write 1-2 paragraphs of content. Make it engaging and realistic.

Respond with JSON:
{{
  "headline": "Compelling headline (5-10 words)",
  "content": "Article content (100-200 words)",
  "affected_companies": ["TICKER1", "TICKER2"],
  "sentiment": number (-1.0 to 1.0),
  "category": "Earnings" | "ProductLaunch" | "ExecutiveNews" | "MarketAnalysis" | "ExternalEvent" | "Rumor"
}}"#,
            self.name,
            self.style,
            self.specialty.join(", "),
            ctx.world_context.current_date.format("%Y-%m-%d"),
            if weather_str.is_empty() { "No weather data" } else { &weather_str },
            ctx.world_context.economic_mood,
            ctx.world_context.headline_themes.join(", "),
            price_changes.join("\n"),
            recent_stories
        )
    }
    
    /// Create a story about a specific event (for admin-triggered scenarios)
    pub async fn create_story_about(
        &self,
        topic: &str,
        affected_companies: &[String],
        sentiment: f64,
    ) -> Result<NewsItem, Box<dyn std::error::Error>> {
        let prompt = format!(
            r#"You are {}, a financial journalist.

Write a news story about: {}

Affected companies: {:?}
Target sentiment: {:.1} ({})

Respond with JSON:
{{
  "headline": "...",
  "content": "...",
  "category": "..."
}}"#,
            self.name,
            topic,
            affected_companies,
            sentiment,
            if sentiment > 0.3 { "positive" } else if sentiment < -0.3 { "negative" } else { "neutral" }
        );
        
        let generated: GeneratedNews = self.llm.generate(&prompt).await?;
        
        let category = match generated.category.as_str() {
            "Earnings" => NewsCategory::Earnings,
            "ProductLaunch" => NewsCategory::ProductLaunch,
            "ExecutiveNews" => NewsCategory::ExecutiveNews,
            "MarketAnalysis" => NewsCategory::MarketAnalysis,
            "Rumor" => NewsCategory::Rumor,
            _ => NewsCategory::ExternalEvent,
        };
        
        Ok(NewsItem {
            headline: generated.headline,
            content: generated.content,
            source: self.name.clone(),
            category,
            affected_companies: affected_companies.to_vec(),
            sentiment,
            timestamp: Utc::now(),
        })
    }
}

#[async_trait]
impl Agent for NewsAgent {
    fn id(&self) -> AgentId {
        self.id
    }
    
    fn name(&self) -> &str {
        &self.name
    }
    
    fn agent_type(&self) -> AgentType {
        AgentType::NewsReporter
    }
    
    async fn tick(&mut self, ctx: &TickContext) -> Vec<AgentAction> {
        self.ticks_since_last_story += 1;
        
        // Only write stories periodically
        if !self.should_write_story(ctx) {
            return vec![AgentAction::Idle];
        }
        
        let prompt = self.build_news_prompt(ctx);
        
        match self.llm.generate::<GeneratedNews>(&prompt).await {
            Ok(generated) => {
                self.ticks_since_last_story = 0;
                
                let category = match generated.category.as_str() {
                    "Earnings" => NewsCategory::Earnings,
                    "ProductLaunch" => NewsCategory::ProductLaunch,
                    "ExecutiveNews" => NewsCategory::ExecutiveNews,
                    "MarketAnalysis" => NewsCategory::MarketAnalysis,
                    "Rumor" => NewsCategory::Rumor,
                    _ => NewsCategory::ExternalEvent,
                };
                
                let news = NewsItem {
                    headline: generated.headline,
                    content: generated.content,
                    source: self.name.clone(),
                    category,
                    affected_companies: generated.affected_companies,
                    sentiment: generated.sentiment.clamp(-1.0, 1.0),
                    timestamp: Utc::now(),
                };
                
                self.memory.push(format!("Published: {}", news.headline));
                if self.memory.len() > 20 {
                    self.memory.remove(0);
                }
                
                vec![
                    AgentAction::PublishNews(news),
                    AgentAction::Remember(format!("Published story about {:?}", category)),
                ]
            }
            Err(e) => {
                tracing::error!("News agent {} error: {}", self.name, e);
                vec![AgentAction::Idle]
            }
        }
    }
    
    async fn on_chat(&mut self, message: &str) -> String {
        let prompt = format!(
            r#"You are {}, a financial journalist with {} style.

A reader asks: "{}"

Respond as a journalist would - informative but engaging.
You can discuss your recent stories, market trends, or give your analysis.
Keep responses concise (1-3 sentences)."#,
            self.name,
            self.style,
            message
        );
        
        self.llm
            .generate_text(&prompt)
            .await
            .unwrap_or_else(|_| format!("{} is busy working on a story.", self.name))
    }
    
    fn get_memory(&self) -> &[String] {
        &self.memory
    }
}
