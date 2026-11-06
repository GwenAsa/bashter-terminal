//! User configuration stored at `$XDG_CONFIG_HOME/bashter/config.json`
//! (usually `~/.config/bashter/config.json`).
//!
//! Loading never fails: a missing file yields defaults, and an unreadable or
//! corrupt file is moved aside and replaced by defaults, so a bad edit can
//! never stop the terminal from opening.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

pub const MIN_FONT_SIZE: u8 = 8;
pub const MAX_FONT_SIZE: u8 = 40;
pub const MAX_SCROLLBACK: u32 = 1_000_000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Config {
    pub theme: String,
    pub font_family: String,
    pub font_size: u8,
    pub line_height: f32,
    pub scrollback: u32,
    pub cursor_style: String,
    pub cursor_blink: bool,
    /// Opt-in WebGL renderer. Faster on big output, but WebKitGTK drivers vary.
    pub gpu_rendering: bool,
    /// Absolute path to the shell; `None` means "$SHELL, then /bin/bash".
    pub shell: Option<String>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            theme: "nightshift".into(),
            font_family:
                "\"JetBrains Mono Variable\", \"JetBrains Mono\", \"Fira Code\", monospace".into(),
            font_size: 14,
            line_height: 1.25,
            scrollback: 10_000,
            cursor_style: "block".into(),
            cursor_blink: true,
            gpu_rendering: false,
            shell: None,
        }
    }
}

impl Config {
    /// Clamps every field into a safe range. Applied to anything coming from
    /// disk *and* from the frontend, so both sides are validated here.
    pub fn sanitized(mut self) -> Self {
        let defaults = Config::default();
        self.font_size = self.font_size.clamp(MIN_FONT_SIZE, MAX_FONT_SIZE);
        self.scrollback = self.scrollback.min(MAX_SCROLLBACK);
        self.line_height = if self.line_height.is_finite() {
            self.line_height.clamp(1.0, 2.5)
        } else {
            defaults.line_height
        };
        if !matches!(self.cursor_style.as_str(), "block" | "underline" | "bar") {
            self.cursor_style = defaults.cursor_style;
        }
        if self.theme.trim().is_empty() || self.theme.len() > 64 {
            self.theme = defaults.theme;
        }
        if self.font_family.trim().is_empty() || self.font_family.len() > 512 {
            self.font_family = defaults.font_family;
        }
        self.shell = self
            .shell
            .filter(|s| Path::new(s).is_absolute() && Path::new(s).is_file());
        self
    }
}

/// `~/.config/bashter`, or `None` if the platform has no config directory.
pub fn config_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|dir| dir.join("bashter"))
}

pub fn config_path() -> Option<PathBuf> {
    config_dir().map(|dir| dir.join("config.json"))
}

/// Loads the config from `path`, falling back to defaults on any problem.
pub fn load_from(path: &Path) -> Config {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(_) => return Config::default(), // missing file is the normal first run
    };
    match serde_json::from_str::<Config>(&text) {
        Ok(config) => config.sanitized(),
        Err(_) => {
            // Keep the broken file for the user to inspect instead of overwriting it.
            let _ = fs::rename(path, path.with_extension("json.corrupt"));
            Config::default()
        }
    }
}

/// Writes the config atomically (temp file + rename) so a crash mid-write
/// can never leave a half-written file behind.
pub fn save_to(path: &Path, config: &Config) -> AppResult<()> {
    let parent = path
        .parent()
        .ok_or_else(|| AppError::Io("config path has no parent directory".into()))?;
    fs::create_dir_all(parent)?;
    let json = serde_json::to_string_pretty(config).map_err(|e| AppError::Io(e.to_string()))?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json)?;
    fs::rename(&tmp, path)?;
    Ok(())
}

pub fn load() -> Config {
    config_path().map(|p| load_from(&p)).unwrap_or_default()
}

pub fn save(config: &Config) -> AppResult<()> {
    let path = config_path().ok_or_else(|| AppError::Io("no config directory available".into()))?;
    save_to(&path, config)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_file_gives_defaults() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(load_from(&dir.path().join("nope.json")), Config::default());
    }

    #[test]
    fn roundtrip_preserves_values() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("sub").join("config.json");
        let config = Config { font_size: 18, theme: "daybreak".into(), ..Config::default() };
        save_to(&path, &config).unwrap();
        assert_eq!(load_from(&path), config);
    }

    #[test]
    fn partial_file_fills_in_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        fs::write(&path, r#"{ "fontSize": 20 }"#).unwrap();
        let loaded = load_from(&path);
        assert_eq!(loaded.font_size, 20);
        assert_eq!(loaded.scrollback, Config::default().scrollback);
    }

    #[test]
    fn corrupt_file_is_moved_aside() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        fs::write(&path, "{ this is not json").unwrap();
        assert_eq!(load_from(&path), Config::default());
        assert!(dir.path().join("config.json.corrupt").exists());
    }

    #[test]
    fn out_of_range_values_are_clamped() {
        let config = Config {
            font_size: 200,
            scrollback: u32::MAX,
            line_height: f32::NAN,
            cursor_style: "wobbly".into(),
            shell: Some("relative/shell".into()),
            ..Config::default()
        }
        .sanitized();
        assert_eq!(config.font_size, MAX_FONT_SIZE);
        assert_eq!(config.scrollback, MAX_SCROLLBACK);
        assert_eq!(config.line_height, Config::default().line_height);
        assert_eq!(config.cursor_style, "block");
        assert_eq!(config.shell, None);
    }
}
