use crate::config;
use crate::network;
use crate::ray;
use crate::web;
use logger::{error, info};
use once_cell::sync::OnceCell;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuBuilder, MenuItem},
    path::BaseDirectory,
    tray::TrayIconBuilder,
    App, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

#[cfg(not(target_os = "linux"))]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};

#[cfg(target_os = "macos")]
use tauri::menu::{PredefinedMenuItem, Submenu};

pub fn init(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    if let Err(e) = create_main_window(app) {
        error!("Failed to create main window: {}", e);
    }

    if let Err(e) = set_tray(app) {
        error!("Failed to set tray: {}", e);
    }

    if let Err(e) = set_menu(app) {
        error!("Failed to set menu: {}", e);
    }

    set_doay_ray_dir(app);

    tauri::async_runtime::spawn(async {
        let config = config::get_config();

        if config.web_server_enable {
            web::start();
        }

        if config.ray_enable {
            ray::start();
            network::setup_proxies();
        }
    });

    Ok(())
}

static RAY_DIR: OnceCell<PathBuf> = OnceCell::new();

pub fn set_doay_ray_dir(app: &App) {
    match app.handle().path().resolve("ray", BaseDirectory::Resource) {
        Ok(path) => {
            if RAY_DIR.set(path).is_err() {
                error!("RAY_DIR has already been initialized");
            }
        }
        Err(err) => {
            error!("Failed to resolve resource directory: {:?}", err);
        }
    }
}

pub fn get_doay_ray_dir() -> Option<PathBuf> {
    if let Some(dir) = RAY_DIR.get() {
        Some(dir.clone())
    } else {
        Some(PathBuf::from("./ray"))
    }
}

pub fn create_main_window(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "linux")]
    let visible = false; // Linux 不隐藏，保证居中和最小化，最大化，关闭按钮正常

    #[cfg(not(target_os = "linux"))]
    let visible = false; // 其他平台默认隐藏窗口

    // more see: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/webview/webview_window.rs
    let main_window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Doay")
        .min_inner_size(800.0, 600.0)
        .inner_size(800.0, 600.0)
        .visible(visible)
        .center()
        .build()?;

    info!("Doay main window created");

    #[cfg(target_os = "macos")]
    let _ = app.handle().set_activation_policy(tauri::ActivationPolicy::Accessory);

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    let _ = main_window.set_skip_taskbar(true);

    // 拦截关闭，隐藏窗口而非退出程序
    main_window.clone().on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();

            // 隐藏窗口
            if let Err(e) = main_window.hide() {
                log::error!("Failed to hide window on close request: {}", e);
            }
        }
    });

    Ok(())
}

fn set_tray<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    #[cfg(not(target_os = "linux"))]
    {
        let quit_i = MenuItem::with_id(app, "quit", "退出 Doay", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&quit_i])?;
        TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .show_menu_on_left_click(false)
            .on_menu_event(|app, event| match event.id.as_ref() {
                "quit" => {
                    app.exit(0);
                }
                _ => {
                    // println!("menu item {:?} not handled", event.id);
                }
            })
            .on_tray_icon_event(|tray, event| match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        if let Ok(state) = window.is_minimized() {
                            if state {
                                let _ = window.unminimize();
                            }
                        }
                        let _ = window.show();
                        let _ = window.set_focus();
                        // let _ = window.set_always_on_top(true); // 让窗口置顶，防止被遮挡
                    }
                }
                _ => {}
            })
            .build(app)?;
    }

    #[cfg(target_os = "linux")]
    {
        let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
        let quit_i = MenuItem::with_id(app, "quit", "退出 Doay", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

        TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .on_menu_event(|app, event| match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        if let Ok(state) = window.is_minimized() {
                            if state {
                                let _ = window.unminimize();
                            }
                        }

                        let _ = window.show();
                        let _ = window.set_focus();
                        // let _ = window.set_always_on_top(true); // 让窗口置顶，防止被遮挡

                        // 延迟取消置顶 + 再次聚焦（增强兼容性）
                        tauri::async_runtime::spawn({
                            let window = window.clone();
                            async move {
                                std::thread::sleep(std::time::Duration::from_millis(200));
                                let _ = window.set_focus();
                                // let _ = window.set_always_on_top(true);
                            }
                        });
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            })
            .build(app)?;
    }

    Ok(())
}

fn set_menu<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    #[cfg(not(target_os = "macos"))]
    {
        // Linux 和 Windows 不显示菜单
        let menu = MenuBuilder::new(app).build()?;
        app.set_menu(menu)?;
    }

    #[cfg(target_os = "macos")]
    {
        let app_handle = app.handle();
        let edit_menu = Submenu::with_items(
            app_handle,
            "Edit",
            true,
            &[
                &PredefinedMenuItem::undo(app_handle, None)?,
                &PredefinedMenuItem::redo(app_handle, None)?,
                &PredefinedMenuItem::separator(app_handle)?,
                &PredefinedMenuItem::cut(app_handle, None)?,
                &PredefinedMenuItem::copy(app_handle, None)?,
                &PredefinedMenuItem::paste(app_handle, None)?,
                &PredefinedMenuItem::select_all(app_handle, None)?,
            ],
        )?;

        let menu = MenuBuilder::new(app).item(&edit_menu).build()?;
        app.set_menu(menu)?;
    }

    Ok(())
}

/* fn prepare_ray_resources(resource_dir: PathBuf) -> bool {
    let target_dir = match dirs::get_doay_ray_dir() {
        Some(dir) => dir,
        None => {
            error!("Failed to get doay ray directory");
            return false;
        }
    };

    if target_dir.exists() {
        return true;
    }

    /*if target_dir.exists() {
        if let Err(e) = fs::remove_dir_all(&target_dir) {
            error!("Failed to remove existing target directory {}: {}", target_dir.display(), e);
            return false;
        }
    }*/

    if let Err(e) = fs::create_dir_all(&target_dir) {
        error!("Failed to create target directory {}: {}", target_dir.display(), e);
        return false;
    }

    info!("Copying ray resources from {} to {}", resource_dir.display(), target_dir.display());

    let entries = match fs::read_dir(&resource_dir) {
        Ok(entries) => entries,
        Err(e) => {
            error!("Failed to read resource directory {}: {}", resource_dir.display(), e);
            return false;
        }
    };

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                error!("Failed to read entry in resource directory: {}", e);
                return false;
            }
        };

        let path = entry.path();
        if path.is_file() {
            let dest = target_dir.join(entry.file_name());

            if let Err(e) = fs::copy(&path, &dest) {
                error!("Failed to copy file {} to {}: {}", path.display(), dest.display(), e);
                return false;
            }

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mode = if entry.file_name() == "xray" { 0o755 } else { 0o644 };

                if let Err(e) = fs::set_permissions(&dest, fs::Permissions::from_mode(mode)) {
                    error!("Failed to set permissions for {}: {}", dest.display(), e);
                    return false;
                }
            }

            #[cfg(windows)]
            {
                let mut perms = match fs::metadata(&dest).map(|m| m.permissions()) {
                    Ok(p) => p,
                    Err(e) => {
                        error!("Failed to get permissions for {}: {}", dest.display(), e);
                        return false;
                    }
                };

                perms.set_readonly(false);

                if let Err(e) = fs::set_permissions(&dest, perms) {
                    error!("Failed to set permissions for {}: {}", dest.display(), e);
                    return false;
                }
            }
        }
    }

    if let Err(e) = fs::remove_dir_all(&resource_dir) {
        error!("Failed to remove resource directory {}: {}", resource_dir.display(), e);
        return false;
    }

    true
} */
