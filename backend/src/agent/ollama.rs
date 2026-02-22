//! Ollama HTTP client for LLM integration

use reqwest::Client;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

/// Error types for Ollama client
#[derive(Debug, thiserror::Error)]
pub enum OllamaError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    
    #[error("JSON parsing failed: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("Ollama returned error: {0}")]
    Api(String),
}

/// Ollama API response
#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
    #[serde(default)]
    done: bool,
}

/// Ollama generate request
#[derive(Debug, Serialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    format: Option<String>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<serde_json::Value>,
}

/// HTTP client for Ollama API with fallback model support
#[derive(Debug, Clone)]
pub struct OllamaClient {
    base_url: String,
    primary_model: String,
    fallback_model: Option<String>,
    current_model: String,
    client: Client,
    system_prompt: Option<String>,
    use_fallback: bool,
}

impl OllamaClient {
    /// Create new Ollama client
    pub fn new(base_url: &str, model: &str) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .expect("Failed to build HTTP client");
        
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            primary_model: model.to_string(),
            fallback_model: None,
            current_model: model.to_string(),
            client,
            system_prompt: None,
            use_fallback: false,
        }
    }
    
    /// Create new Ollama client with fallback model
    /// 
    /// # Example
    /// ```
    /// use stockmart_backend::agent::OllamaClient;
    /// 
    /// let client = OllamaClient::with_fallback(
    ///     "http://localhost:11434",
    ///     "llama3.1:8b",      // Primary model
    ///     "llama3.2:3b"       // Fallback model
    /// );
    /// ```
    pub fn with_fallback(base_url: &str, primary_model: &str, fallback_model: &str) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .expect("Failed to build HTTP client");
        
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            primary_model: primary_model.to_string(),
            fallback_model: Some(fallback_model.to_string()),
            current_model: primary_model.to_string(),
            client,
            system_prompt: None,
            use_fallback: false,
        }
    }
    
    /// Set default system prompt for all requests
    pub fn with_system_prompt(mut self, prompt: impl Into<String>) -> Self {
        self.system_prompt = Some(prompt.into());
        self
    }
    
    /// Get current active model
    pub fn current_model(&self) -> &str {
        &self.current_model
    }
    
    /// Check if using fallback model
    pub fn is_using_fallback(&self) -> bool {
        self.use_fallback
    }
    
    /// Switch to fallback model
    pub fn enable_fallback(&mut self) {
        if let Some(ref fallback) = self.fallback_model {
            self.current_model = fallback.clone();
            self.use_fallback = true;
            tracing::info!("Switched to fallback model: {}", fallback);
        }
    }
    
    /// Switch back to primary model
    pub fn disable_fallback(&mut self) {
        self.current_model = self.primary_model.clone();
        self.use_fallback = false;
        tracing::info!("Switched to primary model: {}", self.primary_model);
    }
    
    /// Auto-select best available model
    pub async fn auto_select_model(&mut self) -> Result<(), OllamaError> {
        let models = self.list_models().await?;
        
        // Try primary model first
        if models.contains(&self.primary_model) {
            self.current_model = self.primary_model.clone();
            self.use_fallback = false;
            tracing::info!("Using primary model: {}", self.primary_model);
            return Ok(());
        }
        
        // Try fallback model
        if let Some(ref fallback) = self.fallback_model.clone() {
            if models.contains(fallback) {
                self.current_model = fallback.clone();
                self.use_fallback = true;
                tracing::info!("Primary model not available, using fallback: {}", fallback);
                return Ok(());
            }
        }
        
        // Neither model available
        Err(OllamaError::Api(format!(
            "Neither primary model '{}' nor fallback '{}' is available. Installed models: {:?}",
            self.primary_model,
            self.fallback_model.as_deref().unwrap_or("none"),
            models
        )))
    }
    
    /// Generate structured JSON output
    pub async fn generate<T: DeserializeOwned>(
        &self,
        prompt: impl AsRef<str>,
    ) -> Result<T, OllamaError> {
        let request = GenerateRequest {
            model: self.current_model.clone(),
            prompt: prompt.as_ref().to_string(),
            system: self.system_prompt.clone(),
            format: Some("json".to_string()),
            stream: false,
            options: Some(json!({
                "temperature": 0.7,
                "num_predict": 500,
            })),
        };
        
        let response = self
            .client
            .post(format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let text = response.text().await?;
            return Err(OllamaError::Api(text));
        }
        
        let ollama_resp: OllamaResponse = response.json().await?;
        
        // Parse JSON from response text
        let parsed: T = serde_json::from_str(&ollama_resp.response)?;
        Ok(parsed)
    }
    
    /// Generate free-form text response
    pub async fn generate_text(
        &self,
        prompt: impl AsRef<str>,
    ) -> Result<String, OllamaError> {
        let request = GenerateRequest {
            model: self.current_model.clone(),
            prompt: prompt.as_ref().to_string(),
            system: self.system_prompt.clone(),
            format: None,
            stream: false,
            options: Some(json!({
                "temperature": 0.8,
                "num_predict": 300,
            })),
        };
        
        let response = self
            .client
            .post(format!("{}/api/generate", self.base_url))
            .json(&request)
            .send()
            .await?;
        
        if !response.status().is_success() {
            let text = response.text().await?;
            return Err(OllamaError::Api(text));
        }
        
        let ollama_resp: OllamaResponse = response.json().await?;
        Ok(ollama_resp.response.trim().to_string())
    }
    
    /// Check if Ollama is available and current model is loaded
    pub async fn health_check(&self) -> Result<(), OllamaError> {
        let models = self.list_models().await?;
        if !models.contains(&self.current_model) {
            return Err(OllamaError::Api(format!(
                "Model '{}' not found. Available: {:?}",
                self.current_model, models
            )));
        }
        Ok(())
    }
    
    /// Check if specific model is available
    pub async fn check_model(&self, model: &str) -> Result<bool, OllamaError> {
        let models = self.list_models().await?;
        Ok(models.contains(&model.to_string()))
    }
    
    /// List available models
    pub async fn list_models(&self) -> Result<Vec<String>, OllamaError> {
        #[derive(Deserialize)]
        struct ModelsResponse {
            models: Vec<ModelInfo>,
        }
        
        #[derive(Deserialize)]
        struct ModelInfo {
            name: String,
        }
        
        let response = self
            .client
            .get(format!("{}/api/tags", self.base_url))
            .send()
            .await?;
        
        let models: ModelsResponse = response.json().await?;
        Ok(models.models.into_iter().map(|m| m.name).collect())
    }
    
    /// Get primary model name
    pub fn primary_model(&self) -> &str {
        &self.primary_model
    }
    
    /// Get fallback model name if set
    pub fn fallback_model(&self) -> Option<&str> {
        self.fallback_model.as_deref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    #[ignore] // Requires Ollama running
    async fn test_health_check() {
        let client = OllamaClient::new("http://localhost:11434", "qwen2.5:7b");
        let result = client.health_check().await;
        assert!(result.is_ok());
    }
    
    #[tokio::test]
    #[ignore] // Requires Ollama running
    async fn test_generate_text() {
        let client = OllamaClient::new("http://localhost:11434", "qwen2.5:7b");
        let response = client.generate_text("Say hello in French").await;
        assert!(response.is_ok());
        println!("Response: {}", response.unwrap());
    }
    
    #[tokio::test]
    #[ignore] // Requires Ollama running
    async fn test_generate_json() {
        #[derive(Deserialize, Debug)]
        struct TestResponse {
            greeting: String,
            language: String,
        }
        
        let client = OllamaClient::new("http://localhost:11434", "qwen2.5:7b");
        let response: Result<TestResponse, _> = client
            .generate("Respond with JSON: {\"greeting\": \"...\", \"language\": \"...\"} saying hello in Spanish")
            .await;
        
        assert!(response.is_ok());
        println!("Response: {:?}", response.unwrap());
    }
}
