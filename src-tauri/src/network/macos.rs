use crate::config;
use logger::{error, info};
use std::process::Command;

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

/*pub fn execute_commands(command_str: &str) -> bool {
    command_str.trim().lines().all(|cmd| execute_command(cmd))
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
    execute_command(&format!("networksetup -setautoproxyurl {} {}", interface, url))
        && execute_command(&format!("networksetup -setautoproxystate {} on", interface))
}

pub fn enable_socks_proxy() -> bool {
    let config = config::get_config();
    let interface = get_active_network_interface();
    execute_command(&format!(
        "networksetup -setsocksfirewallproxy {} {} {}",
        interface, config.ray_host, config.ray_socks_port
    )) && execute_command(&format!("networksetup -setsocksfirewallproxystate {} on", interface))
}

pub fn enable_web_proxy() -> bool {
    let config = config::get_config();
    let interface = get_active_network_interface();
    execute_command(&format!("networksetup -setwebproxy {} {} {}", interface, config.ray_host, config.ray_http_port))
        && execute_command(&format!("networksetup -setwebproxystate {} on", interface))
}

pub fn enable_secure_web_proxy() -> bool {
    let config = config::get_config();
    let interface = get_active_network_interface();
    execute_command(&format!(
        "networksetup -setsecurewebproxy {} {} {}",
        interface, config.ray_host, config.ray_http_port
    )) && execute_command(&format!("networksetup -setsecurewebproxystate {} on", interface))
}

pub fn disable_auto_proxy() -> bool {
    let interface = get_active_network_interface();
    execute_command(&format!("networksetup -setautoproxystate {} off", interface))
}

pub fn disable_socks_proxy() -> bool {
    let interface = get_active_network_interface();
    execute_command(&format!("networksetup -setsocksfirewallproxystate {} off", interface))
}

pub fn disable_web_proxy() -> bool {
    let interface = get_active_network_interface();
    execute_command(&format!("networksetup -setwebproxystate {} off", interface))
}

pub fn disable_secure_web_proxy() -> bool {
    let interface = get_active_network_interface();
    execute_command(&format!("networksetup -setsecurewebproxystate {} off", interface))
}

pub fn disable_proxies() -> bool {
    let interface = get_active_network_interface();
    execute_command(&format!("networksetup -setautoproxystate {} off", interface))
        && execute_command(&format!("networksetup -setsocksfirewallproxystate {} off", interface))
        && execute_command(&format!("networksetup -setwebproxystate {} off", interface))
        && execute_command(&format!("networksetup -setsecurewebproxystate {} off", interface))
}
