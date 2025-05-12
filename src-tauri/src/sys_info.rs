use logger::{error, trace};
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{Components, Disks, Networks, Pid, System, Users};

static SYS: Lazy<Mutex<Option<System>>> = Lazy::new(|| Mutex::new(None));

fn get_or_init_system() -> std::sync::MutexGuard<'static, Option<System>> {
    let mut sys = SYS.lock().unwrap();
    sys.get_or_insert_with(|| System::new_all());
    sys
}

pub fn get_sys_info_json() -> Value {
    let start = Instant::now();
    let mut sys = get_or_init_system();
    sys.as_mut().map(|sys| sys.refresh_all());
    let sys = sys.as_ref().unwrap();
    trace!("System info refresh all, time elapsed: {:?}", start.elapsed());

    json!({
        "long_os_version": System::long_os_version(), // 操作系统长版本信息
        "kernel_long_version": System::kernel_long_version(), // 操作系统内核版本
        "host_name": System::host_name(), // 系统主机名
        "uptime": System::uptime(), // 系统运行时间（以秒为单位）
        "physical_core_count": System::physical_core_count(), // CPU 物理核心数量
        "cpu_arch": System::cpu_arch(), // CPU 架构信息
        "cpu_len": sys.cpus().len(), // CPU 核数
        "process_len": sys.processes().len(), // 进程数
        "global_cpu_usage": sys.global_cpu_usage(), // 系统总 CPU 使用率
        "total_memory": sys.total_memory(),
        "used_memory": sys.used_memory(),
        "total_swap": sys.total_swap(),
        "used_swap": sys.used_swap(),
    })
}

pub fn get_load_average_json() -> Value {
    let load_avg = System::load_average();
    json!({
        "one": load_avg.one,
        "five": load_avg.five,
        "fifteen": load_avg.fifteen,
    })
}

pub fn get_processes_json(keyword: &str) -> Value {
    let mut sys = get_or_init_system();
    sys.as_mut().map(|sys| sys.refresh_all());
    let sys = sys.as_ref().unwrap();
    let users = Users::new_with_refreshed_list();

    let process_vec = sys
        .processes()
        .iter()
        .filter_map(|(pid, process)| {
            let exe = process.exe().map_or("".to_string(), |v| v.to_string_lossy().into_owned());

            if !keyword.is_empty() && !exe.to_lowercase().contains(&keyword.to_lowercase()) {
                return None;
            }

            /*let username = process
            .user_id()
            .and_then(|user_id| {
                users
                    .get_user_by_id(user_id)
                    .map(|user| user.name().to_string())
                    .or_else(|| Some(user_id.to_string()))
            })
            .unwrap_or_default();*/

            let username = process
                .user_id()
                .and_then(|user_id| users.get_user_by_id(user_id).map(|user| user.name().to_string()))
                .unwrap_or_default();

            Some(json!({
                "pid": pid.as_u32(),
                // "parent": process.parent(),
                "status": process.status().to_string(),
                "memory": process.memory(),
                // "virtual_memory": process.virtual_memory(),
                "user": username,
                "cpu_usage": process.cpu_usage(),
                // "accumulated_cpu_time": process.accumulated_cpu_time(),
                // "disk_usage": process.disk_usage(),
                // "exists": process.exists(),
                "start_time": process.start_time(),
                "name": process.name().to_string_lossy().to_string(),
                "exe": exe,
            }))
        })
        .collect::<Vec<_>>();
    json!(process_vec)
}

pub fn get_disks_json() -> Value {
    let disks = Disks::new_with_refreshed_list()
        .iter()
        .map(|disk| {
            json!({
                "name": disk.name().to_string_lossy().to_string(),
                "total_space": disk.total_space(),
                "available_space": disk.available_space(),
            })
        })
        .collect::<Vec<_>>();
    json!(disks)
}

pub fn get_networks_json() -> Value {
    let mut network_vec = Vec::new();
    let networks = Networks::new_with_refreshed_list();
    for (interface_name, data) in &networks {
        let interface_type = identify_interface_type(interface_name);
        network_vec.push(json!({
            "name": interface_name,
            "type": interface_type,
            "up": data.total_transmitted(),
            "down": data.total_received(),
        }));
    }
    json!(network_vec)
}

fn identify_interface_type(name: &str) -> &'static str {
    match name {
        // macOS
        "lo0" => "Loopback",
        "en0" | "en1" => "Ethernet",
        "awdl0" => "Apple Wireless Direct Link",
        "utun0" | "utun1" | "utun2" => "Virtual Tunnel",

        // Linux
        "lo" => "Loopback",
        "eth0" | "eth1" => "Ethernet",
        "wlan0" | "wlan1" => "Wireless",
        "tun0" | "tap0" => "Virtual Tunnel",

        // Windows
        "Loopback Pseudo-Interface" => "Loopback",
        "Ethernet" => "Ethernet",
        "Wi-Fi" => "Wireless",
        "Local Area Connection" => "Ethernet",

        _ => "Unknown",
    }
}

pub fn get_components_json() -> Value {
    let components = Components::new_with_refreshed_list()
        .iter()
        .map(|component| {
            json!({
                "label": component.label().to_string(),
                "temperature": component.temperature().map_or("".to_string(), |v| v.to_string()),
            })
        })
        .collect::<Vec<_>>();
    json!(components)
}

pub fn kill_process_by_pid(pid: u32) -> bool {
    let mut sys = get_or_init_system();
    sys.as_mut().map(|sys| sys.refresh_all());
    let sys = sys.as_ref().unwrap();

    let pid = Pid::from_u32(pid);
    if let Some(process) = sys.process(pid) {
        if process.kill() {
            trace!("Successfully killed process with PID {}", pid);
            true
        } else {
            error!("Failed to kill process with PID {}", pid);
            false
        }
    } else {
        error!("Process with PID {} not found", pid);
        false
    }
}
