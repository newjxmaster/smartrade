//! AI Agent Simulation Framework
//!
//! Provides autonomous agents that trade, make decisions, and interact
//! with the market simulation powered by local LLM (Ollama).

pub mod board;
pub mod news;
pub mod ollama;
pub mod runtime;
pub mod trader;
pub mod types;

pub use board::BoardMemberAgent;
pub use news::NewsAgent;
pub use ollama::OllamaClient;
pub use runtime::SimulationRuntime;
pub use trader::TraderAgent;
pub use types::*;

// Re-export commonly used types
pub use std::collections::HashMap;
