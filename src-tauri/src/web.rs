use crate::config;
use crate::dirs;
use crate::sys_info;
use actix_files::Files;
use actix_web::middleware::Logger;
use actix_web::{dev, rt, web, App, HttpResponse, HttpServer, Responder};
use chrono;
use env_logger::Builder;
use log::LevelFilter;
use logger::{debug, error, info};
use once_cell::sync::Lazy;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;

static SERVER_HANDLE: Lazy<Mutex<Option<dev::ServerHandle>>> = Lazy::new(|| Mutex::new(None));
static LOGGER_ONCE: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

// 日志初始化
fn init_logger() {
    let mut init_once = LOGGER_ONCE.lock().unwrap();
    if *init_once {
        return;
    }

    let log_file = OpenOptions::new()
        .write(true)
        .create(true)
        .append(true)
        .open(dirs::get_doay_logs_dir().unwrap().join("web_server.log").to_str().unwrap())
        .unwrap();

    Builder::from_default_env()
        .target(env_logger::Target::Pipe(Box::new(log_file)))
        .filter_level(LevelFilter::Off) // 设置日志级别参数: Off Error Warn Info Debug Trace
        .filter_module("actix_server::server", LevelFilter::Info)
        .filter_module("actix_web::middleware::logger", LevelFilter::Info)
        .format(|buf, record| {
            buf.write_fmt(format_args!(
                "{} [{}] {}: {}\n",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.level(),
                record.target(),
                record.args()
            ))
        })
        .format_timestamp(None)
        .init();

    *init_once = true;
}

fn ensure_web_server_dir() -> bool {
    let web_server_dir = dirs::get_doay_web_server_dir().unwrap();
    if !web_server_dir.exists() {
        if let Err(e) = fs::create_dir_all(&web_server_dir) {
            error!("Failed to create web server directory: {}", e);
            return false;
        }
    }
    true
}

pub fn open_web_server_dir() -> bool {
    if !ensure_web_server_dir() {
        return false;
    }

    // 确保 proxy.js 文件存在
    let proxy_file = dirs::get_doay_web_server_dir().unwrap().join("proxy.js");
    if !proxy_file.exists() {
        if let Err(e) = fs::File::create(&proxy_file) {
            error!("Failed to create proxy.js: {}", e);
            return false;
        }
    }

    // 打开 proxy.js 文件
    if let Err(e) = tauri_plugin_opener::reveal_item_in_dir(&proxy_file) {
        error!("Failed to open proxy.js: {}", e);
        return false;
    }

    true
}

pub fn start() -> bool {
    if !ensure_web_server_dir() {
        return false;
    }

    if SERVER_HANDLE.lock().unwrap().is_some() {
        info!("Web Server is already running.");
        return false;
    }

    init_logger();
    std::thread::spawn(|| run_server());
    true
}

async fn proxy_pac_handle() -> HttpResponse {
    let pac_path = dirs::get_doay_web_server_dir().unwrap().join("proxy.js");
    match fs::read_to_string(&pac_path) {
        Ok(content) => HttpResponse::Ok().content_type("application/x-ns-proxy-autoconfig").body(content),
        Err(_) => HttpResponse::NotFound().body("proxy.js not found"),
    }
}

async fn get_disks_handler() -> impl Responder {
    HttpResponse::Ok().json(sys_info::get_disks_json())
}

async fn get_networks_handler() -> impl Responder {
    HttpResponse::Ok().json(sys_info::get_networks_json())
}

async fn get_components_handler() -> impl Responder {
    HttpResponse::Ok().json(sys_info::get_components_json())
}

fn run_server() {
    let config = config::get_config();
    let server_address = format!("{}:{}", config.web_server_host, config.web_server_port);
    rt::System::new().block_on(async {
        match HttpServer::new(move || {
            App::new()
                .wrap(Logger::new("%D %a %s \"%r\" %b \"%{Referer}i\" \"%{User-Agent}i\""))
                .service(Files::new("/doay", dirs::get_doay_web_server_dir().unwrap().to_str().unwrap()).show_files_listing())
                .route("/", web::get().to(|| async { "This is Doay Web Server!" }))
                .route("/proxy.pac", web::get().to(proxy_pac_handle))
                .route("/disks", web::get().to(get_disks_handler))
                .route("/networks", web::get().to(get_networks_handler))
                .route("/components", web::get().to(get_components_handler))
        })
        .bind(&server_address)
        {
            Err(e) => {
                error!("Web Server failed to bind to {}: {}", server_address, e);
            }
            Ok(http_server) => {
                let server = http_server.run();
                info!("Web Server running on http://{}", server_address);
                *SERVER_HANDLE.lock().unwrap() = Some(server.handle());
                if let Err(e) = server.await {
                    error!("Web Server encountered an error: {}", e);
                }
                debug!("Web Server has been shut down.");
            }
        }
    })
}

pub fn stop() -> bool {
    let server_handle = SERVER_HANDLE.lock().unwrap().take();
    if let Some(handle) = server_handle {
        rt::System::new().block_on(async {
            handle.stop(false).await;
            info!("Web Server stopped");
        })
    }
    true
}

pub fn restart() {
    stop();
    start();
}

pub fn save_proxy_pac(content: &str) -> bool {
    let config_path = dirs::get_doay_web_server_dir().unwrap().join("proxy.js").to_str().unwrap().to_string();
    match fs::File::create(config_path) {
        Ok(mut file) => {
            if let Err(e) = file.write_all(content.as_bytes()) {
                error!("Failed to write proxy.js file: {}", e);
                return false;
            }
            info!("proxy.js saved successfully");
            true
        }
        Err(e) => {
            error!("Failed to create proxy.js file: {}", e);
            false
        }
    }
}
