
use axum::response::IntoResponse;

use crate::error_reporting::result_into_response;
use crate::config;
use crate::template::{HtmlTemplate, BaseTemplate};


pub async fn handler_root() -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await?;

        // defaults here are never displayed because there is a default config file compiled into the binary
        let template = BaseTemplate {
            title: "".to_string(),
            site_name: config.site_name.unwrap_or_else(|| "My Site".to_string()),
            site_description: config.site_description.unwrap_or_else(|| "My Site Description".to_string()),
            site_copyright: config.site_copyright.unwrap_or_else(|| "© 2021 My Name".to_string()),
            header_navigation: config.header_navigation.unwrap_or_else(|| vec![]),
            footer_navigation: config.footer_navigation.unwrap_or_else(|| vec![]),
            body_html: "Hello, world!".to_string(),
        };
        
        Ok(HtmlTemplate(template))
    }).await
}
