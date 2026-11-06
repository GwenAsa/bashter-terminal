# BashTer architecture

## Shape

    React + xterm.js (WebKitGTK webview)  <--IPC-->  Rust (Tauri v2)
      tabs, themes, search, shortcuts                 portable-pty sessions, config

- Keystrokes: `term.onData` -> `invoke("pty_write")` -> PTY master.
- Output: PTY reader thread -> Tauri `Channel` as **raw bytes** (no JSON) -> `term.write(Uint8Array)`.
  xterm handles UTF-8 sequences split across chunks, so the backend never decodes output.
- Resize: ResizeObserver -> FitAddon -> `term.onResize` -> `pty_resize`.
- Exit: the reader hits EOF, waits for the child, fires the exit channel once.
- `src-tauri/src/pty.rs` and `config.rs` contain no Tauri types, so they are unit-tested directly.

## Why Tauri v2

Small binary and low idle memory, Rust for PTY and keyring work, strict capability and CSP model.
The terminal grid is rendered by xterm.js, so the webview only paints text.

## Known risks (and the plan for each)

| Risk | Detail | Plan |
|---|---|---|
| glibc baseline | Tauri v2 needs `webkit2gtk-4.1`, available from Ubuntu 22.04 / Debian 12 / Fedora 36+. The requested glibc 2.28 baseline is not reachable with Tauri v2 (WebKitGTK 4.1 does not exist on those distros). | Build the AppImage on Ubuntu 22.04 (glibc 2.35). Document the real minimum. |
| Ligatures | `@xterm/addon-ligatures` needs font-file access that WebKitGTK does not provide. | Phase 2 spike: DOM renderer + `font-variant-ligatures`; otherwise ship without. |
| WebGL renderer | Driver-dependent in WebKitGTK; can render blank on some NVIDIA/Wayland setups. | Off by default (`gpuRendering`), opt-in with automatic fallback. |
| Blur / acrylic | Window transparency works, but blur is done by the compositor, not by Tauri. | Phase 2: transparent window + CSS opacity; blur only where the compositor offers it. |
| Command blocks | Needs prompt boundaries. | Phase 4: inject OSC 133 markers via a shell rcfile for bash and zsh. |
| Ghost text | The shell owns the input line. | Phase 3: track typed input via `onData` and OSC 133; render with xterm decorations. |
| Sudo manager | Prompt detection by scanning output can be spoofed by a malicious program printing a fake prompt. | Phase 4: only answer prompts when the foreground process is `sudo`; password only in the keyring, off by default. |
| AppImage env leakage | AppImage sets `LD_LIBRARY_PATH` and `PATH` entries that would break the user's shell and its programs. | Already handled: `pty.rs` strips AppDir entries (unit-tested). |

If WebKitGTK problems prove unfixable on target distros, the fallback is Electron + node-pty. The IPC surface
(`ipc.ts`) is the only frontend file that touches Tauri, which keeps that switch contained.

## Decisions

- xterm.js 6 (`@xterm/*` packages; the `xterm-addon-*` names are deprecated).
- Tailwind v4 with CSS-variable tokens, so themes are plain data (`lib/themes.ts`).
- Ctrl+Shift for app shortcuts. Plain Ctrl+T/W/V are real readline and vim keys. Ctrl+C copies only with a selection.
- Links open only on Ctrl+click and only for http(s).
- Native window decorations in Phase 1 (custom titlebars are fragile on Wayland).
