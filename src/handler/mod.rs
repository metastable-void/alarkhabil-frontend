
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
    ContentChannelListItemTemplate,
    ContentChannelTemplate,
    ContentPostTemplate,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelInfo {
    pub uuid: String,
    pub handle: String,
    pub name: String,
    pub created_date: u64,
    pub lang: String,
    pub description_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostInfo {
    pub post_uuid: String,
    pub channel: ChannelSummary,
    pub tags: Vec<String>,
    pub revision_uuid: String,
    pub revision_date: u64,
    pub title: String,
    pub revision_text: String,
    pub author: AuthorSummary,
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

pub async fn handler_channel_list(
    request: Request<Body>,
) -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;
        let url = request.uri().path().to_string();

        let query = HashMap::new();

        let backend_api = BackendApi::new_v1(&config);
        let bytes = backend_api.get_bytes("channel/list", query).await?;
        
        let channels: Vec<ChannelSummary> = serde_json::from_slice(&bytes)?;
        let mut html = String::new();
        if channels.is_empty() {
            let content_template = ContentSingleParagraphMessageTemplate {
                message: "There is no channel in this list.".to_string(),
            };
            html.push_str(&content_template.render()?);
        }
        for channel in channels {
            let content_template = ContentChannelListItemTemplate {
                channel_handle: channel.handle.clone(),
                channel_name: channel.name.clone(),
                channel_lang: channel.lang.clone(),
            };
            html.push_str(&content_template.render()?);
        }

        let content_template = ContentPostListTemplate {
            post_list_title: "Channels".to_string(),
            post_list_html: html,
        };

        let template = BaseTemplate::try_new(
            &url,
            Some("Channels"),
            &content_template.render()?,
            &config,
        )?;

        Ok(HtmlTemplate(template).into_response())
    }).await
}

pub async fn handler_channel(
    Path(channel_handle): Path<String>,
    request: Request<Body>,
) -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;
        let url = request.uri().path().to_string();

        let mut query = HashMap::new();
        query.insert("handle".to_string(), channel_handle);
        let backend_api = BackendApi::new_v1(&config);
        let bytes =  if let Ok(bytes) = backend_api.get_bytes("channel/info", query).await {
            bytes
        } else {
            return Ok(handler_404(request).await.into_response());
        };
        let channel: ChannelInfo = serde_json::from_slice(&bytes)?;

        let mut query = HashMap::new();
        query.insert("uuid".to_string(), (&channel.uuid).to_string());
        let bytes = backend_api.get_bytes("channel/posts", query).await?;
        let posts: Vec<PostSummary> = serde_json::from_slice(&bytes)?;
        
        let mut html = String::new();
        if posts.is_empty() {
            let content_template = ContentSingleParagraphMessageTemplate {
                message: "There is no channel in this list.".to_string(),
            };
            html.push_str(&content_template.render()?);
        }
        for post in &posts {
            let updated_date = UnixTime::new(post.revision_date);
            let author = post.author.clone().unwrap();
            let content_template = ContentPostListItemTemplate {
                post_uuid: post.post_uuid.clone(),
                title: post.title.clone(),
                date: updated_date.default_format_in_timezone(config.server_timezone()),
                date_value: updated_date.to_utc_datetime_string(),
                channel_handle: channel.handle.clone(),
                channel_name: channel.name.clone(),
                channel_lang: channel.lang.clone(),
                author_name: author.name.clone(),
                author_uuid: author.uuid.clone(),
            };
            html.push_str(&content_template.render()?);
        }

        let content_template = ContentChannelTemplate {
            channel_handle: channel.handle.clone(),
            channel_name: channel.name.clone(),
            channel_lang: channel.lang.clone(),
            channel_description_html: markdown::to_html(&channel.description_text),
            channel_date: UnixTime::new(channel.created_date).default_format_in_timezone(config.server_timezone()),
            channel_date_value: UnixTime::new(channel.created_date).to_utc_datetime_string(),
            post_list_html: html,
        };

        let template = BaseTemplate::try_new(
            &url,
            Some(channel.name.as_str()),
            &content_template.render()?,
            &config,
        )?;

        Ok(HtmlTemplate(template).into_response())
    }).await
}

pub async fn handler_post(
    Path((channel_handle, post_uuid)): Path<(String, String)>,
    request: Request<Body>,
) -> impl IntoResponse {
    result_into_response(async move {
        let config = config::load_config().await;
        let url = request.uri().path().to_string();

        let mut query = HashMap::new();
        query.insert("uuid".to_string(), post_uuid.clone());
        let backend_api = BackendApi::new_v1(&config);
        let bytes = if let Ok(bytes) = backend_api.get_bytes("post/info", query).await {
            bytes
        } else {
            return Ok(handler_404(request).await.into_response());
        };
        let post: PostInfo = serde_json::from_slice(&bytes)?;

        if channel_handle != post.channel.handle {
            return Ok(handler_404(request).await.into_response());
        }

        let updated_date = UnixTime::new(post.revision_date);
        let content_template = ContentPostTemplate {
            post_uuid: post.post_uuid.clone(),
            title: post.title.clone(),
            date: updated_date.default_format_in_timezone(config.server_timezone()),
            date_value: updated_date.to_utc_datetime_string(),
            channel_handle: post.channel.handle.clone(),
            channel_name: post.channel.name.clone(),
            channel_lang: post.channel.lang.clone(),
            content_html: markdown::to_html(&post.revision_text),
            author_uuid: post.author.uuid.clone(),
            author_name: post.author.name.clone(),
        };

        let template = BaseTemplate::try_new(
            &url,
            Some(post.title.as_str()),
            &content_template.render()?,
            &config,
        )?;

        Ok(HtmlTemplate(template).into_response())
    }).await
}
