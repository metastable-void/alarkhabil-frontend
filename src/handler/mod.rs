
mod api;


pub use api::api_v1_markdown_parse;
pub use api::api_v1_config_get;


use axum::response::IntoResponse;
use axum::http::{
    Request,
    StatusCode,
};
use axum::body::Body;

use crate::error_reporting::result_into_response;
use crate::config;
use crate::template::{HtmlTemplate, BaseTemplate};


pub async fn handler_root() -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;

        let template = BaseTemplate::try_new(
            "/",
            None,
            "<h1>It works!</h1>",
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
