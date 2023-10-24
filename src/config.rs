
use std::env;

use tokio::fs;

use serde::{Serialize, Deserialize};

use crate::template::NavigationItem;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub site_name: Option<String>,
    pub site_description: Option<String>,
    pub site_copyright: Option<String>,
    pub header_navigation: Option<Vec<NavigationItem>>,
    pub footer_navigation: Option<Vec<NavigationItem>>,
}

fn load_default_config_bytes() -> Vec<u8> {
    let config_bytes = include_bytes!("../config-default.json");
    config_bytes.to_vec()
}

pub async fn load_config() -> Result<Config, anyhow::Error> {
    let config_path = env::var("CONFIG_FILE").unwrap_or_else(|_| "config.json".to_string());
    let config_bytes = if let Ok(config_bytes) = fs::read(&config_path).await {
        config_bytes
    } else {
        load_default_config_bytes()
    };
    let config: Config = serde_json::from_slice(&config_bytes)?;
    Ok(config)
}
