//! PTY session management on top of `portable-pty`.
//!
//! This module is deliberately free of Tauri types so it can be unit-tested on
//! its own: output and exit are reported through plain callbacks, and the Tauri
//! command layer in `main.rs` adapts them to IPC channels.

use crate::error::{AppError, AppResult};
use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

const MAX_DIMENSION: u16 = 1000;
const MAX_WRITE_BYTES: usize = 1024 * 1024;
const READ_BUFFER_BYTES: usize = 16 * 1024;

/// Variables whose entries may point into an AppImage mount and must not leak
/// into the user's shell (they would make system programs load bundled libs).
const APPDIR_PATH_VARS: &[&str] = &[
    "LD_LIBRARY_PATH",
    "PATH",
    "XDG_DATA_DIRS",
    "XDG_CONFIG_DIRS",
    "PYTHONPATH",
    "PERLLIB",
    "GSETTINGS_SCHEMA_DIR",
];
const APPIMAGE_VARS: &[&str] = &["APPDIR", "APPIMAGE", "ARGV0", "OWD"];

#[derive(Debug, Clone)]
pub struct SpawnOptions {
    pub cols: u16,
    pub rows: u16,
    pub cwd: Option<PathBuf>,
    pub shell: Option<String>,
}

pub struct PtySession {
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
}

fn clamp_dimension(value: u16) -> u16 {
    value.clamp(1, MAX_DIMENSION)
}

fn pty_size(cols: u16, rows: u16) -> PtySize {
    PtySize { rows: clamp_dimension(rows), cols: clamp_dimension(cols), pixel_width: 0, pixel_height: 0 }
}

/// Picks the shell: explicit choice, then `$SHELL`, then `/bin/bash`, then `/bin/sh`.
pub fn resolve_shell(preferred: Option<&str>) -> AppResult<String> {
    let env_shell = std::env::var("SHELL").ok();
    let candidates = [preferred, env_shell.as_deref(), Some("/bin/bash"), Some("/bin/sh")];
    let found = candidates
        .into_iter()
        .flatten()
        .find(|candidate| Path::new(candidate).is_absolute() && Path::new(candidate).is_file())
        .map(str::to_owned);
    found.ok_or_else(|| AppError::Spawn("no usable shell found (tried $SHELL, /bin/bash, /bin/sh)".into()))
}

/// Removes entries under `appdir` from a colon-separated path list.
pub fn strip_appdir(value: &str, appdir: &str) -> String {
    value
        .split(':')
        .filter(|part| !part.is_empty() && !part.starts_with(appdir))
        .collect::<Vec<_>>()
        .join(":")
}

fn apply_environment(cmd: &mut CommandBuilder) {
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("TERM_PROGRAM", "BashTer");
    cmd.env("TERM_PROGRAM_VERSION", env!("CARGO_PKG_VERSION"));

    if let Ok(appdir) = std::env::var("APPDIR") {
        for var in APPDIR_PATH_VARS {
            if let Ok(value) = std::env::var(var) {
                let cleaned = strip_appdir(&value, &appdir);
                if cleaned.is_empty() {
                    cmd.env_remove(var);
                } else {
                    cmd.env(var, cleaned);
                }
            }
        }
    }
    for var in APPIMAGE_VARS {
        cmd.env_remove(var);
    }
}

impl PtySession {
    /// Starts the shell on a new PTY.
    ///
    /// `on_data` receives raw output chunks on a background thread.
    /// `on_exit` is called exactly once with the exit code after output ends.
    pub fn spawn<D, E>(opts: &SpawnOptions, on_data: D, on_exit: E) -> AppResult<PtySession>
    where
        D: Fn(&[u8]) + Send + 'static,
        E: FnOnce(i32) + Send + 'static,
    {
        let shell = resolve_shell(opts.shell.as_deref())?;
        let pair = native_pty_system()
            .openpty(pty_size(opts.cols, opts.rows))
            .map_err(|e| AppError::Spawn(e.to_string()))?;

        let mut cmd = CommandBuilder::new(&shell);
        apply_environment(&mut cmd);
        let cwd = opts
            .cwd
            .as_ref()
            .filter(|p| p.is_dir())
            .cloned()
            .or_else(dirs::home_dir)
            .filter(|p| p.is_dir());
        if let Some(cwd) = cwd {
            cmd.cwd(cwd);
        }

        let mut child = pair.slave.spawn_command(cmd).map_err(|e| AppError::Spawn(e.to_string()))?;
        // The parent must drop its slave handle, otherwise the reader never sees EOF.
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().map_err(|e| AppError::Spawn(e.to_string()))?;
        let writer = pair.master.take_writer().map_err(|e| AppError::Spawn(e.to_string()))?;
        let killer = child.clone_killer();

        thread::Builder::new()
            .name("bashter-pty-reader".into())
            .spawn(move || {
                let mut buf = vec![0u8; READ_BUFFER_BYTES];
                loop {
                    match reader.read(&mut buf) {
                        Ok(0) => break,
                        Ok(n) => on_data(&buf[..n]),
                        // Linux reports EIO when the slave side closes: that is a normal EOF.
                        Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                        Err(_) => break,
                    }
                }
                let code = child.wait().map(|status| status.exit_code() as i32).unwrap_or(-1);
                on_exit(code);
            })
            .map_err(|e| AppError::Spawn(e.to_string()))?;

        Ok(PtySession {
            master: Mutex::new(pair.master),
            writer: Mutex::new(writer),
            killer: Mutex::new(killer),
        })
    }

    pub fn write(&self, data: &[u8]) -> AppResult<()> {
        if data.len() > MAX_WRITE_BYTES {
            return Err(AppError::InvalidArgument(format!("write larger than {MAX_WRITE_BYTES} bytes")));
        }
        let mut writer = self.writer.lock().map_err(|_| AppError::Poisoned)?;
        writer.write_all(data)?;
        writer.flush()?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> AppResult<()> {
        let master = self.master.lock().map_err(|_| AppError::Poisoned)?;
        master.resize(pty_size(cols, rows)).map_err(|e| AppError::Io(e.to_string()))
    }

    /// Asks the child to terminate. Dropping the session also closes the PTY (SIGHUP).
    pub fn kill(&self) {
        if let Ok(mut killer) = self.killer.lock() {
            let _ = killer.kill();
        }
    }
}

/// Owns every live session, keyed by a numeric id handed to the frontend.
#[derive(Default)]
pub struct PtyManager {
    sessions: Mutex<HashMap<u32, Arc<PtySession>>>,
    next_id: AtomicU32,
}

impl PtyManager {
    pub fn insert(&self, session: PtySession) -> AppResult<u32> {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed) + 1;
        self.sessions.lock().map_err(|_| AppError::Poisoned)?.insert(id, Arc::new(session));
        Ok(id)
    }

    pub fn get(&self, id: u32) -> AppResult<Arc<PtySession>> {
        self.sessions
            .lock()
            .map_err(|_| AppError::Poisoned)?
            .get(&id)
            .cloned()
            .ok_or(AppError::SessionNotFound(id))
    }

    /// Removes the session and kills its process. Unknown ids are ignored so
    /// that closing an already-exited tab is harmless.
    pub fn remove(&self, id: u32) {
        let session = self.sessions.lock().ok().and_then(|mut map| map.remove(&id));
        if let Some(session) = session {
            session.kill();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::time::Duration;

    /// Spawns /bin/sh and collects output until `needle` appears or the timeout hits.
    fn run(commands: &str, needle: &str) -> (String, Option<i32>) {
        let (data_tx, data_rx) = mpsc::channel::<Vec<u8>>();
        let (exit_tx, exit_rx) = mpsc::channel::<i32>();
        let opts = SpawnOptions { cols: 80, rows: 24, cwd: None, shell: Some("/bin/sh".into()) };
        let session = PtySession::spawn(
            &opts,
            move |bytes| {
                let _ = data_tx.send(bytes.to_vec());
            },
            move |code| {
                let _ = exit_tx.send(code);
            },
        )
        .expect("spawn");
        session.write(commands.as_bytes()).expect("write");

        let mut output = String::new();
        let deadline = std::time::Instant::now() + Duration::from_secs(10);
        while std::time::Instant::now() < deadline && !output.contains(needle) {
            if let Ok(chunk) = data_rx.recv_timeout(Duration::from_millis(100)) {
                output.push_str(&String::from_utf8_lossy(&chunk));
            }
        }
        let code = exit_rx.recv_timeout(Duration::from_secs(5)).ok();
        (output, code)
    }

    #[test]
    fn runs_a_command_and_reports_exit_code() {
        let (output, code) = run("echo bashter-$((20+22))\nexit 3\n", "bashter-42");
        assert!(output.contains("bashter-42"), "output was: {output:?}");
        assert_eq!(code, Some(3));
    }

    #[test]
    fn terminal_environment_is_set() {
        let (output, _) = run("echo $TERM/$COLORTERM/$TERM_PROGRAM\nexit\n", "xterm-256color/truecolor/BashTer");
        assert!(output.contains("xterm-256color/truecolor/BashTer"), "output was: {output:?}");
    }

    #[test]
    fn resize_updates_the_pty_size() {
        let (data_tx, data_rx) = mpsc::channel::<Vec<u8>>();
        let opts = SpawnOptions { cols: 80, rows: 24, cwd: None, shell: Some("/bin/sh".into()) };
        let session = PtySession::spawn(&opts, move |b| { let _ = data_tx.send(b.to_vec()); }, |_| {}).unwrap();
        session.resize(100, 30).unwrap();
        session.write(b"stty size\nexit\n").unwrap();
        let mut output = String::new();
        let deadline = std::time::Instant::now() + Duration::from_secs(10);
        while std::time::Instant::now() < deadline && !output.contains("30 100") {
            if let Ok(chunk) = data_rx.recv_timeout(Duration::from_millis(100)) {
                output.push_str(&String::from_utf8_lossy(&chunk));
            }
        }
        assert!(output.contains("30 100"), "output was: {output:?}");
    }

    #[test]
    fn kill_ends_the_session() {
        let (exit_tx, exit_rx) = mpsc::channel::<i32>();
        let opts = SpawnOptions { cols: 80, rows: 24, cwd: None, shell: Some("/bin/sh".into()) };
        let session = PtySession::spawn(&opts, |_| {}, move |c| { let _ = exit_tx.send(c); }).unwrap();
        session.kill();
        assert!(exit_rx.recv_timeout(Duration::from_secs(5)).is_ok());
    }

    #[test]
    fn oversized_writes_are_rejected() {
        let opts = SpawnOptions { cols: 80, rows: 24, cwd: None, shell: Some("/bin/sh".into()) };
        let session = PtySession::spawn(&opts, |_| {}, |_| {}).unwrap();
        let too_big = vec![b'a'; MAX_WRITE_BYTES + 1];
        assert!(matches!(session.write(&too_big), Err(AppError::InvalidArgument(_))));
        session.kill();
    }

    #[test]
    fn manager_reports_unknown_sessions() {
        let manager = PtyManager::default();
        assert!(matches!(manager.get(99), Err(AppError::SessionNotFound(99))));
        manager.remove(99); // must not panic
    }

    #[test]
    fn appdir_entries_are_stripped() {
        let cleaned = strip_appdir("/tmp/.mount_x/usr/lib:/usr/lib:/tmp/.mount_x/lib:/lib", "/tmp/.mount_x");
        assert_eq!(cleaned, "/usr/lib:/lib");
    }

    #[test]
    fn shell_resolution_prefers_a_valid_choice_and_skips_bad_ones() {
        assert_eq!(resolve_shell(Some("/bin/sh")).unwrap(), "/bin/sh");
        assert!(resolve_shell(Some("/does/not/exist")).is_ok()); // falls back
    }
}
