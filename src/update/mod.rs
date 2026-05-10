pub mod keys;
pub mod manifest;
pub mod verify;

pub const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const BUILD_COMMIT: &str = env!("ICEFALL_GIT_COMMIT");
pub const BUILD_TARGET: &str = env!("ICEFALL_TARGET_TRIPLE");
pub const BUILD_DATE: &str = env!("ICEFALL_BUILD_DATE");

pub fn artifact_target() -> &'static str {
    match BUILD_TARGET {
        t if t.contains("x86_64") && t.contains("linux") => "x86_64-linux",
        t if t.contains("aarch64") && t.contains("linux") => "aarch64-linux",
        other => other,
    }
}
