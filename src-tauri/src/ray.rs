use crate::config;
use crate::dirs;
use logger::{debug, error, info, trace, warn};
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::fs::OpenOptions;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const RAY: &str = "xray.exe";

#[cfg(not(target_os = "windows"))]
const RAY: &str = "xray";

// Ray Server process manager
pub struct ProcessManager {
    child: Mutex<Option<Child>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self { child: Mutex::new(None) }
    }

    pub fn start(&self) -> bool {
        let mut child_lock = self.child.lock().unwrap();
        if child_lock.is_some() {
            error!("Ray Server is already running");
            return false;
        }

        let ray_path = get_ray_exe();
        let ray_conf = get_ray_config_path();
        debug!("ray_path: {}", ray_path);
        debug!("ray_conf: {}", ray_conf);

        let mut cmd = command_new(&ray_path);
        cmd.args(&["run", "-c", &ray_conf]).stdout(Stdio::piped()).stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                error!("Failed to start Ray Server: {:?}", e);
                return false;
            }
        };

        info!("Ray Server started with PID: {}", child.id());

        let log_path = dirs::get_doay_logs_dir().unwrap().join("xray_server.log");

        // 清空文件内容
        let log_file = match OpenOptions::new().create(true).write(true).truncate(true).open(&log_path) {
            Ok(f) => f,
            Err(e) => {
                error!("Failed to open log file: {}", e);
                return false;
            }
        };

        let log_file = Arc::new(Mutex::new(log_file));

        if let Some(stdout) = child.stdout.take() {
            let log_file = Arc::clone(&log_file);
            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        let msg = format!("Ray Server stdout: {}\n", line.trim());
                        trace!("{}", msg.trim());
                        if let Ok(mut file) = log_file.lock() {
                            let _ = file.write_all(msg.as_bytes());
                        }
                    }
                }
            });
        }

        if let Some(stderr) = child.stderr.take() {
            let log_file = Arc::clone(&log_file);
            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        let msg = format!("Ray Server stderr: {}\n", line.trim());
                        error!("{}", msg.trim());
                        if let Ok(mut file) = log_file.lock() {
                            let _ = file.write_all(msg.as_bytes());
                        }
                    }
                }
            });
        }

        *child_lock = Some(child);
        true
    }

    pub fn stop(&self) -> bool {
        let mut child_lock = self.child.lock().unwrap();
        if let Some(mut child) = child_lock.take() {
            if let Err(e) = child.kill() {
                error!("Failed to kill Ray Server: {}", e);
                *child_lock = Some(child);
                return false;
            }
            if let Err(e) = child.wait() {
                error!("Failed to wait for Ray Server to terminate: {}", e);
                return false;
            }
            info!("Ray Server stopped successfully");
            true
        } else {
            error!("No Ray Server process to stop");
            false
        }
    }
}

pub static PROCESS_MANAGER: Lazy<ProcessManager> = Lazy::new(ProcessManager::new);

pub fn command_new(program: &str) -> Command {
    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new(program);
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
        return cmd;
    }

    #[cfg(not(target_os = "windows"))]
    {
        return Command::new(program);
    }
}

pub fn start() -> bool {
    // 异步启动，不阻塞调用线程
    thread::spawn(|| {
        PROCESS_MANAGER.start();
    });
    true
}

pub fn stop() -> bool {
    PROCESS_MANAGER.stop()
}

// 通过遍历的方式停止进程，保证完全停止进程
pub fn force_kill() -> bool {
    let start = Instant::now();
    let mut sys = sysinfo::System::new_all();
    sys.refresh_all();
    trace!("Sysinfo initialized and refreshed, elapsed: {:?}", start.elapsed());

    let mut success = true;
    let mut killed_count = 0;

    for (pid, process) in sys.processes() {
        // 特别注意：linux 系统下 name 获取的名字不会超过 15 个字符
        if process.name() == RAY {
            if let Some(exe_path) = process.exe() {
                let exe_str = exe_path.to_string_lossy();
                if exe_str.ends_with(RAY) && exe_str.contains("doay") {
                    if process.kill() {
                        info!("Killed xray process with PID: {}", pid);
                        killed_count += 1;
                    } else {
                        error!("Failed to kill xray process with PID: {}", pid);
                        success = false;
                    }
                }
            } else {
                warn!("Could not get exe path for PID: {}", pid);
            }
        }
    }

    trace!(
        "Force kill complete. Elapsed: {:?}, total processes: {}, xray killed: {}",
        start.elapsed(),
        sys.processes().len(),
        killed_count
    );

    success
}

pub fn restart() -> bool {
    let config = config::get_config();
    if !config.ray_enable {
        return false;
    }

    let success = stop() && force_kill() && start();

    if success {
        info!("Ray Server restarted successfully");
    } else {
        error!("Ray Server restart failed");
    }

    success
}

pub fn get_ray_version() -> String {
    let ray_path = get_ray_exe();
    trace!("Trying to get Ray version, path: {}", ray_path);

    let output = command_new(&ray_path).arg("version").stdout(Stdio::piped()).stderr(Stdio::piped()).output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                // trace!("Ray version output: {}", stdout);
                stdout.lines().next().unwrap_or("").trim().to_string()
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                error!("Failed to get version, stderr: {}", stderr);
                String::new()
            }
        }
        Err(e) => {
            error!("Failed to execute `version` command: {:?}", e);
            String::new()
        }
    }
}

pub fn get_ray_exe() -> String {
    dirs::get_doay_ray_dir().unwrap().join(RAY).to_str().unwrap().to_string()
}

pub fn get_ray_config_path() -> String {
    dirs::get_doay_conf_dir().unwrap().join("ray_config.json").to_str().unwrap().to_string()
}

pub fn read_ray_config() -> Value {
    debug!("read_ray_config triggered");
    let config_path = get_ray_config_path();
    match fs::read_to_string(config_path) {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(value) => value,
            Err(e) => {
                error!("Failed to parse config file: {}", e);
                json!(null)
            }
        },
        Err(e) => {
            error!("Failed to read config file: {}", e);
            json!(null)
        }
    }
}

pub fn save_ray_config(content: &str) -> bool {
    let config_path = get_ray_config_path();
    match fs::File::create(config_path) {
        Ok(mut file) => {
            if let Err(e) = file.write_all(content.as_bytes()) {
                error!("Failed to write config file: {}", e);
                return false;
            }
            info!("Ray config saved successfully");
            true
        }
        Err(e) => {
            error!("Failed to create config file: {}", e);
            false
        }
    }
}

static CHILD_PROCESS_MAP: Lazy<Mutex<HashMap<u16, Option<Child>>>> = Lazy::new(|| Mutex::new(HashMap::new()));

pub fn start_speed_test_server(port: u16, filename: &str) -> bool {
    let mut map = CHILD_PROCESS_MAP.lock().unwrap();
    if map.contains_key(&port) {
        warn!("Speed test server is already running, port: {}", port);
        return false;
    }

    let ray_conf = dirs::get_doay_conf_dir().unwrap().join("speed_test").join(filename);
    if !ray_conf.exists() {
        error!("Failed to filename not exist: {}", filename);
        return false;
    }

    let ray_path = get_ray_exe();
    let ray_conf = ray_conf.to_str().unwrap().to_string();
    debug!("Speed test server ray_path: {}", ray_path);
    debug!("Speed test server ray_conf: {}", ray_conf);

    let child = match command_new(&ray_path)
        .args(&["run", "-c", &ray_conf])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => child,
        Err(e) => {
            error!("Failed to start speed test server: {:?}", e);
            return false;
        }
    };

    info!("Speed test server started with PID: {}", child.id());

    map.insert(port, Some(child));
    true
}

pub fn stop_speed_test_server(port: u16) -> bool {
    let mut map = CHILD_PROCESS_MAP.lock().unwrap();
    if !map.contains_key(&port) {
        warn!("Speed test server is not running, port: {}", port);
        return false;
    }

    if let Some(child_option) = map.remove(&port) {
        if let Some(mut child) = child_option {
            if let Err(e) = child.kill() {
                error!("Failed to kill speed test server: {}", e);
                map.insert(port, Some(child)); // 如果 kill 失败，将子进程重新插入到 map 中
                return false;
            }
            if let Err(e) = child.wait() {
                error!("Failed to wait for speed test server to terminate: {}", e);
                return false;
            }
            info!("Speed test server stopped successfully, map len: {}", map.len());
            true
        } else {
            error!("Failed to retrieve child process from map, port: {}", port);
            false
        }
    } else {
        error!("Failed to remove server from map, port: {}", port);
        false
    }
}
