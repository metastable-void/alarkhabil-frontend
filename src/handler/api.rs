
use serde::{Serialize, Deserialize};

use axum::{
    response::IntoResponse,
    Json,
};

use crate::markdown;


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
