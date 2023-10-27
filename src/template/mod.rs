
mod base;

pub use base::BaseTemplate;

use std::sync::OnceLock;

use serde::{Serialize, Deserialize};

use askama::Template;
use axum::{
    http::StatusCode,
    response::{Html, IntoResponse, Response},
};

pub struct HtmlTemplate<T> (
    pub T
)
where T: Template;

impl<T> IntoResponse for HtmlTemplate<T>
where
    T: Template,
{
    fn into_response(self) -> Response {
        match self.0.render() {
            Ok(html) => Html(html).into_response(),
            Err(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to render template. Error: {err}"),
            ).into_response(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationItem {
    pub url: String, // relative or absolute url
    pub text: String, // link text
}

/// content of `<template>` tag
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentTemplateItem {
    pub template_id: String, // template-* id
    pub html: String, // link text
}

impl ContentTemplateItem {
    pub fn new(template_id: &str, html: &str) -> Self {
        Self {
            template_id: format!("template-{}", template_id),
            html: html.to_string(),
        }
    }

    pub fn new_map<T: Iterator<Item = (String, String)>>(pairs: T) -> Vec<Self> {
        pairs.map(|(template_id, html)| {
            Self::new(&template_id, &html)
        }).collect()
    }
}


// content templates

#[derive(Template)]
#[template(path = "content_meta_page.html")]
pub struct ContentMetaPageTemplate {
    pub content_heading: String,
    pub content_date: String,
    pub content_date_value: String, // for <time datetime="...">
    pub content_html: String,
}

pub static CONTENT_TEMPLATES: OnceLock<Vec<ContentTemplateItem>> = OnceLock::new();

pub fn content_templates() -> &'static Vec<ContentTemplateItem> {
    CONTENT_TEMPLATES.get_or_init(|| {
        ContentTemplateItem::new_map(vec![
            (
                "content-meta-page".to_string(),
                ContentMetaPageTemplate::render(&ContentMetaPageTemplate {
                    content_heading: "".to_string(),
                    content_date: "".to_string(),
                    content_date_value: "".to_string(),
                    content_html: "".to_string(),
                }).unwrap(),
            ),
            ("content-invites".to_string(), include_str!("../../templates/content_invites.html").to_string()),
        ].into_iter())
    })
}
