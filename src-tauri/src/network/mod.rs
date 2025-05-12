use crate::config;
use logger::error;

#[cfg(target_os = "linux")]
pub mod linux;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "linux")]
pub use linux::*;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(target_os = "windows")]
pub use windows::*;

pub fn setup_proxies() -> bool {
    let config = config::get_config();
    let mut success = true;

    if config.auto_setup_pac && !enable_auto_proxy() {
        error!("Failed to enable auto proxy (PAC)");
        success = false;
    }
    if config.auto_setup_socks && !enable_socks_proxy() {
        error!("Failed to enable SOCKS proxy");
        success = false;
    }
    if config.auto_setup_http && !enable_web_proxy() {
        error!("Failed to enable HTTP proxy");
        success = false;
    }
    if config.auto_setup_https && !enable_secure_web_proxy() {
        error!("Failed to enable HTTPS proxy");
        success = false;
    }

    success
}

pub fn setup_pac_proxy() -> bool {
    let config = config::get_config();
    if config.auto_setup_pac {
        if !enable_auto_proxy() {
            error!("Failed to enable auto proxy (PAC)");
            return false;
        }
        true
    } else {
        true
    }
}

pub fn setup_socks_proxy() -> bool {
    let config = config::get_config();
    let mut success = true;

    if config.auto_setup_socks {
        if !enable_socks_proxy() {
            error!("Failed to enable SOCKS proxy");
            success = false;
        }
    }
    if config.auto_setup_pac {
        if !enable_auto_proxy() {
            error!("Failed to enable auto proxy (PAC)");
            success = false;
        }
    }

    success
}

pub fn setup_http_proxy() -> bool {
    let config = config::get_config();
    let mut success = true;

    if config.auto_setup_http {
        if !enable_web_proxy() {
            error!("Failed to enable HTTP proxy");
            success = false;
        }
    }
    if config.auto_setup_https {
        if !enable_secure_web_proxy() {
            error!("Failed to enable HTTPS proxy");
            success = false;
        }
    }

    success
}
