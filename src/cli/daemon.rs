use crate::config::IcefallConfig;
use crate::daemon::DaemonRunner;

pub async fn start() {
    let config = match IcefallConfig::load() {
        Ok(config) => config,
        Err(e) => {
            eprintln!("Failed to load configuration: {e}");
            std::process::exit(1);
        }
    };

    if let Err(e) = DaemonRunner::start(config).await {
        eprintln!("Daemon error: {e}");
        std::process::exit(1);
    }
}

pub async fn stop() {
    let config = match IcefallConfig::load() {
        Ok(config) => config,
        Err(e) => {
            eprintln!("Failed to load configuration: {e}");
            std::process::exit(1);
        }
    };

    let pid_file = &config.pid_file;
    let pid_str = match std::fs::read_to_string(pid_file) {
        Ok(s) => s,
        Err(_) => {
            eprintln!(
                "No PID file found at {}. Is the daemon running?",
                pid_file.display()
            );
            std::process::exit(1);
        }
    };

    let pid: i32 = match pid_str.trim().parse() {
        Ok(p) => p,
        Err(_) => {
            eprintln!("Invalid PID file contents");
            std::process::exit(1);
        }
    };

    let pid = nix::unistd::Pid::from_raw(pid);
    match nix::sys::signal::kill(pid, nix::sys::signal::Signal::SIGTERM) {
        Ok(()) => println!("Sent SIGTERM to daemon (pid {pid})"),
        Err(e) => {
            eprintln!("Failed to stop daemon: {e}");
            std::process::exit(1);
        }
    }
}

pub async fn status() {
    let config = match IcefallConfig::load() {
        Ok(config) => config,
        Err(e) => {
            eprintln!("Failed to load configuration: {e}");
            std::process::exit(1);
        }
    };

    let pid_file = &config.pid_file;
    let pid_str = match std::fs::read_to_string(pid_file) {
        Ok(s) => s,
        Err(_) => {
            println!("Daemon is not running (no PID file)");
            return;
        }
    };

    let pid: i32 = match pid_str.trim().parse() {
        Ok(p) => p,
        Err(_) => {
            println!("Daemon is not running (invalid PID file)");
            return;
        }
    };

    let pid = nix::unistd::Pid::from_raw(pid);
    match nix::sys::signal::kill(pid, None) {
        Ok(()) => println!("Daemon is running (pid {pid})"),
        Err(_) => println!("Daemon is not running (stale PID file)"),
    }
}
