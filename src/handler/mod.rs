
mod api;


pub use api::api_v1_markdown_parse;
pub use api::api_v1_config_get;


use std::time::SystemTime;

use chrono_tz::Tz;
use chrono::prelude::*;

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


pub fn get_sys_time_in_secs() -> u64 {
    match SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
        Ok(n) => n.as_secs(),
        Err(_) => panic!("SystemTime before UNIX EPOCH!"),
    }
}

pub fn unix_time_to_datetime(secs: u64, timezone: Tz) -> DateTime<Tz>
{
    let utc_datetime = NaiveDateTime::from_timestamp_opt(secs as i64, 0).unwrap();
    timezone.from_utc_datetime(&utc_datetime)
}

pub async fn handler_root() -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;

        let now = unix_time_to_datetime(get_sys_time_in_secs(), config.server_timezone());

        let content_template = ContentMetaPageTemplate {
            content_heading: "It works!".to_string(),
            content_date: now.format("%Y-%m-%d %H:%M:%S %Z").to_string(),
            content_date_value: now.format("%Y-%m-%dT%H:%M:%S%z").to_string(),
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
