use logger::trace;
use once_cell::sync::Lazy;
use std::env;
use std::sync::Mutex;

static QUIET_MODE: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

pub fn parse_args() {
    let args: Vec<String> = env::args().collect();
    trace!("Arguments: {:?}", args);

    if args.len() == 3 && args[1] == "-s" && args[2] == "quiet" {
        let mut quiet_mode = QUIET_MODE.lock().unwrap();
        *quiet_mode = true;
    }
}

pub fn is_quiet_mode() -> bool {
    let quiet_mode = QUIET_MODE.lock().unwrap();
    *quiet_mode
}
