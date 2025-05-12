use crate::network;
use crate::ray;
use logger::info;
use tauri::{plugin::Plugin, AppHandle, RunEvent, Runtime};

pub struct CleanupPlugin;

impl<R: Runtime> Plugin<R> for CleanupPlugin {
    fn name(&self) -> &'static str {
        "cleanup-plugin"
    }

    fn on_event(&mut self, _app: &AppHandle<R>, event: &RunEvent) {
        match event {
            RunEvent::Exit => {
                exit_cleanly();
            }
            _ => {}
        }
    }
}

pub fn init() -> CleanupPlugin {
    CleanupPlugin {}
}

pub fn exit_cleanly() {
    network::disable_proxies();
    ray::force_kill();
    info!("Cleanup completed");
}
