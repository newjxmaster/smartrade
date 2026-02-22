//! Board member agent implementation

use async_trait::async_trait;
use rand::Rng;
use serde::Deserialize;

use crate::agent::ollama::OllamaClient;
use crate::agent::types::*;

/// Board member voting decision
#[derive(Debug, Deserialize)]
struct BoardDecision {
    vote: String, // "FOR", "AGAINST", "ABSTAIN"
    statement: String,
    reasoning: String,
}

/// Board member agent that participates in corporate governance
pub struct BoardMemberAgent {
    id: AgentId,
    profile: ExecutiveProfile,
    company: String,
    memory: Vec<String>,
    llm: OllamaClient,
}

impl BoardMemberAgent {
    /// Create new board member
    pub fn new(
        id: u64,
        profile: ExecutiveProfile,
        company: String,
        llm: OllamaClient,
    ) -> Self {
        Self {
            id: AgentId(id),
            profile,
            company,
            memory: Vec::with_capacity(30),
            llm,
        }
    }
    
    /// Generate board member via LLM
    pub async fn generate(
        id: u64,
        company: &str,
        role: BoardRole,
        llm: &OllamaClient,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        #[derive(Deserialize)]
        struct GeneratedProfile {
            name: String,
            age: u32,
            background: String,
            personality: String,
        }
        
        let role_name = format!("{:?}", role);
        let prompt = format!(
            r#"Create an executive profile for the {} of {} (an African company).

Role: {}

Generate JSON with:
- name: Full name (African names preferred)
- age: Appropriate for role (30-70)
- background: Career history, 2-3 sentences
- personality: Leadership style, values, decision-making approach

Consider typical {} personality traits.

Respond ONLY with valid JSON."#,
            role_name, company, role_name, role_name
        );
        
        let generated: GeneratedProfile = llm.generate(&prompt).await?;
        
        let profile = ExecutiveProfile {
            name: generated.name,
            role,
            age: generated.age,
            background: generated.background,
            personality: generated.personality,
            reputation: rand::thread_rng().gen_range(0.6..1.0),
        };
        
        Ok(Self::new(id, profile, company.to_string(), llm.clone()))
    }
    
    /// Build prompt for board decision
    fn build_board_prompt(&self, meeting: &MeetingState, ctx: &TickContext) -> String {
        let agenda_desc = match &meeting.agenda {
            Some(AgendaItem::Dividend { amount }) => {
                if let Some(amt) = amount {
                    format!("Declare dividend of {} F.CFA per share", amt)
                } else {
                    "Cancel/reduce dividend".to_string()
                }
            }
            Some(AgendaItem::Expansion { region, investment }) => {
                format!("Expand operations to {} for {} F.CFA investment", region, investment)
            }
            Some(AgendaItem::CostCutting { severity }) => {
                format!("Implement {} cost-cutting measures", severity)
            }
            Some(AgendaItem::ProductLaunch { product }) => {
                format!("Launch new product: {}", product)
            }
            Some(AgendaItem::Acquisition { target }) => {
                format!("Acquire company: {}", target)
            }
            Some(AgendaItem::CrisisResponse { crisis }) => {
                format!("Respond to crisis: {}", crisis)
            }
            None => "General strategic discussion".to_string(),
        };
        
        let other_statements = meeting
            .statements
            .iter()
            .filter(|(id, _)| *id != self.id)
            .map(|(id, stmt)| format!("{}: {}", id.0, stmt))
            .collect::<Vec<_>>()
            .join("\n");
        
        let company_price = ctx.market_data.prices.get(&self.company).copied().unwrap_or(0);
        let recent_company_news: Vec<String> = ctx
            .recent_news
            .iter()
            .filter(|n| n.affected_companies.contains(&self.company))
            .map(|n| format!("- {}: {}", n.headline, &n.content[..n.content.len().min(100)]))
            .collect();
        
        format!(
            r#"You are {}, {} of {}.

YOUR PROFILE:
- Age: {}
- Background: {}
- Personality: {}
- Reputation: {:.0}%

BOARD MEETING IN SESSION
Agenda: {}

Company current stock price: {} F.CFA

Recent company news:
{}

Other board members have said:
{}

YOUR TURN TO SPEAK AND VOTE:
As {}, consider your role's perspective:
- Chairman: Facilitate, consider governance
- CEO: Growth, operations, execution
- CFO: Financial prudence, risk management
- Director: Shareholder value, oversight

Consider:
- Your personality and values
- Current company situation
- What other members said
- Market conditions

Respond with JSON:
{{
  "vote": "FOR" | "AGAINST" | "ABSTAIN",
  "statement": "Your public statement to the board (1-2 sentences)",
  "reasoning": "Private reasoning for your vote"
}}"#,
            self.profile.name,
            format!("{:?}", self.profile.role),
            self.company,
            self.profile.age,
            self.profile.background,
            self.profile.personality,
            self.profile.reputation * 100.0,
            agenda_desc,
            company_price,
            if recent_company_news.is_empty() {
                "No recent news".to_string()
            } else {
                recent_company_news.join("\n")
            },
            if other_statements.is_empty() {
                "No one has spoken yet".to_string()
            } else {
                other_statements
            },
            format!("{:?}", self.profile.role)
        )
    }
}

#[async_trait]
impl Agent for BoardMemberAgent {
    fn id(&self) -> AgentId {
        self.id
    }
    
    fn name(&self) -> &str {
        &self.profile.name
    }
    
    fn agent_type(&self) -> AgentType {
        AgentType::BoardMember {
            company: self.company.clone(),
            role: self.profile.role,
        }
    }
    
    async fn tick(&mut self, ctx: &TickContext) -> Vec<AgentAction> {
        let mut actions = Vec::new();
        
        // Check if there's an active meeting for our company
        if let Some(meeting) = ctx.active_meetings.get(&self.company) {
            // Only participate if we haven't voted yet
            if !meeting.votes.contains_key(&self.id) && meeting.agenda.is_some() {
                let prompt = self.build_board_prompt(meeting, ctx);
                
                match self.llm.generate::<BoardDecision>(&prompt).await {
                    Ok(decision) => {
                        let vote = match decision.vote.as_str() {
                            "FOR" => Vote::For,
                            "AGAINST" => Vote::Against,
                            _ => Vote::Abstain,
                        };
                        
                        self.memory.push(format!(
                            "Meeting on {:?}: Voted {:?} - {}",
                            meeting.agenda, vote, decision.reasoning
                        ));
                        
                        if self.memory.len() > 30 {
                            self.memory.remove(0);
                        }
                        
                        actions.push(AgentAction::Vote {
                            meeting_id: meeting.id,
                            vote,
                            statement: decision.statement,
                        });
                    }
                    Err(e) => {
                        tracing::error!("Board member {} LLM error: {}", self.profile.name, e);
                    }
                }
            }
        }
        
        actions
    }
    
    async fn on_chat(&mut self, message: &str) -> String {
        let prompt = format!(
            r#"You are {}, {} of {}.

Your profile: {}
Background: {}

A human (admin) is chatting with you: "{}"

Respond as a corporate executive would - professionally but with personality.
You can discuss company strategy, your views on governance, or respond to questions
about recent board decisions.

Keep responses concise (1-3 sentences) unless discussing complex matters."#,
            self.profile.name,
            format!("{:?}", self.profile.role),
            self.company,
            self.profile.personality,
            self.profile.background,
            message
        );
        
        self.llm
            .generate_text(&prompt)
            .await
            .unwrap_or_else(|_| format!("{} nods thoughtfully.", self.profile.name))
    }
    
    fn get_memory(&self) -> &[String] {
        &self.memory
    }
}
