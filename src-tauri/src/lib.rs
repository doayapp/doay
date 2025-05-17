mod args;
mod cleanup;
mod config;
mod dirs;
mod fs;
mod http;
mod log;
mod network;
mod ray;
mod scan_ports;
mod setting;
mod setup;
mod sys_info;
mod web;
use logger::{info, trace, warn};
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use std::time::Instant;
use tauri::{AppHandle, Manager};

static START_TIME: Lazy<Instant> = Lazy::new(Instant::now);

#[tauri::command]
fn doay(name: &str) -> String {
    // trace!("doay triggered");
    format!("Hello, {}! Do you know Doay is great?", name)
}

#[tauri::command]
fn app_elapsed() {
    let elapsed = START_TIME.elapsed().as_secs_f64();
    // 大于 10 s 不记录日志，通常是开发调试，刷新造成
    if elapsed < 10.0 {
        info!("Doay startup time: {:.2} s", elapsed);
    }
}

#[tauri::command]
fn show(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
    }
}

#[tauri::command]
fn set_focus(app: AppHandle) {
    trace!("set_focus triggered");
    if let Some(window) = app.get_webview_window("main") {
        // let _ = window.hide();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn is_quiet_mode() -> bool {
    args::is_quiet_mode()
}

#[tauri::command]
fn read_log_list() -> Value {
    log::read_log_list()
}

#[tauri::command]
fn read_log_file(filename: &str, reverse: bool, start: i64) -> Value {
    log::read_log_file(filename, reverse, start)
}

#[tauri::command]
fn clear_log_all() -> bool {
    log::clear_log_all()
}

#[tauri::command]
fn get_doay_app_dir() -> String {
    dirs::get_doay_app_dir_str()
}

#[tauri::command]
fn send_log(level: &str, msg: &str) -> bool {
    log::write_web_interface_log(level, msg)
}

#[tauri::command]
fn start_speed_test_server(port: u16, filename: &str) -> bool {
    ray::start_speed_test_server(port, filename)
}

#[tauri::command]
fn stop_speed_test_server(port: u16) -> bool {
    ray::stop_speed_test_server(port)
}

#[tauri::command]
fn restart_ray() -> bool {
    ray::restart()
}

#[tauri::command]
fn read_ray_config() -> Value {
    ray::read_ray_config()
}

#[tauri::command]
fn save_ray_config(content: &str) -> bool {
    ray::save_ray_config(content)
}

#[tauri::command]
fn read_conf(filename: &str) -> Value {
    config::read_conf(filename)
}

#[tauri::command]
fn save_conf(filename: &str, content: &str) -> bool {
    config::save_conf(filename, content)
}

#[tauri::command]
fn save_speed_test_conf(filename: &str, content: &str) -> bool {
    config::save_speed_test_conf(filename, content)
}

#[tauri::command]
fn save_proxy_pac(content: &str) -> bool {
    web::save_proxy_pac(content)
}

#[tauri::command]
fn save_text_file(path: &str, content: &str) -> bool {
    fs::save_text_file(path, content)
}

#[tauri::command]
async fn download_large_file(url: String, filepath: String, proxy_url: String, user_agent: String, timeout: u64) -> Value {
    http::download_large_file(&url, &filepath, &proxy_url, &user_agent, timeout).await
}

#[tauri::command]
async fn ping_test(url: String, proxy_url: String, user_agent: String, count: usize, timeout: u64) -> Value {
    http::ping_test(&url, &proxy_url, &user_agent, count, timeout).await
}

#[tauri::command]
async fn jitter_test(url: String, proxy_url: String, user_agent: String, count: usize, timeout: u64) -> Value {
    http::jitter_test(&url, &proxy_url, &user_agent, count, timeout).await
}

#[tauri::command]
async fn download_speed_test(url: String, proxy_url: String, user_agent: String, timeout: u64) -> Value {
    http::download_speed_test(&url, &proxy_url, &user_agent, timeout).await
}

#[tauri::command]
async fn upload_speed_test(url: String, proxy_url: String, user_agent: String, size: usize, timeout: u64) -> Value {
    http::upload_speed_test(&url, &proxy_url, &user_agent, size, timeout).await
}

#[tauri::command]
async fn fetch_response_headers(url: String, proxy_url: String, user_agent: String, timeout: u64) -> Value {
    http::fetch_response_headers(&url, &proxy_url, &user_agent, timeout).await
}

#[tauri::command]
async fn fetch_text_content(url: String, proxy_url: String, user_agent: String, timeout: u64) -> Value {
    http::fetch_text_content(&url, &proxy_url, &user_agent, timeout).await
}

#[tauri::command]
async fn fetch_get(url: String, is_proxy: bool, user_agent: String, timeout: u64) -> Value {
    http::fetch_get(&url, is_proxy, &user_agent, timeout).await
}

#[tauri::command]
fn get_dirs_json() -> Value {
    dirs::get_dirs_json()
}

#[tauri::command]
fn get_sys_info_json() -> Value {
    sys_info::get_sys_info_json()
}

#[tauri::command]
fn get_load_average_json() -> Value {
    sys_info::get_load_average_json()
}

#[tauri::command]
fn get_processes_json(keyword: &str) -> Value {
    sys_info::get_processes_json(keyword)
}

#[tauri::command]
fn get_disks_json() -> Value {
    sys_info::get_disks_json()
}

#[tauri::command]
fn get_networks_json() -> Value {
    sys_info::get_networks_json()
}

#[tauri::command]
fn get_components_json() -> Value {
    sys_info::get_components_json()
}

#[tauri::command]
fn kill_process_by_pid(pid: u32) -> bool {
    sys_info::kill_process_by_pid(pid)
}

#[tauri::command]
fn get_config_json() -> Value {
    config::get_config_json()
}

#[tauri::command]
fn set_app_log_level(value: &str) -> bool {
    setting::set_app_log_level(value)
}

#[tauri::command]
fn set_web_server_enable(value: bool) -> bool {
    setting::set_web_server_enable(value)
}

#[tauri::command]
fn set_web_server_host(value: &str) -> bool {
    setting::set_web_server_host(value)
}

#[tauri::command]
fn set_web_server_port(value: u32) -> bool {
    setting::set_web_server_port(value)
}

#[tauri::command]
fn set_ray_enable(value: bool) -> bool {
    setting::set_ray_enable(value)
}

#[tauri::command]
fn set_ray_host(value: &str) -> bool {
    setting::set_ray_host(value)
}

#[tauri::command]
fn set_ray_socks_port(value: u32) -> bool {
    setting::set_ray_socks_port(value)
}

#[tauri::command]
fn set_ray_http_port(value: u32) -> bool {
    setting::set_ray_http_port(value)
}

#[tauri::command]
fn set_auto_setup_pac(value: bool) -> bool {
    setting::set_auto_setup_pac(value)
}

#[tauri::command]
fn set_auto_setup_socks(value: bool) -> bool {
    setting::set_auto_setup_socks(value)
}

#[tauri::command]
fn set_auto_setup_http(value: bool) -> bool {
    setting::set_auto_setup_http(value)
}

#[tauri::command]
fn set_auto_setup_https(value: bool) -> bool {
    setting::set_auto_setup_https(value)
}

#[tauri::command]
fn check_port_available(port: u32) -> bool {
    setting::check_port_available(port)
}

#[tauri::command]
fn open_web_server_dir() -> bool {
    web::open_web_server_dir()
}

#[tauri::command]
async fn start_scan_ports(host: String, start_port: u16, end_port: u16, max_threads: usize, timeout_ms: u64) -> Value {
    scan_ports::start_scan_ports(&host, start_port, end_port, max_threads, timeout_ms).await
}

#[tauri::command]
async fn read_open_log() -> String {
    scan_ports::read_open_log().await
}

#[tauri::command]
async fn read_timeout_log() -> String {
    scan_ports::read_timeout_log().await
}

#[tauri::command]
async fn read_refused_log() -> String {
    scan_ports::read_refused_log().await
}

#[tauri::command]
fn get_ray_version() -> String {
    ray::get_ray_version()
}

#[tauri::command]
fn get_version() -> Value {
    json!({"doay": get_doay_version(), "rustc": get_rustc_version()})
}

// rustc -Vv
// export RUSTC_VERSION=$(rustc -V)
// echo 'export RUSTC_VERSION=$(rustc -V)' >> ~/.profile OR
// echo 'export RUSTC_VERSION=$(rustc -V)' >> ~/.zshrc
// source ~/.zshrc
// echo $RUSTC_VERSION
fn get_rustc_version() -> String {
    // rustc_version::version_meta().unwrap().short_version_string
    option_env!("RUSTC_VERSION").unwrap_or("rustc 1.84.0 (9fc6b4312 2025-01-07)").to_string()
}

fn get_doay_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn log_startup_info() {
    info!("Doay started v{}, tauri {}, {}", get_doay_version(), tauri::VERSION, get_rustc_version());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Lazy::force(&START_TIME); // Ensure START_TIME is initialized
    args::parse_args();
    config::init();
    log::init();
    log_startup_info();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            warn!("Duplicate startup detected: {:?}, current working directory: {:?}", args, cwd);

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(cleanup::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Option::Some(vec!["-s", "quiet"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(setup::init)
        .invoke_handler(tauri::generate_handler![
            doay,
            app_elapsed,
            show,
            set_focus,
            read_log_list,
            read_log_file,
            clear_log_all,
            send_log,
            start_speed_test_server,
            stop_speed_test_server,
            restart_ray,
            read_ray_config,
            save_ray_config,
            read_conf,
            save_conf,
            save_speed_test_conf,
            save_proxy_pac,
            save_text_file,
            download_large_file,
            ping_test,
            jitter_test,
            download_speed_test,
            upload_speed_test,
            fetch_response_headers,
            fetch_text_content,
            fetch_get,
            get_dirs_json,
            get_doay_app_dir,
            get_sys_info_json,
            get_load_average_json,
            get_processes_json,
            get_disks_json,
            get_networks_json,
            get_components_json,
            kill_process_by_pid,
            get_config_json,
            set_app_log_level,
            set_web_server_enable,
            set_web_server_host,
            set_web_server_port,
            set_ray_enable,
            set_ray_host,
            set_ray_socks_port,
            set_ray_http_port,
            set_auto_setup_pac,
            set_auto_setup_socks,
            set_auto_setup_http,
            set_auto_setup_https,
            check_port_available,
            open_web_server_dir,
            start_scan_ports,
            read_open_log,
            read_timeout_log,
            read_refused_log,
            get_ray_version,
            get_version,
            is_quiet_mode,
            quit
        ])
        .run(tauri::generate_context!())
        .expect("error while running doay application");
}
