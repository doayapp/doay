use std::process::Command;

fn main() {
    let output = Command::new("rustc").arg("-V").output().expect("Failed to execute rustc");
    let version = String::from_utf8_lossy(&output.stdout);
    println!("cargo:rustc-env=RUSTC_VERSION={}", version.trim());

    tauri_build::build()
}
