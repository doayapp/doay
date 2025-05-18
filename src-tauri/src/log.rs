use crate::config;
use crate::dirs;
use chrono::{Local, TimeZone};
use logger::{trace, error};
use serde_json::{json, Value};
use std::fs::{self, File, OpenOptions};
use std::io::{BufWriter, Read, Seek, SeekFrom, Write};

pub fn init() {
    let config = config::get_config();
    logger::set_log_level(&config.app_log_level);

    if &config.app_log_level.to_lowercase() != "none" {
        logger::set_log_filepath(dirs::get_doay_logs_dir().unwrap().join("doay.log").to_str().unwrap()).unwrap_or_else(|e| {
            eprintln!("Failed to set log file path: {}", e);
        });
    }
}

fn get_level_rank(level: &str) -> u8 {
    match level.to_lowercase().as_str() {
        "none" => 0,
        "error" => 1,
        "warn" => 2,
        "info" => 3,
        "debug" => 4,
        "trace" => 5,
        _ => 3,
    }
}

pub fn write_web_interface_log(level: &str, msg: &str) -> bool {
    let config = config::get_config();
    if get_level_rank(level) > get_level_rank(&config.app_log_level) {
        return true; // 低于配置日志级别，不记录
    }

    let log_file = match dirs::get_doay_logs_dir() {
        Some(dir) => dir.join("doay_web_interface.log"),
        None => {
            error!("Failed to get logs directory");
            return false;
        }
    };

    match OpenOptions::new().create(true).append(true).open(&log_file) {
        Ok(file) => {
            let mut writer = BufWriter::new(file);
            let now = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            if writeln!(writer, "{} [{}] {}", now, level.to_uppercase(), msg).is_err() {
                error!("Failed to write doay_web_interface.log");
                return false;
            }
            true
        }
        Err(e) => {
            error!("Failed to open log file: {}", e);
            false
        }
    }
}

pub fn read_log_list() -> Value {
    let mut logs = Vec::new();

    // 读取目录下的所有文件
    let log_dir = dirs::get_doay_logs_dir().unwrap();
    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |ext| ext == "log") {
                    if let Ok(metadata) = fs::metadata(&path) {
                        logs.push(json!({
                            "filename": path.file_name().unwrap().to_string_lossy(),
                            "size": metadata.len(),
                            "last_modified": metadata.modified().map_or("0000-00-00 00:00:00".to_string(), |t| format_timestamp(t)),
                        }));
                    } else {
                        error!("Failed to get metadata for file: {}", path.display());
                    }
                }
            }
        }
    }

    // 根据 filename 进行排序
    logs.sort_by(|a, b| {
        let a_filename = a["filename"].as_str().unwrap_or("");
        let b_filename = b["filename"].as_str().unwrap_or("");
        a_filename.cmp(b_filename)
    });

    json!(logs)
}

fn format_timestamp(modified_time: std::time::SystemTime) -> String {
    match modified_time.duration_since(std::time::UNIX_EPOCH) {
        Ok(system_time) => match Local.timestamp_opt(system_time.as_secs() as i64, system_time.subsec_nanos()) {
            chrono::LocalResult::Single(dt) => dt.format("%Y-%m-%d %H:%M:%S").to_string(),
            _ => "0000-00-00 00:00:00".to_string(),
        },
        Err(_) => "0000-00-00 00:00:00".to_string(),
    }
}

pub fn read_log_file(filename: &str, reverse: bool, start_position: i64) -> Value {
    trace!("read: {}, reverse: {}, start_position: {}", filename, reverse, start_position);
    // const DEFAULT_READ_SIZE: u64 = 1024 * 100; // 100KB
    const DEFAULT_READ_SIZE: u64 = 1000 * 100; // 100KB

    let default_json = json!({
        "content": "",
        "start": 0,
        "end": 0,
        "size": 0
    });

    // 过滤文件名，只允许英文字母、数字、_、-、.
    if filename.chars().any(|c| !c.is_ascii_alphanumeric() && c != '_' && c != '-' && c != '.') {
        error!("Invalid filename: {}", filename);
        return json!({"content": "", "start": 0, "end": 0});
    }

    let file_path = dirs::get_doay_logs_dir().unwrap().join(filename);

    let mut file = match File::open(&file_path) {
        Ok(file) => file,
        Err(e) => {
            error!("Failed to open log file {}: {}", file_path.display(), e);
            return default_json;
        }
    };

    let file_size = match file.seek(SeekFrom::End(0)) {
        Ok(size) => size,
        Err(e) => {
            error!("Failed to get file size: {}", e);
            return default_json;
        }
    };

    // 如果文件为空，直接返回空内容
    if file_size == 0 {
        return default_json;
    }

    // 确保 start_position 在文件范围内
    let start_position = if start_position < 0 {
        // -1: 倒序为文件末尾，正序为文件开头
        if reverse {
            file_size
        } else {
            0
        }
    } else {
        std::cmp::min(start_position as u64, file_size) // 限制在文件范围内
    };

    // 计算初始读取范围
    let (read_start, read_end) = if reverse {
        // 倒序读取：从 start_position 往前读取 DEFAULT_READ_SIZE
        let start = start_position.saturating_sub(DEFAULT_READ_SIZE); // 防止下溢
        (start, start_position) // read_end 应该是 start_position
    } else {
        // 正序读取：从 start_position 往后读取 DEFAULT_READ_SIZE
        let end = start_position.saturating_add(DEFAULT_READ_SIZE); // 防止上溢
        (start_position, std::cmp::min(end, file_size))
    };

    // 读取文件内容
    if let Err(e) = file.seek(SeekFrom::Start(read_start)) {
        error!("Failed to seek file: {}", e);
        return default_json;
    }

    let mut buffer = vec![0; (read_end - read_start) as usize];
    let bytes_read = match file.read(&mut buffer) {
        Ok(size) => size,
        Err(e) => {
            error!("Failed to read file: {}", e);
            return default_json;
        }
    };
    buffer.truncate(bytes_read);

    let raw_content = match String::from_utf8(buffer) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to convert bytes to string: {}", e);
            return default_json;
        }
    };

    // 处理内容边界
    let (processed_content, actual_start, actual_end) = if raw_content.len() < DEFAULT_READ_SIZE as usize {
        // 如果内容小于 100KB，不做任何处理
        (raw_content.as_str(), read_start, read_end)
    } else if reverse {
        // 倒序读取时，去掉第一行不完整的内容
        if let Some(first_newline) = raw_content.find('\n') {
            (&raw_content[first_newline + 1..], read_start + first_newline as u64 + 1, read_end)
        } else {
            (raw_content.as_str(), read_start, read_end)
        }
    } else {
        // 正序读取时，去掉最后一行不完整的内容
        if let Some(last_newline) = raw_content.rfind('\n') {
            (&raw_content[..last_newline], read_start, read_start + last_newline as u64)
        } else {
            (raw_content.as_str(), read_start, read_end)
        }
    };

    json!({
        "content": processed_content,
        "start": actual_start,
        "end": actual_end,
        "size": file_size
    })
}

pub fn clear_log_all() -> bool {
    let mut success = true;
    let log_dir = dirs::get_doay_logs_dir().unwrap();

    let preserve_files = [
        "doay.log",
        "doay_web_interface.log",
        "web_server.log",
        "xray_access.log",
        "xray_error.log",
        "xray_server.log",
    ];

    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() && path.extension().map_or(false, |ext| ext == "log") {
                    let filename = path.file_name().unwrap().to_string_lossy().to_string();
                    if preserve_files.contains(&filename.as_str()) {
                        if !clear_log_file(&path) {
                            success = false;
                        }
                    } else {
                        if let Err(e) = fs::remove_file(&path) {
                            error!("Failed to delete file {}: {}", path.display(), e);
                            success = false;
                        }
                    }
                }
            }
        }
    }
    success
}

fn clear_log_file(path: &std::path::Path) -> bool {
    match OpenOptions::new().write(true).truncate(true).open(path) {
        Ok(_) => true,
        Err(e) => {
            error!("Failed to clear file {}: {}", path.display(), e);
            false
        }
    }
}
