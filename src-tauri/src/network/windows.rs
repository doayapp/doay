use crate::config;
use logger::{error, info};
use std::os::windows::process::CommandExt;
use std::process::Command;
use std::ptr::null_mut;
use winapi::um::wininet::{InternetSetOptionW, INTERNET_OPTION_REFRESH, INTERNET_OPTION_SETTINGS_CHANGED};

const SETTINGS: &str = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";

fn notify_proxy_change() -> bool {
    unsafe {
        InternetSetOptionW(null_mut(), INTERNET_OPTION_SETTINGS_CHANGED, null_mut(), 0) != 0
            && InternetSetOptionW(null_mut(), INTERNET_OPTION_REFRESH, null_mut(), 0) != 0
    }
}

/*
// 备选方案，使用 PowerShell 脚本通知代理设置更改
fn notify_proxy_change() -> bool {
    // 使用 PowerShell 脚本通知代理设置更改
    let script = r#"
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class WinInet {
            [DllImport("wininet.dll", SetLastError = true)]
            public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
            public const int INTERNET_OPTION_SETTINGS_CHANGED = 39;
            public const int INTERNET_OPTION_REFRESH = 37;
        }
        "@
        [WinInet]::InternetSetOption([IntPtr]::Zero, [WinInet]::INTERNET_OPTION_SETTINGS_CHANGED, [IntPtr]::Zero, 0)
        [WinInet]::InternetSetOption([IntPtr]::Zero, [WinInet]::INTERNET_OPTION_REFRESH, [IntPtr]::Zero, 0)
    "#;

    // 执行 PowerShell 脚本
    command("powershell", &["-Command", script]).is_ok()
}
*/

pub fn command(command: &str, args: &[&str]) -> Result<(), Box<dyn std::error::Error>> {
    let status = Command::new(command).creation_flags(0x08000000).args(args).status()?;

    if !status.success() {
        let msg = format!("Command exited with status: {}", status);
        error!("{}", msg);
        return Err(msg.into());
    }

    info!("Command '{} {}' executed successfully", command, args.join(" "));
    Ok(())
}

pub fn enable_auto_proxy() -> bool {
    let config = config::get_config();
    let url = format!("http://{}:{}/proxy.pac", config.web_server_host, config.web_server_port);
    let success = command("reg", &["add", SETTINGS, "/v", "AutoConfigURL", "/t", "REG_SZ", "/d", &url, "/f"]).is_ok()
        && command("reg", &["add", SETTINGS, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "1", "/f"]).is_ok();
    success && notify_proxy_change()
}

fn enable_proxy(proxy_type: &str, host: &str, port: &u32) -> bool {
    let proxy_server = format!("{}={}:{}", proxy_type, host, port);
    let success = command("reg", &["add", SETTINGS, "/v", "ProxyServer", "/t", "REG_SZ", "/d", &proxy_server, "/f"]).is_ok()
        && command("reg", &["add", SETTINGS, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "1", "/f"]).is_ok();
    success && notify_proxy_change()
}

pub fn enable_socks_proxy() -> bool {
    let config = config::get_config();
    enable_proxy("socks", &config.ray_host, &config.ray_socks_port)
}

pub fn enable_web_proxy() -> bool {
    let config = config::get_config();
    enable_proxy("http", &config.ray_host, &config.ray_http_port)
}

pub fn enable_secure_web_proxy() -> bool {
    let config = config::get_config();
    enable_proxy("https", &config.ray_host, &config.ray_http_port)
}

pub fn disable_auto_proxy() -> bool {
    let success = command("reg", &["delete", SETTINGS, "/v", "AutoConfigURL", "/f"]).is_ok()
        && command("reg", &["add", SETTINGS, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "0", "/f"]).is_ok();
    success && notify_proxy_change()
}

pub fn disable_socks_proxy() -> bool {
    disable_proxies()
}

pub fn disable_web_proxy() -> bool {
    disable_proxies()
}

pub fn disable_secure_web_proxy() -> bool {
    disable_proxies()
}

pub fn disable_proxies() -> bool {
    let success = command("reg", &["delete", SETTINGS, "/v", "ProxyServer", "/f"]).is_ok()
        && command("reg", &["add", SETTINGS, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "0", "/f"]).is_ok();
    success && notify_proxy_change()
}

/*
// netsh 命令会修改所有用户，不建议使用，修改注册表只用修改当前用户，影响更小。
pub fn enable_auto_proxy() -> bool {
    let config = config::get_config();
    let url = format!("http://{}:{}/doay/proxy.js", config.web_server_host, config.web_server_port);
    execute_command(&format!("netsh winhttp set proxy proxy-server=\"{}\"", url))
}

pub fn enable_socks_proxy() -> bool {
    let config = config::get_config();
    execute_command(&format!("netsh winhttp set proxy proxy-server=\"socks={}:{}\"", config.ray_host, config.ray_socks_port))
}

pub fn enable_web_proxy() -> bool {
    let config = config::get_config();
    execute_command(&format!("netsh winhttp set proxy proxy-server=\"http={}:{}\"", config.ray_host, config.ray_http_port))
}

pub fn enable_secure_web_proxy() -> bool {
    let config = config::get_config();
    execute_command(&format!("netsh winhttp set proxy proxy-server=\"https={}:{}\"", config.ray_host, config.ray_http_port))
}

pub fn disable_auto_proxy() -> bool {
    execute_command("netsh winhttp reset proxy")
}

pub fn disable_socks_proxy() -> bool {
    execute_command("netsh winhttp reset proxy")
}

pub fn disable_web_proxy() -> bool {
    execute_command("netsh winhttp reset proxy")
}

pub fn disable_secure_web_proxy() -> bool {
    execute_command("netsh winhttp reset proxy")
}

pub fn disable_proxies() -> bool {
    execute_command("netsh winhttp reset proxy")
}
*/
