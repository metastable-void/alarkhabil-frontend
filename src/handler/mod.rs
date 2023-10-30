
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
use crate::template::{
    HtmlTemplate,
    BaseTemplate,
    ContentMetaPageTemplate,
    ContentPostListTemplate,
    ContentMetaPageListItemTemplate,
    ContentSingleParagraphMessageTemplate,
    ContentPostListItemTemplate,
};
use crate::unix_time::UnixTime;
use crate::backend_api::BackendApi;
use crate::markdown;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorSummary {
    pub uuid: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelSummary {
    pub uuid: String,
    pub handle: String,
    pub name: String,
    pub lang: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostSummary {
    pub post_uuid: String,
    pub revision_uuid: String,
    pub revision_date: u64,
    pub title: String,
    pub author: Option<AuthorSummary>,
    pub channel: Option<ChannelSummary>,
}

pub async fn handler_root(request: Request<Body>) -> impl IntoResponse {
    result_into_response(async move {
        let url = request.uri().path().to_string();
        let config = config::load_config().await;

        let query = HashMap::new();
        let backend_api = BackendApi::new_v1(&config);
        let bytes = backend_api.get_bytes("post/list", query).await?;
        
        let posts: Vec<PostSummary> = serde_json::from_slice(&bytes)?;
        let mut html = String::new();
        if posts.is_empty() {
            let content_template = ContentSingleParagraphMessageTemplate {
                message: "There is no post in this list.".to_string(),
            };
            html.push_str(&content_template.render()?);
        }
        for post in posts {
            let updated_date = UnixTime::new(post.revision_date);
            let author = post.author.unwrap();
            let channel = post.channel.unwrap();
            let content_template = ContentPostListItemTemplate {
                post_uuid: post.post_uuid.clone(),
                title: post.title.clone(),
                date: updated_date.default_format_in_timezone(config.server_timezone()),
                date_value: updated_date.to_utc_datetime_string(),
                author_uuid: author.uuid.clone(),
                author_name: author.name.clone(),
                channel_handle: channel.handle.clone(),
                channel_name: channel.name.clone(),
                channel_lang: channel.lang.clone(),
            };
            html.push_str(&content_template.render()?);
        }

        let content_template = ContentPostListTemplate {
            post_list_title: "Latest Posts".to_string(),
            post_list_html: html,
        };

        let template = BaseTemplate::try_new(
            &url,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MetaPageListItem {
    page_name: String,
    updated_date: u64,
    title: String,
}

pub async fn handler_meta_list(
    request: Request<Body>,
) -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;
        let url = request.uri().path().to_string();

        let query = HashMap::new();

        let backend_api = BackendApi::new_v1(&config);
        let bytes = backend_api.get_bytes("meta/list", query).await?;
        
        let meta_pages: Vec<MetaPageListItem> = serde_json::from_slice(&bytes)?;
        let mut html = String::new();
        if meta_pages.is_empty() {
            let content_template = ContentSingleParagraphMessageTemplate {
                message: "There is no page in this list.".to_string(),
            };
            html.push_str(&content_template.render()?);
        }
        for meta_page in meta_pages {
            let updated_date = UnixTime::new(meta_page.updated_date);
            let content_template = ContentMetaPageListItemTemplate {
                page_name: meta_page.page_name.clone(),
                title: meta_page.title.clone(),
                date: updated_date.default_format_in_timezone(config.server_timezone()),
                date_value: updated_date.to_utc_datetime_string(),
            };
            html.push_str(&content_template.render()?);
        }

        let content_template = ContentPostListTemplate {
            post_list_title: "Meta Pages".to_string(),
            post_list_html: html,
        };

        let template = BaseTemplate::try_new(
            &url,
            Some("Meta Pages"),
            &content_template.render()?,
            &config,
        )?;

        Ok(HtmlTemplate(template).into_response())
    }).await
}
