
mod api;


pub use api::api_v1_markdown_parse;
pub use api::api_v1_config_get;
pub use api::api_v1_timestamp_format;


use axum::response::IntoResponse;
use axum::http::{
    Request,
    StatusCode,
};
use axum::body::Body;

use askama::Template;

use crate::error_reporting::result_into_response;
use crate::config;
use crate::template::{HtmlTemplate, BaseTemplate, ContentMetaPageTemplate};
use crate::unix_time::UnixTime;


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
