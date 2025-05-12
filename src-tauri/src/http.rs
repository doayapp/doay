use crate::config;
use futures_util::StreamExt;
use logger::{error, info, trace, warn};
use reqwest::{header, header::HeaderMap, redirect::Policy, Client, Proxy};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::time::{Duration, Instant};
use tokio::time::sleep;

/* pub async fn fetch_get_with_proxy(url: &str, proxy_url: &str) -> Value {
    match get_with_proxy(url, Some(proxy_url)).await {
        Ok(text) => json!({"ok": true, "text": text.to_string()}),
        Err(e) => {
            error!("{}", e);
            json!({"ok": false, "errMsg": e})
        }
    }
}

pub async fn get_with_proxy(url: &str, proxy_url: Option<&str>) -> Result<String, String> {
    let client_builder = Client::builder().timeout(Duration::from_secs(10));

    let client_builder = if let Some(proxy_url) = proxy_url {
        Proxy::all(proxy_url)
            .map(|proxy| client_builder.proxy(proxy))
            .map_err(|e| format!("Failed to set proxy: {}", e))?
    } else {
        client_builder
    };

    let client = client_builder.build().map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(url)
        .header(
            header::USER_AGENT,
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            // "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        .send()
        .await
        .map_err(|e| format!("Failed to send HTTP request: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("Failed to fetch HTML page, status: {}", status));
    }

    match response.text().await {
        Ok(html) => {
            trace!("Successfully fetched HTML content from: {}, status: {}", url, status.as_u16());
            Ok(html)
        }
        Err(e) => Err(format!("Failed to parse response body: {}", e)),
    }
} */

pub async fn download_large_file(url: &str, proxy_url: &str, user_agent: &str, filepath: &str, timeout: u64) -> Value {
    match stream_download(url, proxy_url, user_agent, filepath, timeout).await {
        Ok(file_size) => json!({
            "ok": true,
            "file_size": file_size
        }),
        Err(e) => {
            error!("{}", e);
            json!({
                "ok": false,
                "error_message": e
            })
        }
    }
}

pub async fn stream_download(url: &str, proxy_url: &str, user_agent: &str, filepath: &str, timeout: u64) -> Result<u64, String> {
    let client_builder = Client::builder().timeout(Duration::from_secs(timeout));

    let client_builder = if !proxy_url.is_empty() {
        match Proxy::all(proxy_url) {
            Ok(proxy) => client_builder.proxy(proxy),
            Err(e) => return Err(format!("Invalid proxy: {}", e)),
        }
    } else {
        client_builder
    };

    let client = client_builder.build().map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(url)
        .header(header::USER_AGENT, user_agent)
        .send()
        .await
        .map_err(|e| format!("Failed to send HTTP request: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to download file, status: {}", response.status()));
    }

    let mut file = File::create(filepath).map_err(|e| format!("Failed to create local file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut total_size: u64 = 0;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Failed to read chunk: {}", e))?;
        file.write_all(&chunk).map_err(|e| format!("Failed to write chunk to file: {}", e))?;
        total_size += chunk.len() as u64;
    }

    info!("Successfully downloaded file from: {}, size: {} bytes", url, total_size);

    Ok(total_size)
}

pub async fn ping_test(url: &str, proxy_url: &str, user_agent: &str, count: usize, timeout: u64) -> Value {
    let client_builder = Client::builder().timeout(Duration::from_secs(timeout));

    let client_builder = if !proxy_url.is_empty() {
        match Proxy::all(proxy_url) {
            Ok(proxy) => client_builder.proxy(proxy),
            Err(e) => {
                warn!("Invalid proxy: {}", e);
                return json!({
                    "ok": false,
                    "error_message": format!("Invalid proxy: {}", e)
                });
            }
        }
    } else {
        client_builder
    };

    let client = match client_builder.build() {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("Failed to build HTTP client: {}", e);
            warn!("{}", msg);
            return json!({
                "ok": false,
                "error_message": msg
            });
        }
    };

    let mut latencies = Vec::new();
    let mut error_count = 0;

    for i in 0..count {
        let start = Instant::now();
        let res = client.get(url).header(header::USER_AGENT, user_agent).send().await;

        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    warn!("Ping attempt failed with HTTP status: {}", response.status());
                    error_count += 1;
                    continue;
                }

                let latency = start.elapsed().as_secs_f64() * 1000.0;
                latencies.push(latency);
            }
            Err(e) => {
                warn!("Ping attempt failed, i: {}, {:?}", i, e);
                error_count += 1;
            }
        }

        if i + 1 < count {
            sleep(Duration::from_millis(200)).await;
        }
    }

    if latencies.is_empty() {
        warn!("No successful ping responses");
        return json!({
            "ok": false,
            "error_message": "No successful ping responses",
            "error_count": error_count
        });
    }

    let avg_latency = latencies.iter().sum::<f64>() / latencies.len() as f64;

    json!({
        "ok": true,
        "avg_latency_ms": avg_latency,
        "samples": latencies,
        "error_count": error_count
    })
}

pub async fn jitter_test(url: &str, proxy_url: &str, user_agent: &str, count: usize, timeout: u64) -> Value {
    let client_builder = Client::builder().timeout(Duration::from_secs(timeout));

    let client_builder = if !proxy_url.is_empty() {
        match Proxy::all(proxy_url) {
            Ok(proxy) => client_builder.proxy(proxy),
            Err(e) => {
                warn!("Invalid proxy: {}", e);
                return json!({
                    "ok": false,
                    "error_message": format!("Invalid proxy: {}", e)
                });
            }
        }
    } else {
        client_builder
    };

    let client = match client_builder.build() {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("Failed to build HTTP client: {}", e);
            warn!("{}", msg);
            return json!({
                "ok": false,
                "error_message": msg
            });
        }
    };

    let mut latencies = Vec::new();
    let mut error_count = 0;

    for i in 0..count {
        let start = Instant::now();
        let res = client.get(url).header(header::USER_AGENT, user_agent).send().await;

        match res {
            Ok(response) => {
                if !response.status().is_success() {
                    warn!("Jitter ping failed with HTTP status: {}", response.status());
                    error_count += 1;
                    continue;
                }

                let latency = start.elapsed().as_secs_f64() * 1000.0;
                latencies.push(latency);
            }
            Err(e) => {
                warn!("Jitter ping failed at attempt {}: {:?}", i, e);
                error_count += 1;
            }
        }

        if i + 1 < count {
            sleep(Duration::from_millis(200)).await;
        }
    }

    if latencies.len() < 2 {
        warn!("Insufficient samples to calculate jitter");
        return json!({
            "ok": false,
            "error_message": "Insufficient samples to calculate jitter",
            "error_count": error_count
        });
    }

    let diffs: Vec<f64> = latencies.windows(2).map(|pair| (pair[1] - pair[0]).abs()).collect();
    let jitter = diffs.iter().sum::<f64>() / diffs.len() as f64;

    json!({
        "ok": true,
        "jitter_ms": jitter,
        "samples": latencies,
        "error_count": error_count
    })
}

pub async fn download_speed_test(url: &str, proxy_url: &str, user_agent: &str, timeout: u64) -> Value {
    let client_builder = Client::builder().timeout(Duration::from_secs(timeout)).redirect(Policy::limited(10));

    let client_builder = if !proxy_url.is_empty() {
        match Proxy::all(proxy_url) {
            Ok(proxy) => client_builder.proxy(proxy),
            Err(e) => {
                warn!("Invalid proxy: {}", e);
                return json!({
                    "ok": false,
                    "error_message": format!("Invalid proxy: {}", e)
                });
            }
        }
    } else {
        client_builder
    };

    let client = match client_builder.build() {
        Ok(c) => c,
        Err(e) => {
            warn!("Failed to build HTTP client: {}", e);
            return json!({
                "ok": false,
                "error_message": format!("Failed to build HTTP client: {}", e)
            });
        }
    };

    let start = Instant::now();

    match client.get(url).header(header::USER_AGENT, user_agent).send().await {
        Ok(resp) => {
            let mut total_bytes = 0usize;
            let mut stream = resp.bytes_stream();

            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(chunk) => {
                        total_bytes += chunk.len();
                        // trace!("Chunk len: {}, total bytes: {}", chunk.len(), total_bytes);
                    }
                    Err(e) => {
                        warn!("Error while reading chunk: {:?}", e);
                        return json!({
                            "ok": false,
                            "error_message": format!("Error reading download stream: {}", e)
                        });
                    }
                }
            }

            let duration = start.elapsed().as_secs_f64();

            if duration == 0.0 {
                warn!("Download duration too short (0s)");
                return json!({
                    "ok": false,
                    "error_message": "Download duration too short (0s)"
                });
            }

            let speed_mbps = (total_bytes as f64 * 8.0) / (duration * 1_000_000.0);

            json!({
                "ok": true,
                "speed_mbps": speed_mbps,
                "total_bytes": total_bytes,
                "duration_secs": duration
            })
        }
        Err(e) => {
            let msg = format!("Failed to initiate download request: {}", e);
            warn!("{}", msg);
            json!({
                "ok": false,
                "error_message": msg
            })
        }
    }
}

pub async fn upload_speed_test(url: &str, proxy_url: &str, user_agent: &str, size: usize, timeout: u64) -> Value {
    let size_bytes = size * 1024 * 1024; // MB -> bytes
    let buffer = vec![0u8; size_bytes];

    let client_builder = Client::builder().timeout(Duration::from_secs(timeout));

    let client_builder = if !proxy_url.is_empty() {
        match Proxy::all(proxy_url) {
            Ok(proxy) => client_builder.proxy(proxy),
            Err(e) => {
                warn!("Invalid proxy: {}", e);
                return json!({
                    "ok": false,
                    "error_message": format!("Invalid proxy: {}", e)
                });
            }
        }
    } else {
        client_builder
    };

    let client = match client_builder.build() {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("Failed to build HTTP client: {:?}", e);
            warn!("{}", msg);
            return json!({
                "ok": false,
                "error_message": msg
            });
        }
    };

    let start = Instant::now();

    let response = client.post(url).header(header::USER_AGENT, user_agent).body(buffer).send().await;

    match response {
        Ok(_) => {
            let duration = start.elapsed().as_secs_f64();
            let speed_mbps = (size_bytes as f64 * 8.0) / (duration * 1_000_000.0);
            json!({
                "ok": true,
                "speed_mbps": speed_mbps
            })
        }
        Err(e) => {
            let msg = format!("Failed to perform upload speed test: {}", e);
            warn!("{}", msg);
            json!({
                "ok": false,
                "error_message": msg
            })
        }
    }
}

pub async fn fetch_response_headers(url: &str, proxy_url: &str, user_agent: &str, timeout: u64) -> Value {
    let client_builder = Client::builder().timeout(Duration::from_secs(timeout)).redirect(Policy::limited(10));

    let client_builder = if !proxy_url.is_empty() {
        match Proxy::all(proxy_url) {
            Ok(proxy) => client_builder.proxy(proxy),
            Err(e) => {
                warn!("Invalid proxy: {}", e);
                return json!({
                    "ok": false,
                    "error_message": format!("Invalid proxy: {}", e)
                });
            }
        }
    } else {
        client_builder
    };

    let client = match client_builder.build() {
        Ok(c) => c,
        Err(e) => {
            warn!("Failed to build HTTP client: {}", e);
            return json!({
                "ok": false,
                "error_message": format!("Failed to build HTTP client: {}", e)
            });
        }
    };

    let response_result = client.get(url).header(header::USER_AGENT, user_agent).send().await;

    match response_result {
        Ok(response) => {
            let status = response.status().as_u16();
            let headers: &HeaderMap = response.headers();
            let result: HashMap<String, String> = headers
                .iter()
                .filter_map(|(k, v)| v.to_str().ok().map(|val| (k.to_string(), val.to_string())))
                .collect();

            json!({
                "ok": true,
                "status": status,
                "headers": result
            })
        }
        Err(err) => {
            let status = err.status();
            warn!("Request failed: {}", err);
            json!({
                "ok": false,
                "status": status.map(|s| s.as_u16()),
                "error_message": err.to_string()
            })
        }
    }
}

pub async fn fetch_text_content(url: &str, proxy_url: &str, user_agent: &str, timeout: u64) -> Value {
    let client_builder = Client::builder().timeout(Duration::from_secs(timeout)).redirect(Policy::limited(10));

    let client_builder = if !proxy_url.is_empty() {
        match Proxy::all(proxy_url) {
            Ok(proxy) => client_builder.proxy(proxy),
            Err(e) => {
                warn!("Invalid proxy: {}", e);
                return json!({
                    "ok": false,
                    "error_message": format!("Invalid proxy: {}", e)
                });
            }
        }
    } else {
        client_builder
    };

    let client = match client_builder.build() {
        Ok(c) => c,
        Err(e) => {
            warn!("Failed to build HTTP client: {}", e);
            return json!({
                "ok": false,
                "error_message": format!("Failed to build HTTP client: {}", e)
            });
        }
    };

    let response_result = client.get(url).header(header::USER_AGENT, user_agent).send().await;

    match response_result {
        Ok(response) => {
            let status = response.status().as_u16();
            let body = match response.text().await {
                Ok(text) => text,
                Err(e) => {
                    warn!("Failed to read response text: {}", e);
                    return json!({
                        "ok": false,
                        "status": status,
                        "error_message": format!("Failed to read response text: {}", e)
                    });
                }
            };

            trace!("Successfully fetched HTML content from: {}, status: {}", url, status);
            json!({
                "ok": true,
                "status": status,
                "body": body
            })
        }
        Err(err) => {
            let status = err.status();
            warn!("Request failed: {}", err);
            json!({
                "ok": false,
                "status": status.map(|s| s.as_u16()),
                "error_message": err.to_string()
            })
        }
    }
}

pub async fn fetch_get(url: &str, is_proxy: bool, user_agent: &str, timeout: u64) -> Value {
    let proxy_url = if is_proxy {
        get_default_proxy_url().unwrap_or_else(|| "".to_string())
    } else {
        "".to_string()
    };

    fetch_text_content(url, &proxy_url, user_agent, timeout).await
}

fn get_default_proxy_url() -> Option<String> {
    let config = config::get_config();
    Some(format!("socks5://{}:{}", config.ray_host, config.ray_socks_port))
}
