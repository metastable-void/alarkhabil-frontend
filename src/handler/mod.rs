
mod api;


pub use api::api_v1_markdown_parse;


use axum::response::IntoResponse;

use crate::error_reporting::result_into_response;
use crate::config;
use crate::template::{HtmlTemplate, BaseTemplate};


pub async fn handler_root() -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;

        // defaults here are never displayed because there is a default config file compiled into the binary
        let template = BaseTemplate::try_new(
            "/",
            None,
            "<h1>It works!</h1>",
            &config,
        )?;

        Ok(HtmlTemplate(template))
    }).await
}
