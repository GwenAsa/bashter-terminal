// Prevents an extra console window on Windows release builds; harmless on Linux.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod error;
mod pty;

use config::Config;
use error::{AppError, AppResult};
use pty::{PtyManager, PtySession, SpawnOptions};
use std::path::PathBuf;
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::State;

/// Starts a shell. Output is streamed as raw bytes over `on_data`; `on_exit`
/// fires once with the exit code.
#[tauri::command]
fn pty_spawn(
    manager: State<'_, PtyManager>,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
    on_data: Channel<InvokeResponseBody>,
    on_exit: Channel<i32>,
) -> AppResult<u32> {
    let opts = SpawnOptions {
        cols,
        rows,
        cwd: cwd.map(PathBuf::from),
        shell: config::load().shell,
    };
    let session = PtySession::spawn(
        &opts,
        move |bytes| {
            let _ = on_data.send(InvokeResponseBody::Raw(bytes.to_vec()));
        },
        move |code| {
            let _ = on_exit.send(code);
        },
    )?;
    manager.insert(session)
}

#[tauri::command]
fn pty_write(manager: State<'_, PtyManager>, id: u32, data: String) -> AppResult<()> {
    manager.get(id)?.write(data.as_bytes())
}

#[tauri::command]
fn pty_write_binary(manager: State<'_, PtyManager>, id: u32, data: Vec<u8>) -> AppResult<()> {
    manager.get(id)?.write(&data)
}

#[tauri::command]
fn pty_resize(manager: State<'_, PtyManager>, id: u32, cols: u16, rows: u16) -> AppResult<()> {
    manager.get(id)?.resize(cols, rows)
}

#[tauri::command]
fn pty_kill(manager: State<'_, PtyManager>, id: u32) {
    manager.remove(id);
}

#[tauri::command]
fn config_get() -> Config {
    config::load()
}

#[tauri::command]
fn config_set(config: Config) -> AppResult<Config> {
    let clean = config.sanitized();
    config::save(&clean)?;
    Ok(clean)
}

fn main() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::default())
        .invoke_handler(tauri::generate_handler![
            pty_spawn,
            pty_write,
            pty_write_binary,
            pty_resize,
            pty_kill,
            config_get,
            config_set,
        ])
        .run(tauri::generate_context!());

    if let Err(err) = result {
        // No panic: report the failure and exit with a clear status.
        eprintln!("bashter: fatal error: {}", AppError::Io(err.to_string()));
        std::process::exit(1);
    }
}
