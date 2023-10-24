
use std::future::Future;

use serde::{Serialize, Deserialize};

use hyper::StatusCode;
use axum::response::{Html, IntoResponse};


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ErrorReporting {
    Html,
    Json,
}

async fn handle_anyhow_error(err: anyhow::Error) -> impl IntoResponse {
    log::error!("Error: {}", err);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Html("<!doctype html><html><head><title>Internal Server Error</title></head><body><h1>Internal Server Error</h1></body></html>"),
    )
}

pub async fn result_into_response<T: IntoResponse, Fut: Future<Output = anyhow::Result<T>>>(
    result: Fut,
) -> impl IntoResponse {
    match result.await {
        Ok(response) => {
            response.into_response()
        },
        Err(e) => {
            handle_anyhow_error(e).await.into_response()
        }
    }
}
