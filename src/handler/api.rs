
use std::collections::HashMap;

use serde::{Serialize, Deserialize};

use axum::{
    response::IntoResponse,
    Json,
    extract::Query,
};

use crate::markdown;
use crate::config;
use crate::unix_time::UnixTime;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestMarkdownParse {
    markdown_text: String,
}

pub async fn api_v1_markdown_parse(
    Json(request): Json<RequestMarkdownParse>,
) -> impl IntoResponse {
    let html = markdown::to_html(&request.markdown_text);
    Json(serde_json::json!({
        "html": html,
    }))
}

pub async fn api_v1_config_get() -> impl IntoResponse {
    let config = config::load_config().await;
    Json(config)
}

pub async fn api_v1_timestamp_format(
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let config = config::load_config().await;
    let timestamp = params.get("timestamp").map(|s| s.as_str()).unwrap_or("");
    let timestamp = timestamp.parse::<u64>().unwrap_or(0);

    let timestamp = UnixTime::new(timestamp);

    let formatted = timestamp.default_format_in_timezone(config.server_timezone());
    Json(serde_json::json!({
        "datetime": timestamp.to_utc_datetime_string(),
        "formatted": formatted,
    }))
}
