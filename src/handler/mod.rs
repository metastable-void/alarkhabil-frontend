
mod api;


pub use api::api_v1_markdown_parse;
pub use api::api_v1_config_get;
pub use api::api_v1_timestamp_format;


use std::collections::HashMap;

use axum::response::IntoResponse;
use axum::extract::Path;
use axum::http::{
    Request,
    StatusCode,
};
use axum::body::Body;

use askama::Template;

use serde::{Serialize, Deserialize};

use crate::error_reporting::result_into_response;
use crate::config;
use crate::template::{HtmlTemplate, BaseTemplate, ContentMetaPageTemplate};
use crate::unix_time::UnixTime;
use crate::backend_api::BackendApi;
use crate::markdown;


pub async fn handler_root() -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;

        let now = UnixTime::now();

        let content_template = ContentMetaPageTemplate {
            content_heading: "It works!".to_string(),
            content_date: now.default_format_in_timezone(config.server_timezone()),
            content_date_value: now.to_utc_datetime_string(),
            content_html: "<p>Hello, world!</p>".to_string(),
        };

        let template = BaseTemplate::try_new(
            "/",
            None,
            &content_template.render()?,
            &config,
        )?;

        Ok(HtmlTemplate(template))
    }).await
}

pub async fn handler_javascript_required(request: Request<Body>) -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;
        let url = request.uri().path().to_string();

        let template = BaseTemplate::try_new(
            &url,
            Some("Loading"),
            "<h1>Loading</h1><p>JavaScript is required to view this page.</p>",
            &config,
        )?;

        Ok((
            StatusCode::OK,
            HtmlTemplate(template)
        ))
    }).await
}

pub async fn handler_404(request: Request<Body>) -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;
        let url = request.uri().path().to_string();

        let template = BaseTemplate::try_new(
            &url,
            Some("Not Found"),
            "<h1>404: Not Found</h1>",
            &config,
        )?;

        Ok((
            StatusCode::NOT_FOUND,
            HtmlTemplate(template)
        ))
    }).await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MetaPage {
    page_name: String,
    updated_date: u64,
    title: String,
    text: String,
}

pub async fn handler_meta(
    Path(page_name): Path<String>,
    request: Request<Body>,
) -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;
        let url = request.uri().path().to_string();

        let mut query = HashMap::new();
        query.insert("page_name".to_string(), page_name);

        let backend_api = BackendApi::new_v1(&config);
        let bytes = if let Ok(bytes) = backend_api.get_bytes("meta/info", query).await {
            bytes
        } else {
            return Ok(handler_404(request).await.into_response());
        };
        
        let meta_page: MetaPage = serde_json::from_slice(&bytes)?;

        let updated_date = UnixTime::new(meta_page.updated_date);
        let html = markdown::to_html(&meta_page.text);

        let content_template = ContentMetaPageTemplate {
            content_heading: meta_page.title.clone(),
            content_date: updated_date.default_format_in_timezone(config.server_timezone()),
            content_date_value: updated_date.to_utc_datetime_string(),
            content_html: html,
        };

        let template = BaseTemplate::try_new(
            &url,
            Some(&meta_page.title),
            &content_template.render()?,
            &config,
        )?;

        Ok(HtmlTemplate(template).into_response())
    }).await
}
