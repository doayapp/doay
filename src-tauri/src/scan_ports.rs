use crate::dirs;
use logger::error;
use serde_json::{json, Value};
use std::{
    io::{Error, ErrorKind, SeekFrom},
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{
    fs::{self, File, OpenOptions},
    io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt, BufReader, BufWriter},
    net::{lookup_host, TcpStream},
    sync::{Mutex, Semaphore},
    task,
};

#[derive(Clone)]
struct AsyncThreadLimiter {
    semaphore: Arc<Semaphore>,
}

impl AsyncThreadLimiter {
    pub fn new(limit: usize) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(limit)),
        }
    }

    pub async fn acquire(&self) {
        self.semaphore.acquire().await.unwrap().forget();
    }

    pub fn release(&self) {
        self.semaphore.add_permits(1);
    }
}

async fn init_log_writer(path: &Path) -> Result<Arc<Mutex<BufWriter<File>>>, Error> {
    fs::File::create(path).await?;
    let file = OpenOptions::new().append(true).open(path).await?;
    Ok(Arc::new(Mutex::new(BufWriter::new(file))))
}

async fn log_port(log: &Arc<Mutex<BufWriter<File>>>, port: u16) {
    let mut writer = log.lock().await;
    if writer.write_all(format!("{}\n", port).as_bytes()).await.is_err() {
        error!("Failed to write log");
    }
    if writer.flush().await.is_err() {
        error!("Failed to flush log");
    }
}

async fn run_scan_ports(host: &str, start_port: u16, end_port: u16, max_threads: usize, timeout_ms: u64) -> Result<Value, Error> {
    let test_addr = format!("{}:0", host);
    if lookup_host(&test_addr).await.ok().and_then(|mut addrs| addrs.next()).is_none() {
        return Err(Error::new(ErrorKind::InvalidInput, format!("Failed to resolve hostname: {}", host)));
    }

    let logs_dir = dirs::get_doay_logs_dir().ok_or_else(|| Error::new(ErrorKind::NotFound, "log dir not found"))?;
    let open_log = init_log_writer(&logs_dir.join("scan_ports_open.log")).await?;
    let timeout_log = init_log_writer(&logs_dir.join("scan_ports_timeout.log")).await?;
    let refused_log = init_log_writer(&logs_dir.join("scan_ports_refused.log")).await?;

    let timeout = Duration::from_millis(timeout_ms);
    let start_time = Instant::now();
    let counter = Arc::new(Mutex::new((0, 0, 0)));
    let limiter = AsyncThreadLimiter::new(max_threads);

    let mut handles = vec![];

    for port in start_port..=end_port {
        let host = host.to_string();
        let limiter = limiter.clone();
        let open_log = open_log.clone();
        let timeout_log = timeout_log.clone();
        let refused_log = refused_log.clone();
        let counter = counter.clone();
        let timeout = timeout.clone();

        let handle = task::spawn(async move {
            limiter.acquire().await;
            let addr = format!("{}:{}", host, port);
            let sock_addr = lookup_host(addr).await.ok().and_then(|mut a| a.next());

            if let Some(sock_addr) = sock_addr {
                match tokio::time::timeout(timeout, TcpStream::connect(sock_addr)).await {
                    Ok(Ok(_)) => {
                        log_port(&open_log, port).await;
                        counter.lock().await.0 += 1;
                    }
                    Ok(Err(_)) => {
                        log_port(&refused_log, port).await;
                        counter.lock().await.1 += 1;
                    }
                    Err(_) => {
                        log_port(&timeout_log, port).await;
                        counter.lock().await.2 += 1;
                    }
                }
            }
            limiter.release();
        });

        handles.push(handle);
    }

    for handle in handles {
        let _ = handle.await;
    }

    let elapsed = start_time.elapsed();
    let (open_count, refused_count, timeout_count) = *counter.lock().await;

    Ok(json!({
        "ok": true,
        "elapsed_secs": elapsed.as_secs_f64(),
        "open_count": open_count,
        "refused_count": refused_count,
        "timeout_count": timeout_count,
    }))
}

pub async fn start_scan_ports(host: &str, start_port: u16, end_port: u16, max_threads: usize, timeout_ms: u64) -> Value {
    match run_scan_ports(host, start_port, end_port, max_threads, timeout_ms).await {
        Ok(result) => result,
        Err(e) => {
            error!("Scan failed: {}", e);
            json!({ "ok": false, "error_message": e.to_string() })
        }
    }
}

pub async fn read_open_log() -> String {
    match get_log_path("scan_ports_open.log") {
        Some(path) => read_full_file(path.to_str().unwrap_or_default()).await,
        None => {
            error!("Open log path not found");
            String::new()
        }
    }
}

pub async fn read_timeout_log() -> String {
    match get_log_path("scan_ports_timeout.log") {
        Some(path) => read_tail_file(path.to_str().unwrap_or_default(), 100 * 1024).await,
        None => {
            error!("Timeout log path not found");
            String::new()
        }
    }
}

pub async fn read_refused_log() -> String {
    match get_log_path("scan_ports_refused.log") {
        Some(path) => read_tail_file(path.to_str().unwrap_or_default(), 100 * 1024).await,
        None => {
            error!("Refused log path not found");
            String::new()
        }
    }
}

fn get_log_path(filename: &str) -> Option<PathBuf> {
    dirs::get_doay_logs_dir().map(|dir| dir.join(filename))
}

async fn read_full_file(filepath: &str) -> String {
    match File::open(filepath).await {
        Ok(file) => {
            let mut reader = BufReader::new(file);
            let mut content = String::new();
            if reader.read_to_string(&mut content).await.is_ok() {
                content
            } else {
                error!("Failed to read full file '{}'", filepath);
                String::new()
            }
        }
        Err(e) => {
            error!("Failed to open file '{}': {}", filepath, e);
            String::new()
        }
    }
}

async fn read_tail_file(filepath: &str, max_bytes: u64) -> String {
    match File::open(filepath).await {
        Ok(mut file) => {
            match file.metadata().await {
                Ok(meta) => {
                    let file_size = meta.len();
                    let read_start = if file_size > max_bytes { file_size.saturating_sub(max_bytes) } else { 0 };

                    // 将文件指针移动到读取开始的位置
                    if let Err(e) = file.seek(SeekFrom::Start(read_start)).await {
                        error!("Failed to seek file '{}': {}", filepath, e);
                        return String::new();
                    }

                    // 读取文件内容
                    let mut raw_content = String::new();
                    if let Err(e) = file.read_to_string(&mut raw_content).await {
                        error!("Failed to read file '{}': {}", filepath, e);
                        return String::new();
                    }

                    // 如果文件内容小于 max_bytes，则直接返回
                    if file_size <= max_bytes {
                        return raw_content;
                    }

                    // 跳过可能不完整的第一行
                    if let Some(first_newline) = raw_content.find('\n') {
                        raw_content[first_newline + 1..].to_string()
                    } else {
                        raw_content
                    }
                }
                Err(e) => {
                    error!("Failed to get metadata for '{}': {}", filepath, e);
                    String::new()
                }
            }
        }
        Err(e) => {
            error!("Failed to open file '{}': {}", filepath, e);
            String::new()
        }
    }
}
