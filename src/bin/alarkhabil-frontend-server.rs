
use std::env;
use std::net::SocketAddr;
use std::str::FromStr;
use std::path::PathBuf;

use hyper::{Request, StatusCode};
use axum::{
    routing::{get, post},
    Router,
    Server,
    response::{IntoResponse, Response},
    middleware::Next,
};
use tower_http::services::ServeDir;

use alarkhabil_frontend::handler;


static RESPONSE_HEADER_CSP: &str = "default-src 'self'; img-src 'self' data: blob:; connect-src 'self' http: https:; base-uri 'none'; form-action 'none'; frame-ancestors 'none';";
static RESPONSE_HEADER_X_FRAME_OPTIONS: &str = "DENY";
static RESPONSE_HEADER_X_CONTENT_TYPE_OPTIONS: &str = "nosniff";


fn is_dir(path: &str) -> bool {
    PathBuf::from(path).is_dir()
}

async fn handler_404() -> impl IntoResponse {
    StatusCode::NOT_FOUND
}

/// Middleware to add global headers to all responses.
async fn add_global_headers<B>(req: Request<B>, next: Next<B>) -> Response {
    let mut res = next.run(req).await;
    let headers = res.headers_mut();
    headers.append("content-security-policy", RESPONSE_HEADER_CSP.parse().unwrap());
    headers.append("x-frame-options", RESPONSE_HEADER_X_FRAME_OPTIONS.parse().unwrap());
    headers.append("x-content-type-options", RESPONSE_HEADER_X_CONTENT_TYPE_OPTIONS.parse().unwrap());
    res
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv()?;
    env_logger::init();

    // bind address
    let addr_string = env::var("LISTEN_ADDR").unwrap_or("".to_string());
    let addr = SocketAddr::from_str(&addr_string).unwrap_or(SocketAddr::from(([127, 0, 0, 1], 7780)));

    let branding_dir = if is_dir("branding") {
        "branding"
    } else {
        "branding-default"
    };

    // define routes
    let app = Router::new()
        .route("/", get(handler::handler_root))

        // assets directories
        .nest_service("/branding", ServeDir::new(branding_dir))
        .nest_service("/assets", ServeDir::new("assets"))

        // frontend api
        .route("/frontend/api/v1/markdown/parse", post(handler::api_v1_markdown_parse))
        .route("/frontend/api/v1/config/get", get(handler::api_v1_config_get))

        // 404 page
        .fallback(handler_404)

        // add global headers
        .layer(axum::middleware::from_fn(add_global_headers));

    // run server
    let server = Server::bind(&addr).serve(app.into_make_service());

    log::info!("Listening on http://{}", &addr);

    server.await?;

    Ok(())
}
