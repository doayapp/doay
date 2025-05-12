use crate::{config, log, network, ray, web};
use logger::{info, warn};
use std::net::TcpListener;

pub fn set_app_log_level(value: &str) -> bool {
    info!("set_app_log_level: {}", value);
    config::set_app_log_level(value) && {
        log::init();
        true
    }
}

pub fn set_web_server_enable(value: bool) -> bool {
    let success = config::set_web_server_enable(value);
    if success {
        if value {
            web::start();
        } else {
            web::stop();
        }
    }
    success
}

pub fn set_web_server_host(value: &str) -> bool {
    let success = config::set_web_server_host(value);
    if success {
        let config = config::get_config();
        if config.web_server_enable {
            web::restart();
            network::setup_pac_proxy();
        }
    }
    success
}

pub fn set_web_server_port(value: u32) -> bool {
    let success = config::set_web_server_port(value);
    if success {
        let config = config::get_config();
        if config.web_server_enable {
            web::restart();
            network::setup_pac_proxy();
        }
    }
    success
}

pub fn set_ray_enable(value: bool) -> bool {
    info!("set_ray_enable: {}", value);
    if config::set_ray_enable(value) {
        if value {
            ray::start() && network::setup_proxies()
        } else {
            ray::force_kill() && network::disable_proxies()
        }
    } else {
        false
    }
}

pub fn set_ray_host(value: &str) -> bool {
    config::set_ray_host(value) && network::setup_proxies()
}

pub fn set_ray_socks_port(value: u32) -> bool {
    config::set_ray_socks_port(value) && network::setup_socks_proxy()
}

pub fn set_ray_http_port(value: u32) -> bool {
    config::set_ray_http_port(value) && network::setup_http_proxy()
}

pub fn set_auto_setup_pac(value: bool) -> bool {
    if config::set_auto_setup_pac(value) {
        if value {
            network::enable_auto_proxy()
        } else {
            network::disable_auto_proxy()
        }
    } else {
        false
    }
}

pub fn set_auto_setup_socks(value: bool) -> bool {
    if config::set_auto_setup_socks(value) {
        if value {
            network::enable_socks_proxy()
        } else {
            network::disable_socks_proxy()
        }
    } else {
        false
    }
}

pub fn set_auto_setup_http(value: bool) -> bool {
    if config::set_auto_setup_http(value) {
        if value {
            network::enable_web_proxy()
        } else {
            network::disable_web_proxy()
        }
    } else {
        false
    }
}

pub fn set_auto_setup_https(value: bool) -> bool {
    if config::set_auto_setup_https(value) {
        if value {
            network::enable_secure_web_proxy()
        } else {
            network::disable_secure_web_proxy()
        }
    } else {
        false
    }
}

pub fn check_port_available(port: u32) -> bool {
    let address = format!("127.0.0.1:{}", port);
    match TcpListener::bind(&address) {
        Ok(_) => {
            info!("Port {} is available", port);
            true
        }
        Err(e) => {
            warn!("Port {} is unavailable: {}", port, e);
            false
        }
    }
}
