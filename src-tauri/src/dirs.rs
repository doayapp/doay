use dirs;
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use std::env;

static APP_DATA_DIR: Lazy<Option<std::path::PathBuf>> = Lazy::new(|| dirs::data_dir().map(|dir| dir.join("doay")));

pub fn get_app_data_dir() -> Option<std::path::PathBuf> {
    APP_DATA_DIR.clone()
}

pub fn get_doay_app_dir_str() -> String {
    APP_DATA_DIR.as_ref().and_then(|p| p.to_str().map(str::to_string)).unwrap_or_default()
}

pub fn get_doay_conf_dir() -> Option<std::path::PathBuf> {
    get_app_data_dir().map(|dir| dir.join("conf"))
}

pub fn get_doay_logs_dir() -> Option<std::path::PathBuf> {
    get_app_data_dir().map(|dir| dir.join("logs"))
}

pub fn get_doay_web_server_dir() -> Option<std::path::PathBuf> {
    get_app_data_dir().map(|dir| dir.join("web_server"))
}

pub fn get_doay_ray_dir() -> Option<std::path::PathBuf> {
    get_app_data_dir().map(|dir| dir.join("ray"))
}

/*pub fn ensure_dirs() {
    let dirs = vec![get_doay_conf_dir(), get_doay_logs_dir(), get_doay_web_server_dir(), get_doay_ray_dir()];

    for dir in dirs {
        if let Some(path) = dir {
            if !path.exists() {
                if let Err(e) = std::fs::create_dir_all(&path) {
                    logger::error!("Failed to create directory: {}", e);
                }
            }
        }
    }
}*/

pub fn get_dirs_json() -> Value {
    json!({
        "executable_path": env::current_exe().ok(),
        "current_dir": env::current_dir().ok(),
        "home_dir": dirs::home_dir(),
        "data_dir": dirs::data_dir(),
        "audio_dir": dirs::audio_dir(),
        "cache_dir": dirs::cache_dir(),
        "config_dir": dirs::config_dir(),
        "desktop_dir": dirs::desktop_dir(),
        "document_dir": dirs::document_dir(),
        "download_dir": dirs::download_dir(),
        "font_dir": dirs::font_dir(),
        "picture_dir": dirs::picture_dir(),
        "public_dir": dirs::public_dir(),
        "video_dir": dirs::video_dir(),
    })
}
