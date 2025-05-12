use logger::{debug, error};
use std::fs;
use std::io::Write;

pub fn save_text_file(path: &str, content: &str) -> bool {
    if path.contains("../") || path.contains("..\\") {
        error!("Blocked potentially malicious path: {}", path);
        return false;
    }

    match fs::File::create(path) {
        Ok(mut file) => {
            if let Err(e) = file.write_all(content.as_bytes()) {
                error!("Failed to write text file: {}", e);
                false
            } else {
                debug!("Text file saved successfully: {}", path);
                true
            }
        }
        Err(e) => {
            error!("Failed to create text file: {}", e);
            false
        }
    }
}
