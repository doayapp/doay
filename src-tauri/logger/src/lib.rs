//! 这是一个日志记录模块，提供了日志记录功能
//! 支持不同级别的日志（如 None, Error, Warn, Info, Debug, Trace）
//! 可以将日志输出到控制台和文件，并支持日志文件的自动轮转

/**
用例：
[dependencies]
logger = { path = "./logger" }

use logger::{debug, error, info, trace, warn};

fn main() {
    logger::set_log_level("info");
    logger::set_log_filepath("logs/main.log").unwrap_or_else(|e| {
        eprintln!("设置日志文件路径失败: {}", e);
    });
    logger::set_log_max_size(2 * 1024 * 1024);

    println!("{:?}", logger::get_log_config());
    println!("{:?}", logger::get_log_writer());

    // 测试性能的循环
    for i in 0..3 {
        error!("这是一个日志，{}", i);
        warn!("这是一个日志，{}", i);
        info!("这是一个日志，{}", i);
        debug!("这是一个日志，{}", i);
        trace!("这是一个日志，{}", i);
    }
}
*/
use chrono::Local;
use once_cell::sync::Lazy;
use std::fs::{self, File};
use std::io::{self, BufWriter, Write};
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

// 日志级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LogLevel {
    None,
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

// 日志配置
#[derive(Debug)]
pub struct LogConfig {
    pub log_level: LogLevel,
    pub log_filepath: Option<PathBuf>,
    pub log_max_size: u64,
}

static LOG_CONFIG: Lazy<Mutex<LogConfig>> = Lazy::new(|| {
    Mutex::new(LogConfig {
        log_level: LogLevel::Trace,
        log_filepath: None,
        log_max_size: 5 * 1024 * 1024, // 设置默认值为 5MB
    })
});

static LOG_WRITER: Lazy<Mutex<Option<BufWriter<File>>>> = Lazy::new(|| Mutex::new(None));

// 获取全局配置
pub fn get_log_config() -> MutexGuard<'static, LogConfig> {
    LOG_CONFIG.lock().unwrap()
}

// 初始化 BufWriter
fn init_log_writer(filepath: &PathBuf) -> io::Result<()> {
    let mut writer = LOG_WRITER.lock().unwrap();
    if writer.is_none() {
        let file = File::options().append(true).create(true).open(filepath)?;
        *writer = Some(BufWriter::new(file));
    }
    Ok(())
}

// 设置 BufWriter
fn set_log_writer(filepath: &PathBuf) -> io::Result<()> {
    let mut writer = LOG_WRITER.lock().unwrap();
    let file = File::options().append(true).create(true).open(filepath)?;
    *writer = Some(BufWriter::new(file));
    Ok(())
}

// 获取 BufWriter
pub fn get_log_writer() -> MutexGuard<'static, Option<BufWriter<File>>> {
    LOG_WRITER.lock().unwrap()
}

// 日志级别字符串
pub fn level_str(level: LogLevel) -> &'static str {
    match level {
        LogLevel::None => "none",
        LogLevel::Error => "error",
        LogLevel::Warn => "warn",
        LogLevel::Info => "info",
        LogLevel::Debug => "debug",
        LogLevel::Trace => "trace",
    }
}

pub fn log(level: LogLevel, message: &str) -> Result<(), io::Error> {
    let config = get_log_config();
    // 如果当前日志级别低于设置的级别，则不记录
    if level > config.log_level || config.log_level == LogLevel::None {
        // println!("{:?} 大于 {:?}", level, config.log_level);
        return Ok(());
    }

    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_message = format!("{} [{}] {}\n", timestamp, level_str(level), message);

    // 输出到控制台
    match level {
        LogLevel::None => (),
        LogLevel::Error => println!("\x1b[31m{}\x1b[0m", log_message.trim_end()),
        LogLevel::Warn => println!("\x1b[33m{}\x1b[0m", log_message.trim_end()),
        LogLevel::Info => println!("\x1b[32m{}\x1b[0m", log_message.trim_end()),
        LogLevel::Debug => println!("\x1b[34m{}\x1b[0m", log_message.trim_end()),
        LogLevel::Trace => println!("\x1b[35m{}\x1b[0m", log_message.trim_end()),
    }

    if let Some(log_filepath) = &config.log_filepath {
        init_log_writer(log_filepath)?; // 初始化 BufWriter
        if let Some(writer) = get_log_writer().as_mut() {
            writer.write_all(log_message.as_bytes())?; // 写入日志，性能比 writeln! 高
            writer.flush()?;
        }

        // 判断文件大小是否超过最大值
        let metadata = fs::metadata(log_filepath)?;
        if metadata.len() > config.log_max_size {
            let file_stem = log_filepath.file_stem().and_then(|stem| stem.to_str()).unwrap_or("log");
            let extension = log_filepath.extension().and_then(|ext| ext.to_str()).unwrap_or("log");
            let timestamp = Local::now().format("%Y%m%d_%H%M%S_%3f");
            let bak_filepath = log_filepath.with_file_name(format!("{}.{}.{}", file_stem, timestamp, extension));
            fs::rename(log_filepath, bak_filepath)?;
            set_log_writer(log_filepath)?;
        }
    }

    Ok(())
}

// 设置日志级别
pub fn set_log_level(level_str: &str) {
    let mut config = get_log_config();
    config.log_level = match level_str.to_lowercase().as_str() {
        "error" => LogLevel::Error,
        "warn" => LogLevel::Warn,
        "info" => LogLevel::Info,
        "debug" => LogLevel::Debug,
        "trace" => LogLevel::Trace,
        _ => LogLevel::None, // 匹配不上的情况设置为 None
    };
}

// 设置日志文件路径
pub fn set_log_filepath(filepath: &str) -> io::Result<()> {
    let mut config = get_log_config();
    config.log_filepath = Some(PathBuf::from(filepath));
    if let Some(log_filepath) = config.log_filepath.as_ref() {
        // 如果有值，创建父目录
        if let Some(parent_dir) = log_filepath.parent() {
            if !parent_dir.exists() {
                fs::create_dir_all(parent_dir)?;
            }
        }
    }
    set_log_writer(&PathBuf::from(filepath))?;
    Ok(())
}

// 设置日志文件最大大小（单位：字节）
pub fn set_log_max_size(size: u64) {
    let mut config = get_log_config();
    config.log_max_size = size
}

// 定义日志宏
#[macro_export]
macro_rules! error {
    ($($arg:tt)*) => {
        if let Err(e) = $crate::log($crate::LogLevel::Error, &format!($($arg)*)) {
            eprintln!("Failed to log: {}", e);
        }
    };
}

#[macro_export]
macro_rules! warn {
    ($($arg:tt)*) => {
        if let Err(e) = $crate::log($crate::LogLevel::Warn, &format!($($arg)*)) {
            eprintln!("Failed to log: {}", e);
        }
    };
}

#[macro_export]
macro_rules! info {
    ($($arg:tt)*) => {
        if let Err(e) = $crate::log($crate::LogLevel::Info, &format!($($arg)*)) {
            eprintln!("Failed to log: {}", e);
        }
    };
}

#[macro_export]
macro_rules! debug {
    ($($arg:tt)*) => {
        if let Err(e) = $crate::log($crate::LogLevel::Debug, &format!($($arg)*)) {
            eprintln!("Failed to log: {}", e);
        }
    };
}

#[macro_export]
macro_rules! trace {
    ($($arg:tt)*) => {
        if let Err(e) = $crate::log($crate::LogLevel::Trace, &format!($($arg)*)) {
            eprintln!("Failed to log: {}", e);
        }
    };
}
