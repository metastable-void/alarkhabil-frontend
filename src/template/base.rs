
use askama::Template;

use crate::template::NavigationItem;

#[derive(Template)]
#[template(path = "base.html")]
pub struct BaseTemplate {
    pub title: String,
    pub site_name: String,
    pub site_description: String,
    pub site_copyright: String,
    pub body_html: String,
    pub header_navigation: Vec<NavigationItem>,
    pub footer_navigation: Vec<NavigationItem>,
}
