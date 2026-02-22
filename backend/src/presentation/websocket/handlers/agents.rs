//! AI Agent management handlers for WebSocket connections.
//!
//! Handles admin interactions with AI agents including:
//! - Listing all agents and their status
//! - Chatting with specific agents
//! - Viewing agent activity logs
//! - Managing Ollama models
//! - Spawning new agents
//! - Observing board meetings
//! - Deploying scenarios

use axum::extract::ws::{Message, WebSocket};
use std::sync::Arc;
use tracing::{info, warn};

use crate::agent::types::{AgentId, ChatResponse};
use crate::api::ws::AppState;
use crate::presentation::websocket::messages::ServerMessage;

use super::send_message;

/// Handle agent-related admin actions
pub async fn handle_agent_action(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    user_id: Option<u64>,
    action: &str,
    payload: serde_json::Value,
) {
    // Verify admin access
    let uid = match verify_admin_access(sender, &state, user_id).await {
        Some(id) => id,
        None => return,
    };

    // Check if agent runtime is available
    if state.agent_runtime.is_none() {
        let msg = ServerMessage::error("AGENTS_NOT_AVAILABLE", "AI Agent runtime is not running. Ollama may be unavailable.");
        send_message(sender, &msg).await;
        return;
    }

    match action {
        // Agent Management
        "get_agent_status" => handle_get_agent_status(sender, state).await,
        "list_agents" => handle_list_agents(sender, state).await,
        "chat_with_agent" => handle_chat_with_agent(sender, state, &payload).await,
        "get_agent_profile" => handle_get_agent_profile(sender, state, &payload).await,
        "get_agent_logs" => handle_get_agent_logs(sender, state, &payload).await,
        "spawn_traders" => handle_spawn_traders(sender, state, &payload, uid).await,
        "clear_agents" => handle_clear_agents(sender, state, uid).await,
        
        // Model Management
        "get_ollama_models" => handle_get_ollama_models(sender, state).await,
        "get_current_model" => handle_get_current_model(sender, state).await,
        "switch_model" => handle_switch_model(sender, state, &payload, uid).await,
        
        // Board Meetings
        "get_active_meetings" => handle_get_active_meetings(sender, state).await,
        "start_meeting" => handle_start_meeting(sender, state, &payload, uid).await,
        "join_meeting" => handle_join_meeting(sender, state, &payload).await,
        
        // Scenarios
        "deploy_scenario" => handle_deploy_scenario(sender, state, &payload, uid).await,
        "get_scenario_history" => handle_get_scenario_history(sender, state).await,
        
        _ => {
            let msg = ServerMessage::error("UNKNOWN_ACTION", &format!("Unknown agent action: {}", action));
            send_message(sender, &msg).await;
        }
    }
}

// ============================================================================
// AGENT STATUS & LISTING
// ============================================================================

async fn handle_get_agent_status(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
) {
    let runtime = state.agent_runtime.as_ref().unwrap();
    let agents = runtime.list_agents().await;
    let tick_count = runtime.get_tick_count().await;
    
    let status = serde_json::json!({
        "enabled": true,
        "running": true,
        "agent_count": agents.len(),
        "tick_count": tick_count,
        "last_tick": runtime.get_last_tick_time(),
        "current_model": runtime.get_current_model(),
        "fallback_available": runtime.has_fallback_model(),
    });
    
    let msg = ServerMessage::AgentStatus { status };
    send_message(sender, &msg).await;
}

async fn handle_list_agents(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
) {
    let runtime = state.agent_runtime.as_ref().unwrap();
    let agents = runtime.list_agents().await;
    
    let agent_infos: Vec<serde_json::Value> = agents
        .into_iter()
        .map(|a| {
            serde_json::json!({
                "id": a.id.0,
                "name": a.name,
                "type": a.agent_type,
                "status": a.status,
                "last_activity": a.last_activity,
            })
        })
        .collect();

    let msg = ServerMessage::AgentList { agents: agent_infos };
    send_message(sender, &msg).await;
}

// ============================================================================
// AGENT CHAT & PROFILES
// ============================================================================

async fn handle_chat_with_agent(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    payload: &serde_json::Value,
) {
    let agent_id = payload.get("agent_id").and_then(|v| v.as_u64()).map(AgentId);
    let message = payload.get("message").and_then(|v| v.as_str());

    if agent_id.is_none() || message.is_none() {
        let msg = ServerMessage::error("INVALID_PARAMS", "agent_id and message required");
        send_message(sender, &msg).await;
        return;
    }

    let agent_id = agent_id.unwrap();
    let message = message.unwrap();

    let runtime = state.agent_runtime.as_ref().unwrap();
    match runtime.chat_with_agent(agent_id, message).await {
        Some(response) => {
            let resp_msg = ServerMessage::AgentChatResponse {
                agent_id: agent_id.0,
                response,
            };
            send_message(sender, &resp_msg).await;
        }
        None => {
            let msg = ServerMessage::error("AGENT_NOT_FOUND", &format!("Agent {} not found", agent_id.0));
            send_message(sender, &msg).await;
        }
    }
}

async fn handle_get_agent_profile(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    payload: &serde_json::Value,
) {
    let agent_id = payload.get("agent_id").and_then(|v| v.as_u64()).map(AgentId);

    if agent_id.is_none() {
        let msg = ServerMessage::error("INVALID_PARAMS", "agent_id required");
        send_message(sender, &msg).await;
        return;
    }

    let agent_id = agent_id.unwrap();
    let runtime = state.agent_runtime.as_ref().unwrap();

    match runtime.get_agent_profile(agent_id).await {
        Some(ChatResponse::AgentProfile { id: _, name, agent_type, memory, .. }) => {
            let msg = ServerMessage::AgentProfile {
                id: agent_id.0,
                name,
                agent_type: format!("{:?}", agent_type),
                recent_thoughts: memory.into_iter().rev().take(5).collect(),
            };
            send_message(sender, &msg).await;
        }
        Some(_) => {
            let msg = ServerMessage::error("INVALID_RESPONSE", "Unexpected response type");
            send_message(sender, &msg).await;
        }
        None => {
            let msg = ServerMessage::error("AGENT_NOT_FOUND", &format!("Agent {} not found", agent_id.0));
            send_message(sender, &msg).await;
        }
    }
}

async fn handle_get_agent_logs(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    _payload: &serde_json::Value,
) {
    let runtime = state.agent_runtime.as_ref().unwrap();
    let logs: Vec<serde_json::Value> = runtime.get_recent_logs(50).await
        .into_iter()
        .map(|log| serde_json::json!({
            "timestamp": log.timestamp,
            "agent_id": log.agent_id.0,
            "agent_name": log.agent_name,
            "action_type": log.action_type,
            "details": log.details,
        }))
        .collect();
    
    let msg = ServerMessage::AgentLogs { logs };
    send_message(sender, &msg).await;
}

// ============================================================================
// AGENT SPAWNING
// ============================================================================

async fn handle_spawn_traders(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    payload: &serde_json::Value,
    uid: u64,
) {
    let count = payload.get("count").and_then(|v| v.as_u64()).unwrap_or(5);
    let count = count.min(50) as u32; // Max 50 at once

    let runtime = state.agent_runtime.as_ref().unwrap();
    info!("Admin {} spawning {} trader agents", uid, count);
    
    runtime.spawn_initial_agents(count, 0).await;
    
    let msg = ServerMessage::System {
        message: format!("Spawned {} new trader agents", count),
    };
    send_message(sender, &msg).await;
}

async fn handle_clear_agents(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    uid: u64,
) {
    let runtime = state.agent_runtime.as_ref().unwrap();
    info!("Admin {} requested clearing all agents", uid);
    
    runtime.clear_all_agents().await;
    
    let msg = ServerMessage::System {
        message: "All agents cleared".to_string(),
    };
    send_message(sender, &msg).await;
}

// ============================================================================
// MODEL MANAGEMENT
// ============================================================================

async fn handle_get_ollama_models(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
) {
    let runtime = state.agent_runtime.as_ref().unwrap();
    
    match runtime.get_available_models().await {
        Ok(models) => {
            let models: Vec<serde_json::Value> = models.into_iter()
                .map(|m| serde_json::json!({"name": m}))
                .collect();
            let msg = ServerMessage::OllamaModels { models };
            send_message(sender, &msg).await;
        }
        Err(e) => {
            let error_msg = format!("Failed to get models: {}", e);
            let msg = ServerMessage::error("MODEL_ERROR", &error_msg);
            send_message(sender, &msg).await;
        }
    }
}

async fn handle_get_current_model(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
) {
    let runtime = state.agent_runtime.as_ref().unwrap();
    let model_info = runtime.get_current_model_info().await;
    
    let msg = ServerMessage::CurrentModel { model: model_info };
    send_message(sender, &msg).await;
}

async fn handle_switch_model(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    payload: &serde_json::Value,
    uid: u64,
) {
    let model_name = payload.get("model").and_then(|v| v.as_str());
    
    if model_name.is_none() {
        let msg = ServerMessage::error("INVALID_PARAMS", "model name required");
        send_message(sender, &msg).await;
        return;
    }
    
    let model_name = model_name.unwrap();
    let runtime = state.agent_runtime.as_ref().unwrap();
    
    info!("Admin {} switching to model: {}", uid, model_name);
    
    match runtime.switch_model(model_name).await {
        Ok(_) => {
            let msg = ServerMessage::System {
                message: format!("Switched to model: {}", model_name),
            };
            send_message(sender, &msg).await;
        }
        Err(e) => {
            let error_msg = format!("Failed to switch model: {}", e);
            let msg = ServerMessage::error("MODEL_SWITCH_FAILED", &error_msg);
            send_message(sender, &msg).await;
        }
    }
}

// ============================================================================
// BOARD MEETINGS
// ============================================================================

async fn handle_get_active_meetings(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
) {
    let runtime = state.agent_runtime.as_ref().unwrap();
    let meetings = runtime.get_active_meetings().await;
    
    let msg = ServerMessage::ActiveMeetings { meetings };
    send_message(sender, &msg).await;
}

async fn handle_start_meeting(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    payload: &serde_json::Value,
    uid: u64,
) {
    let company = payload.get("company").and_then(|v| v.as_str()).unwrap_or("UNKNOWN");
    let agenda = payload.get("agenda").and_then(|v| v.as_str()).unwrap_or("General");
    
    let runtime = state.agent_runtime.as_ref().unwrap();
    info!("Admin {} starting meeting for {} (agenda: {})", uid, company, agenda);
    
    runtime.start_board_meeting(company.to_string(), agenda.to_string()).await;
    
    let msg = ServerMessage::System {
        message: format!("Meeting started for {} ({})", company, agenda),
    };
    send_message(sender, &msg).await;
}

async fn handle_join_meeting(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    payload: &serde_json::Value,
) {
    let company = payload.get("company").and_then(|v| v.as_str()).unwrap_or("UNKNOWN");
    let runtime = state.agent_runtime.as_ref().unwrap();
    
    let transcript: Vec<serde_json::Value> = runtime.get_meeting_transcript(company).await
        .into_iter()
        .map(|entry| serde_json::json!({
            "speaker": entry.speaker,
            "content": entry.content,
            "timestamp": entry.timestamp,
        }))
        .collect();
    
    let msg = ServerMessage::MeetingTranscript {
        company: company.to_string(),
        transcript,
    };
    send_message(sender, &msg).await;
}

// ============================================================================
// SCENARIOS
// ============================================================================

async fn handle_deploy_scenario(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
    payload: &serde_json::Value,
    uid: u64,
) {
    let scenario_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("unknown");
    let severity = payload.get("severity").and_then(|v| v.as_f64()).unwrap_or(0.5);
    
    let runtime = state.agent_runtime.as_ref().unwrap();
    info!("Admin {} deploying scenario: {} (severity: {})", uid, scenario_type, severity);
    
    runtime.deploy_scenario(scenario_type, severity).await;
    
    let msg = ServerMessage::System {
        message: format!("Scenario '{}' deployed (severity: {:.0}%)", scenario_type, severity * 100.0),
    };
    send_message(sender, &msg).await;
}

async fn handle_get_scenario_history(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: Arc<AppState>,
) {
    let runtime = state.agent_runtime.as_ref().unwrap();
    let scenarios: Vec<serde_json::Value> = runtime.get_scenario_history().await
        .into_iter()
        .map(|s| serde_json::json!({
            "scenario_type": s.scenario_type,
            "severity": s.severity,
            "deployed_at": s.deployed_at,
        }))
        .collect();
    
    let msg = ServerMessage::ScenarioHistory { scenarios };
    send_message(sender, &msg).await;
}

// ============================================================================
// HELPER
// ============================================================================

async fn verify_admin_access(
    sender: &mut futures::stream::SplitSink<WebSocket, Message>,
    state: &Arc<AppState>,
    user_id: Option<u64>,
) -> Option<u64> {
    let uid = match user_id {
        Some(id) => id,
        None => {
            let msg = ServerMessage::error("NOT_AUTHENTICATED", "Admin access required");
            send_message(sender, &msg).await;
            return None;
        }
    };

    match state.user_repo.find_by_id(uid).await {
        Ok(Some(user)) => {
            if !user.role.is_admin() {
                let msg = ServerMessage::error("PERMISSION_DENIED", "Admin role required");
                send_message(sender, &msg).await;
                return None;
            }
            Some(uid)
        }
        _ => {
            let msg = ServerMessage::error("NOT_FOUND", "User not found");
            send_message(sender, &msg).await;
            None
        }
    }
}
