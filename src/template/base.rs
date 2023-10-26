
use askama::Template;
use url::Url;

use crate::template::NavigationItem;
use crate::config::Config;

#[derive(Template)]
#[template(path = "base.html")]
pub struct BaseTemplate {
    pub url: String, // absolute url
    pub title: String, // title on <h1> tag, if any
    pub page_title: String, // full title on <title> tag
    pub site_name: String,
    pub site_description: String,
    pub site_copyright: String,
    pub header_navigation: Vec<NavigationItem>,
    pub footer_navigation: Vec<NavigationItem>,
    pub og_image: String, // absolute url
    pub content_html: String,
}

impl BaseTemplate {
    pub fn try_new(url: &str, title: Option<&str>, content_html: &str, config: &Config) -> Result<Self, anyhow::Error> {
        let top_url = Url::parse(&config.top_url)?;

        let title = title.unwrap_or("");
        let page_title = if title.is_empty() {
            config.site_name.clone()
        } else {
            format!("{} - {}", title, config.site_name)
        };

        let title = if title.is_empty() {
            config.site_name.clone()
        } else {
            title.to_string()
        };

        let url = top_url.join(url)?.to_string();
        let og_image = top_url.join(&config.og_image)?.to_string();

        Ok(Self {
            url,
            title,
            page_title,
            site_name: config.site_name.clone(),
            site_description: config.site_description.clone(),
            site_copyright: config.site_copyright.clone(),
            header_navigation: config.header_navigation.clone(),
            footer_navigation: config.footer_navigation.clone(),
            og_image,
            content_html: content_html.to_string(),
        })
    }
}
