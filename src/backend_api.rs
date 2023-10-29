
use std::collections::HashMap;

use url::Url;
use hyper::{Client, Uri};

use crate::config::Config;


#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Ord, Eq, Hash)]
pub enum BackendApiVersion {
    V1,
}

#[derive(Debug, Clone)]
pub struct BackendApi {
    config: Config,
    version: BackendApiVersion,
}

impl BackendApi {
    pub fn new(config: &Config, version: BackendApiVersion) -> Self {
        Self {
            config: config.clone(),
            version,
        }
    }

    pub fn new_v1(config: &Config) -> Self {
        Self::new(config, BackendApiVersion::V1)
    }

    fn get_url(&self, path: &str, query: &HashMap<String, String>) -> Result<String, anyhow::Error> {
        if self.version != BackendApiVersion::V1 {
            return Err(anyhow::anyhow!("Unsupported backend api version: {:?}", self.version));
        }
        let url = Url::parse(&self.config.api_url)?;
        let url = url.join("/api/v1/")?;
        let mut url = url.join(path)?;
        let mut query_pairs = url.query_pairs_mut();
        for (key, value) in query {
            query_pairs.append_pair(key, value);
        }
        drop(query_pairs);
        Ok(url.as_str().to_string())
    }

    pub async fn get_bytes(&self, path: &str, query: HashMap<String, String>) -> Result<Vec<u8>, anyhow::Error> {
        let url = self.get_url(path, &query)?;
        let uri: Uri = url.parse()?;
        let client = Client::new();
        let res = client.get(uri).await?;
        if !res.status().is_success() {
            return Err(anyhow::anyhow!("Failed to get url: {}", url));
        }
        let buf = hyper::body::to_bytes(res.into_body()).await?;
        Ok(buf.to_vec())
    }
}
