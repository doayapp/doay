use crate::config;
use crate::dirs;
use crate::network;
use crate::ray;
use crate::web;
use logger::{error, info};
use std::fs;
use tauri::menu::{Menu, MenuBuilder, MenuItem};
use tauri::path::BaseDirectory;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, Manager, Runtime};

#[cfg(target_os = "macos")]
use tauri::menu::{PredefinedMenuItem, Submenu};

#[cfg(any(target_os = "macos", target_os = "linux"))]
use std::os::unix::fs::PermissionsExt;

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

    let resource_dir = app.handle().path().resolve("ray", BaseDirectory::Resource)?;
    tauri::async_runtime::spawn(async move {
        if let Err(e) = prepare_ray_resources(resource_dir) {
            error!("Failed to prepare ray resources: {}", e);
        } else {
            start_services();
        }
    });

    Ok(())
}

fn start_services() {
    let config = config::get_config();
    if config.ray_enable {
        ray::start();
        network::setup_proxies();
    }
    if config.web_server_enable {
        web::start();
    }
}

pub fn create_main_window(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "macos")]
    let _ = app.handle().set_activation_policy(tauri::ActivationPolicy::Accessory);

    // more see: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/webview/webview_window.rs
    let main_window = tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()))
        .title("Doay")
        .min_inner_size(800.0, 600.0)
        .inner_size(800.0, 600.0)
        .visible(false)
        .center()
        .build()?;
    info!("Doay main window created");

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    let _ = main_window.set_skip_taskbar(true);

    // 注册关闭事件：拦截并隐藏窗口
    main_window.clone().on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            main_window.hide().unwrap();
        }
    });

    Ok(())
}

fn set_tray<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
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
                }
            }
            _ => {}
        })
        .build(app)?;
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

fn prepare_ray_resources(resource_dir: std::path::PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    if !resource_dir.exists() {
        return Ok(());
    }

    let target_dir = dirs::get_doay_ray_dir().ok_or("Failed to get doay ray directory")?;
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir)?;
    }
    fs::create_dir_all(&target_dir)?;

    info!("Copying ray resources {} to {}", resource_dir.display(), target_dir.display());
    for entry in fs::read_dir(&resource_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            let dest = target_dir.join(entry.file_name());
            fs::copy(&path, &dest)?;

            // 适用于 macOS 和 Linux
            #[cfg(unix)]
            {
                let mut perms = fs::metadata(&dest)?.permissions();
                if entry.file_name() == "xray" {
                    perms.set_mode(0o755);
                } else {
                    perms.set_mode(0o644);
                }
                fs::set_permissions(&dest, perms)?;
            }

            // 适用于 Windows
            #[cfg(windows)]
            {
                let mut perms = fs::metadata(&dest)?.permissions();
                perms.set_readonly(false);
                fs::set_permissions(&dest, perms)?;
            }
        }
    }

    fs::remove_dir_all(&resource_dir)?;

    Ok(())
}
