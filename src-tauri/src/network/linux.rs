use crate::config;
use logger::{error, info};
use once_cell::sync::Lazy;
use std::process::Command;

// 全局常量，用于存储命令行工具检测结果
static HAS_GSETTINGS: Lazy<bool> = Lazy::new(|| command_exists("gsettings"));
static HAS_NMCLI: Lazy<bool> = Lazy::new(|| command_exists("nmcli"));

// 命令前缀常量
const GSETTINGS_PROXY: &str = "gsettings set org.gnome.system.proxy";
const NMCLI_CONNECTION: &str = "nmcli connection modify";

pub fn command(command: &str, args: &[&str]) -> Result<(), Box<dyn std::error::Error>> {
    let status = Command::new(command).args(args).status()?;

    if !status.success() {
        return Err(format!("Command exited with status: {}", status).into());
    }

    info!("Command '{} {}' executed successfully", command, args.join(" "));
    Ok(())
}

pub fn execute_command(cmd: &str) -> bool {
    let cmd = cmd.trim();
    if cmd.is_empty() {
        return false;
    }

    let args: Vec<&str> = cmd.split_whitespace().collect();
    if args.len() < 2 {
        error!("Invalid command format: {}", cmd);
        return false;
    }

    let command_name = args[0];
    let command_args = &args[1..];

    if let Err(e) = command(command_name, command_args) {
        error!("Failed to execute command '{}': {}", cmd, e);
        false
    } else {
        true
    }
}

// 检测命令是否存在
fn command_exists(command: &str) -> bool {
    execute_command(&format!("command -v {}", command))
}

// 获取默认网络连接名称
fn get_nmcli_connection_name() -> Option<String> {
    let output = Command::new("nmcli")
        .args(&["-t", "-f", "NAME", "connection", "show", "--active"])
        .output()
        .ok()?; // 如果执行失败，则返回 None

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        stdout.lines().next().map(|line| line.to_string())
    } else {
        None
    }
}

pub fn enable_auto_proxy() -> bool {
    let config = config::get_config();
    let url = format!("http://{}:{}/doay/proxy.js", config.web_server_host, config.web_server_port);

    if *HAS_GSETTINGS {
        execute_command(&format!("{} autoconfig-url '{}'", GSETTINGS_PROXY, url)) && execute_command(&format!("{} mode 'auto'", GSETTINGS_PROXY))
    } else if *HAS_NMCLI {
        if let Some(conn_name) = get_nmcli_connection_name() {
            execute_command(&format!("{} '{}' proxy.pac-url '{}'", NMCLI_CONNECTION, conn_name, url))
                && execute_command(&format!("{} '{}' proxy.method auto", NMCLI_CONNECTION, conn_name))
        } else {
            false
        }
    } else {
        false
    }
}

pub fn enable_socks_proxy() -> bool {
    let config = config::get_config();

    if *HAS_GSETTINGS {
        execute_command(&format!("{}.socks host '{}'", GSETTINGS_PROXY, config.ray_host))
            && execute_command(&format!("{}.socks port {}", GSETTINGS_PROXY, config.ray_socks_port))
            && execute_command(&format!("{} mode 'manual'", GSETTINGS_PROXY))
    } else if *HAS_NMCLI {
        if let Some(conn_name) = get_nmcli_connection_name() {
            execute_command(&format!("{} '{}' proxy.socks-host '{}'", NMCLI_CONNECTION, conn_name, config.ray_host))
                && execute_command(&format!("{} '{}' proxy.socks-port {}", NMCLI_CONNECTION, conn_name, config.ray_socks_port))
                && execute_command(&format!("{} '{}' proxy.method manual", NMCLI_CONNECTION, conn_name))
        } else {
            error!("No active NetworkManager connection found");
            false
        }
    } else {
        error!("Auto proxy setup not supported: neither GSettings nor nmcli is available.");
        false
    }
}

pub fn enable_web_proxy() -> bool {
    let config = config::get_config();

    if *HAS_GSETTINGS {
        execute_command(&format!("{}.http host '{}'", GSETTINGS_PROXY, config.ray_host))
            && execute_command(&format!("{}.http port {}", GSETTINGS_PROXY, config.ray_http_port))
            && execute_command(&format!("{} mode 'manual'", GSETTINGS_PROXY))
    } else if *HAS_NMCLI {
        if let Some(conn_name) = get_nmcli_connection_name() {
            execute_command(&format!("{} '{}' proxy.http-host '{}'", NMCLI_CONNECTION, conn_name, config.ray_host))
                && execute_command(&format!("{} '{}' proxy.http-port {}", NMCLI_CONNECTION, conn_name, config.ray_http_port))
                && execute_command(&format!("{} '{}' proxy.method manual", NMCLI_CONNECTION, conn_name))
        } else {
            false
        }
    } else {
        false
    }
}

pub fn enable_secure_web_proxy() -> bool {
    let config = config::get_config();

    if *HAS_GSETTINGS {
        execute_command(&format!("{}.https host '{}'", GSETTINGS_PROXY, config.ray_host))
            && execute_command(&format!("{}.https port {}", GSETTINGS_PROXY, config.ray_http_port))
            && execute_command(&format!("{} mode 'manual'", GSETTINGS_PROXY))
    } else if *HAS_NMCLI {
        if let Some(conn_name) = get_nmcli_connection_name() {
            execute_command(&format!("{} '{}' proxy.https-host '{}'", NMCLI_CONNECTION, conn_name, config.ray_host))
                && execute_command(&format!("{} '{}' proxy.https-port {}", NMCLI_CONNECTION, conn_name, config.ray_http_port))
                && execute_command(&format!("{} '{}' proxy.method manual", NMCLI_CONNECTION, conn_name))
        } else {
            false
        }
    } else {
        false
    }
}

pub fn disable_auto_proxy() -> bool {
    if *HAS_GSETTINGS {
        execute_command(&format!("{} mode 'none'", GSETTINGS_PROXY))
    } else if *HAS_NMCLI {
        if let Some(conn_name) = get_nmcli_connection_name() {
            execute_command(&format!("{} '{}' proxy.method none", NMCLI_CONNECTION, conn_name))
        } else {
            false
        }
    } else {
        false
    }
}

pub fn disable_socks_proxy() -> bool {
    if *HAS_GSETTINGS {
        execute_command(&format!("{}.socks host ''", GSETTINGS_PROXY)) && execute_command(&format!("{}.socks port 0", GSETTINGS_PROXY))
    } else if *HAS_NMCLI {
        if let Some(conn_name) = get_nmcli_connection_name() {
            execute_command(&format!("{} '{}' proxy.socks-host ''", NMCLI_CONNECTION, conn_name))
                && execute_command(&format!("{} '{}' proxy.socks-port 0", NMCLI_CONNECTION, conn_name))
        } else {
            false
        }
    } else {
        false
    }
}

pub fn disable_web_proxy() -> bool {
    if *HAS_GSETTINGS {
        execute_command(&format!("{}.http host ''", GSETTINGS_PROXY)) && execute_command(&format!("{}.http port 0", GSETTINGS_PROXY))
    } else if *HAS_NMCLI {
        if let Some(conn_name) = get_nmcli_connection_name() {
            execute_command(&format!("{} '{}' proxy.http-host ''", NMCLI_CONNECTION, conn_name))
                && execute_command(&format!("{} '{}' proxy.http-port 0", NMCLI_CONNECTION, conn_name))
        } else {
            false
        }
    } else {
        false
    }
}

pub fn disable_secure_web_proxy() -> bool {
    if *HAS_GSETTINGS {
        execute_command(&format!("{}.https host ''", GSETTINGS_PROXY)) && execute_command(&format!("{}.https port 0", GSETTINGS_PROXY))
    } else if *HAS_NMCLI {
        if let Some(conn_name) = get_nmcli_connection_name() {
            execute_command(&format!("{} '{}' proxy.https-host ''", NMCLI_CONNECTION, conn_name))
                && execute_command(&format!("{} '{}' proxy.https-port 0", NMCLI_CONNECTION, conn_name))
        } else {
            false
        }
    } else {
        false
    }
}

pub fn disable_proxies() -> bool {
    disable_auto_proxy() && disable_socks_proxy() && disable_web_proxy() && disable_secure_web_proxy()
}
