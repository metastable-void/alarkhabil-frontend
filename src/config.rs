//! This whole scheme fails when the default configuration is broken on compile time.


use std::env;
use std::sync::OnceLock;

use tokio::fs;

use chrono_tz::Tz;

use serde::{Serialize, Deserialize};

use crate::template::NavigationItem;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default = "Config::default_api_url")]
    pub api_url: String, // absolute url

    #[serde(default = "Config::default_site_name")]
    pub site_name: String, // also used for OGP

    #[serde(default = "Config::default_site_description")]
    pub site_description: String,

    #[serde(default = "Config::default_site_copyright")]
    pub site_copyright: String,

    #[serde(default = "Config::default_header_navigation")]
    pub header_navigation: Vec<NavigationItem>,

    #[serde(default = "Config::default_footer_navigation")]
    pub footer_navigation: Vec<NavigationItem>,

    #[serde(default = "Config::default_top_url")]
    pub top_url: String, // used for OGP

    #[serde(default = "Config::default_og_image")]
    pub og_image: String,

    #[serde(default = "Config::default_server_timezone")]
    pub server_timezone: String,
}

static CONFIG: OnceLock<Config> = OnceLock::new();

impl Config {
    pub fn default_ref() -> &'static Config {
        CONFIG.get_or_init(|| {
            let config_bytes = include_bytes!("../config-default.json");
            serde_json::from_slice(config_bytes).unwrap()
        })
    }

    pub fn default_api_url() -> String {
        Self::default_ref().api_url.clone()
    }

    pub fn default_site_name() -> String {
        Self::default_ref().site_name.clone()
    }

    pub fn default_site_description() -> String {
        Self::default_ref().site_description.clone()
    }

    pub fn default_site_copyright() -> String {
        Self::default_ref().site_copyright.clone()
    }

    pub fn default_header_navigation() -> Vec<NavigationItem> {
        Self::default_ref().header_navigation.clone()
    }

    pub fn default_footer_navigation() -> Vec<NavigationItem> {
        Self::default_ref().footer_navigation.clone()
    }

    pub fn default_top_url() -> String {
        Self::default_ref().top_url.clone()
    }

    pub fn default_og_image() -> String {
        Self::default_ref().og_image.clone()
    }

    pub fn default_server_timezone() -> String {
        Self::default_ref().server_timezone.clone()
    }

    pub fn server_timezone(&self) -> Tz {
        self.server_timezone.parse().unwrap_or_else(|_| Tz::UTC)
    }
}

impl Default for Config {
    fn default() -> Self {
        Config::default_ref().clone()
    }
}

pub async fn load_config() -> Config {
    let config_path = env::var("CONFIG_FILE").unwrap_or_else(|_| "config.json".to_string());
    let config_bytes = if let Ok(config_bytes) = fs::read(&config_path).await {
        config_bytes
    } else {
        return Config::default();
    };

    if let Ok(config) = serde_json::from_slice(&config_bytes) {
        config
    } else {
        Config::default()
    }
}
