use crate::config;
use logger::{error, info};
use std::process::Command;

pub fn command(cmd_str: &str) -> bool {
    let trimmed = cmd_str.trim();
    if trimmed.is_empty() {
        error!("Empty command string received");
        return false;
    }

    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if parts.len() < 2 {
        error!("Invalid command: [{}]", trimmed);
        return false;
    }

    let cmd = parts[0];
    let args = &parts[1..];

    match Command::new(cmd).args(args).status() {
        Ok(status) if status.success() => {
            info!("Command [{} {}] executed successfully", cmd, args.join(" "));
            true
        }
        Ok(status) => {
            error!("Command failed: [{} {}], exit status: {}", cmd, args.join(" "), status);
            false
        }
        Err(e) => {
            error!("Failed to start command: [{} {}], error: {}", cmd, args.join(" "), e);
            false
        }
    }
}

/*pub fn commands(cmd_str: &str) -> bool {
    cmd_str.trim().lines().all(|cmd| command(cmd))
}*/

// 获取当前使用的网络接口名称，如果没有获取到则返回 "Wi-Fi"
fn get_active_network_interface() -> String {
    let output = Command::new("networksetup").arg("-listallnetworkservices").output().ok().and_then(|output| {
        if output.status.success() {
            String::from_utf8(output.stdout).ok()
        } else {
            None
        }
    });

    output
        .and_then(|s| {
            s.lines()
                .skip(1) // 跳过第一行提示信息
                .find(|line| !line.starts_with('*')) // 找到第一个未标记为禁用的接口
                .map(|line| line.trim().to_string())
        })
        .unwrap_or_else(|| "Wi-Fi".to_string())
}

pub fn enable_auto_proxy() -> bool {
    let config = config::get_config();
    let interface = get_active_network_interface();
    let url = format!("http://{}:{}/doay/proxy.js", config.web_server_host, config.web_server_port);
    command(&format!("networksetup -setautoproxyurl {} {}", interface, url)) && command(&format!("networksetup -setautoproxystate {} on", interface))
}

pub fn enable_socks_proxy() -> bool {
    let config = config::get_config();
    let interface = get_active_network_interface();
    command(&format!(
        "networksetup -setsocksfirewallproxy {} {} {}",
        interface, config.ray_host, config.ray_socks_port
    )) && command(&format!("networksetup -setsocksfirewallproxystate {} on", interface))
}

pub fn enable_web_proxy() -> bool {
    let config = config::get_config();
    let interface = get_active_network_interface();
    command(&format!("networksetup -setwebproxy {} {} {}", interface, config.ray_host, config.ray_http_port))
        && command(&format!("networksetup -setwebproxystate {} on", interface))
}

pub fn enable_secure_web_proxy() -> bool {
    let config = config::get_config();
    let interface = get_active_network_interface();
    command(&format!(
        "networksetup -setsecurewebproxy {} {} {}",
        interface, config.ray_host, config.ray_http_port
    )) && command(&format!("networksetup -setsecurewebproxystate {} on", interface))
}

pub fn disable_auto_proxy() -> bool {
    let interface = get_active_network_interface();
    command(&format!("networksetup -setautoproxystate {} off", interface))
}

pub fn disable_socks_proxy() -> bool {
    let interface = get_active_network_interface();
    command(&format!("networksetup -setsocksfirewallproxystate {} off", interface))
}

pub fn disable_web_proxy() -> bool {
    let interface = get_active_network_interface();
    command(&format!("networksetup -setwebproxystate {} off", interface))
}

pub fn disable_secure_web_proxy() -> bool {
    let interface = get_active_network_interface();
    command(&format!("networksetup -setsecurewebproxystate {} off", interface))
}

pub fn disable_proxies() -> bool {
    let interface = get_active_network_interface();
    command(&format!("networksetup -setautoproxystate {} off", interface))
        && command(&format!("networksetup -setsocksfirewallproxystate {} off", interface))
        && command(&format!("networksetup -setwebproxystate {} off", interface))
        && command(&format!("networksetup -setsecurewebproxystate {} off", interface))
}
