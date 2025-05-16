use crate::config;
use logger::{error, info};
use std::process::Command;

const GSETTINGS_PROXY: &str = "gsettings set org.gnome.system.proxy";

pub fn command(cmd: &str) -> bool {
    let cmd = cmd.trim();
    if cmd.is_empty() {
        return false;
    }

    let status = Command::new("sh").arg("-c").arg(cmd).status();

    match status {
        Ok(status) if status.success() => {
            info!("Command [{}] executed successfully", cmd);
            true
        }
        Ok(status) => {
            error!("Command [{}] failed with status: {}", cmd, status);
            false
        }
        Err(e) => {
            error!("Failed to execute command [{}]: {}", cmd, e);
            false
        }
    }
}

pub fn enable_auto_proxy() -> bool {
    let config = config::get_config();
    let url = format!("http://{}:{}/doay/proxy.js", config.web_server_host, config.web_server_port);
    command(&format!("{} autoconfig-url '{}'", GSETTINGS_PROXY, url)) && command(&format!("{} mode 'auto'", GSETTINGS_PROXY))
}

pub fn enable_socks_proxy() -> bool {
    let config = config::get_config();
    command(&format!("{}.socks host '{}'", GSETTINGS_PROXY, config.ray_host))
        && command(&format!("{}.socks port {}", GSETTINGS_PROXY, config.ray_socks_port))
        && command(&format!("{} mode 'manual'", GSETTINGS_PROXY))
}

pub fn enable_web_proxy() -> bool {
    let config = config::get_config();
    command(&format!("{}.http host '{}'", GSETTINGS_PROXY, config.ray_host))
        && command(&format!("{}.http port {}", GSETTINGS_PROXY, config.ray_http_port))
        && command(&format!("{} mode 'manual'", GSETTINGS_PROXY))
}

pub fn enable_secure_web_proxy() -> bool {
    let config = config::get_config();
    command(&format!("{}.https host '{}'", GSETTINGS_PROXY, config.ray_host))
        && command(&format!("{}.https port {}", GSETTINGS_PROXY, config.ray_http_port))
        && command(&format!("{} mode 'manual'", GSETTINGS_PROXY))
}

pub fn disable_auto_proxy() -> bool {
    command(&format!("{} mode 'none'", GSETTINGS_PROXY))
}

pub fn disable_socks_proxy() -> bool {
    command(&format!("{}.socks host ''", GSETTINGS_PROXY)) && command(&format!("{}.socks port 0", GSETTINGS_PROXY))
}

pub fn disable_web_proxy() -> bool {
    command(&format!("{}.http host ''", GSETTINGS_PROXY)) && command(&format!("{}.http port 0", GSETTINGS_PROXY))
}

pub fn disable_secure_web_proxy() -> bool {
    command(&format!("{}.https host ''", GSETTINGS_PROXY)) && command(&format!("{}.https port 0", GSETTINGS_PROXY))
}

pub fn disable_proxies() -> bool {
    disable_auto_proxy() && disable_socks_proxy() && disable_web_proxy() && disable_secure_web_proxy()
}
