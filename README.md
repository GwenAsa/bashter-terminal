<div align="center">

<img src="docs/assets/banner.svg" alt="BashTer" width="100%"/>

<br/>

**A modern Linux terminal that is small, fast and genuinely nice to live in.**

<br/>

![Status](https://img.shields.io/badge/status-alpha%20(phase%201)-ffc857?style=for-the-badge&labelColor=0f1022)
![Tauri](https://img.shields.io/badge/Tauri-v2-24c8db?style=for-the-badge&logo=tauri&logoColor=white&labelColor=0f1022)
![Rust](https://img.shields.io/badge/Rust-backend-dea584?style=for-the-badge&logo=rust&logoColor=white&labelColor=0f1022)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white&labelColor=0f1022)
![Platform](https://img.shields.io/badge/Linux-X11%20%7C%20Wayland-7aa2ff?style=for-the-badge&logo=linux&logoColor=white&labelColor=0f1022)

[Quick start](#-quick-start) ·
[Features](#-features) ·
[Shortcuts](#-shortcuts) ·
[Configuration](#-configuration) ·
[Roadmap](#-roadmap) ·
[Contributing](#-contributing)

</div>

---

## 🚀 Quick Start

> **TL;DR** — Download the `.deb`, install it, open it. You don't need to compile anything.

### 📦 1. Download

Grab the latest package from **[Releases](https://github.com/GwenAsa/bashter-terminal/releases/latest)** — `BashTer_0.1.0_amd64.deb` — or pull it straight from the repo:

```bash
wget https://github.com/GwenAsa/bashter-terminal/raw/main/releases/BashTer_0.1.0_amd64.deb
```

### ⚙️ 2. Install

```bash
sudo dpkg -i BashTer_0.1.0_amd64.deb
sudo apt install -f    # only if dpkg reports missing dependencies
```

That's it. `bashter` is now available at `/usr/bin/bashter`, and an entry appears in your applications menu.

### 🧪 3. Run

```bash
bashter
```

Or search **"BashTer"** in your desktop's app launcher.

### 🎯 Optional — Make it your default terminal

```bash
# Register BashTer as a terminal option
sudo update-alternatives --install /usr/bin/x-terminal-emulator x-terminal-emulator /usr/bin/bashter 50

# Choose it interactively
sudo update-alternatives --config x-terminal-emulator
```

> **XFCE users:** `Ctrl+Alt+T` is bound directly to `xfce4-terminal` and ignores `update-alternatives`. 
> Open **Settings → Keyboard → Application Shortcuts**, double-click the `Ctrl+Alt+T` row, 
> and change the command to `x-terminal-emulator`.

### 🗑 Uninstall (if you ever want to)

```bash
sudo apt remove bash-ter
# and, if you registered it as a terminal alternative:
sudo update-alternatives --remove x-terminal-emulator /usr/bin/bashter
```

<details>
<summary><b>🔨 Build from source (for developers)</b></summary>

<br/>

**Prerequisites:** Node.js 20+, Rust 1.77+ ([rustup](https://rustup.rs)), and the Tauri system libraries.

```bash
# Debian / Ubuntu 22.04+
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel openssl-devel librsvg2-devel libxdo-devel
```

```bash
git clone https://github.com/GwenAsa/bashter-terminal.git
cd bashter-terminal
npm install
npm run tauri dev
```

Build a distributable bundle:

```bash
npm run tauri build -- --bundles deb     # or: appimage, rpm
```

> **Minimum system:** Tauri v2 requires `webkit2gtk-4.1`, so the realistic baseline is **Ubuntu 22.04, Debian 12, or Fedora 36+**.

</details>

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🖥 A real terminal
A true PTY and a full xterm engine. `vim`, `htop`, `tmux`, `ssh`, and friends work without surprises.

### ⚡ Small & quick
Rust and Tauri — not a bundled browser. The grid is drawn by xterm.js; the webview only paints text.

### 🎨 Designed, not defaulted
Deep-indigo *Nightshift* theme with a saffron accent, plus a light *Daybreak* theme. Both ship a full 16-color ANSI palette.

</td>
<td width="50%" valign="top">

### 🗂 Tabs that behave
Open, close, cycle, and jump to tab 1–9 from the keyboard. Middle-click closes. Titles follow your shell.

### 🔎 Scrollback search
Incremental search with match-case, next, and previous — no context switches.

### 🔤 Bundled font
JetBrains Mono ships inside the app. Nothing to install on your system.

</td>
</tr>
</table>

**Available today (Phase 1)**

| | | |
|:---:|:---|:---|
| ⚡ | **Real shell sessions** | Every tab runs your shell on its own PTY (`$SHELL` → bash → sh). |
| 🎨 | **Full rendering** | xterm-256color, truecolor, Unicode 11, emoji, mouse support. |
| 🗂 | **Tabs** | Open, close, cycle, jump — keyboard-first. |
| 🔎 | **Search** | Incremental scrollback search with match-case. |
| 🔗 | **Clickable links** | Ctrl+click opens `http(s)` only. |
| 📋 | **Clipboard** | `Ctrl+Shift+C/V`, `Shift+Insert`, `Ctrl+C` copies only when text is selected. |
| 🌗 | **Two themes** | *Nightshift* (dark) and *Daybreak* (light), each with a full ANSI palette. |
| 💾 | **Safe config** | JSON with validation. A broken file is set aside, never fatal. |
| 📦 | **AppImage-aware** | Strips AppImage library paths so child shells keep working. |

**Coming next**

- [ ] Sidebar of one-click commands, fully customisable (`actions.json`)
- [ ] Split panes, settings screen, custom themes, window transparency
- [ ] Ghost-text autosuggestions from your history (accept with <kbd>Tab</kbd> / <kbd>→</kbd>)
- [ ] Command blocks: each command and its output as a copyable unit
- [ ] Optional sudo helper — keyring-only, off by default
- [ ] AppImage, `.rpm`, Snap, Flatpak, one-line installer

---

## ⌨️ Shortcuts

| Action | Keys |
|---|---|
| New tab / close tab | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>W</kbd> |
| Next / previous tab | <kbd>Ctrl</kbd>+<kbd>Tab</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Tab</kbd> |
| Jump to tab 1–9 | <kbd>Alt</kbd>+<kbd>1</kbd> … <kbd>Alt</kbd>+<kbd>9</kbd> |
| Copy / paste | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> (<kbd>Shift</kbd>+<kbd>Insert</kbd> also pastes) |
| Copy selection | <kbd>Ctrl</kbd>+<kbd>C</kbd> *only while text is selected* — otherwise it stays SIGINT |
| Search scrollback | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> |
| Font size | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>+</kbd> / <kbd>−</kbd> / <kbd>0</kbd> |
| Open a link | <kbd>Ctrl</kbd>+Click |

**Why Ctrl+Shift?** Because in a shell, plain <kbd>Ctrl</kbd>+<kbd>T</kbd> transposes characters, <kbd>Ctrl</kbd>+<kbd>W</kbd> deletes a word, and in Vim <kbd>Ctrl</kbd>+<kbd>V</kbd> starts block selection. BashTer never steals keys your programs need.

---

## 🎨 Themes

<table>
<tr>
<td align="center" width="50%">

### 🌙 Nightshift

![#0f1022](https://img.shields.io/badge/%230f1022-0f1022?style=for-the-badge)
![#ffc857](https://img.shields.io/badge/%23ffc857-ffc857?style=for-the-badge)

`background #0f1022` · `accent #ffc857`

Dark · deep indigo · saffron accent

</td>
<td align="center" width="50%">

### ☀️ Daybreak

![#f6f7fb](https://img.shields.io/badge/%23f6f7fb-f6f7fb?style=for-the-badge)
![#b45309](https://img.shields.io/badge/%23b45309-b45309?style=for-the-badge)

`background #f6f7fb` · `accent #b45309`

Light · cool paper · burnt amber

</td>
</tr>
</table>

Themes are plain data in [`src/lib/themes.ts`](src/lib/themes.ts). Adding one is adding a single object.

---

## ⚙️ Configuration

Settings live in `~/.config/bashter/config.json`. Every key is optional; invalid values are clamped to a safe range instead of causing errors.

```json
{
  "theme": "nightshift",
  "fontSize": 14,
  "lineHeight": 1.25,
  "scrollback": 10000,
  "cursorStyle": "block",
  "cursorBlink": true,
  "gpuRendering": false,
  "shell": "/usr/bin/zsh"
}
```

| Key | Values | Notes |
|---|---|---|
| `theme` | `nightshift`, `daybreak` | Also switchable from the toolbar. |
| `fontSize` | `8`–`40` | |
| `lineHeight` | `1.0`–`2.5` | |
| `scrollback` | `0`–`1,000,000` | Lines kept in history. |
| `cursorStyle` | `block`, `underline`, `bar` | |
| `cursorBlink` | `true` / `false` | |
| `gpuRendering` | `true` / `false` | WebGL renderer — off by default (some GPU drivers misbehave). |
| `shell` | absolute path | Defaults to `$SHELL`. |

If a config file is ever broken, BashTer renames it to `config.json.corrupt` and starts with defaults — no crash, no data loss.

---

## 🧠 How it works

```
 React + xterm.js  (WebKitGTK webview)
 tabs · themes · search · shortcuts
            │
            │  Tauri IPC: commands + raw-byte channels
            ▼
 Rust backend
 PTY sessions (portable-pty) · config · errors
            │
            ▼
 PTY  ⇄  your shell (bash, zsh, fish, ...)
```

- **Typing:** `term.onData` → `pty_write` → shell.
- **Output:** PTY reader thread → raw bytes over a Tauri channel → `term.write()`. No JSON, no decoding in Rust; xterm handles UTF-8 sequences split across chunks.
- **Resizing:** `ResizeObserver` → fit addon → `pty_resize`.
- **Exit:** the exit code is reported exactly once; a clean exit closes the tab.

The PTY and config modules contain no Tauri types, so they are unit-tested directly against a real PTY.

<details>
<summary><b>📁 Project layout</b></summary>

<br/>

```
bashter/
├── src/                      React + TypeScript frontend
│   ├── components/           Terminal, Tabs, SearchBar
│   ├── hooks/                useShortcuts
│   ├── lib/                  ipc, themes, registry
│   └── stores/               tabs, settings (Zustand)
├── src-tauri/                Rust backend
│   └── src/                  main, pty, config, error
└── docs/                     architecture notes and assets
```

</details>

---

## 🔒 Security

- **Strict CSP** and minimal Tauri capabilities (close window, set title, open links, clipboard text).
- **Links** open only on <kbd>Ctrl</kbd>+Click and only for `http://` and `https://`.
- **Input validation** on both sides: PTY dimensions, write sizes, and every config value.
- **No panics** in normal paths — errors are reported as readable messages.
- **Planned sudo helper** — password only in the system keyring, disabled by default, never logged.

---

## 🛠 Development

```bash
npm run tauri dev           # app with hot reload
npm test                    # frontend tests (Vitest)
cd src-tauri && cargo test  # PTY, config, error handling
npm run typecheck           # TypeScript
```

### 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| Blank window on Wayland with an NVIDIA GPU | `WEBKIT_DISABLE_DMABUF_RENDERER=1 bashter` |
| Build fails on `webkit2gtk-4.1` | Install the packages from [Build from source](#); older than Ubuntu 22.04 is unsupported |
| Shell doesn't start | Check `shell` in the config; falls back to `$SHELL` → `/bin/bash` |
| Settings were reset | A broken file was moved to `config.json.corrupt` for inspection |

---

## 🗺 Roadmap

| Phase | Focus | Progress |
|---|---|---|
| **1. Foundation** | PTY · rendering · tabs · search · themes · config | ![100%](https://img.shields.io/badge/-100%25-22c55e?style=flat-square) ✅ |
| **2. Interface** | Sidebar · settings · custom themes · split panes · transparency | ![0%](https://img.shields.io/badge/-next-ffc857?style=flat-square) |
| **3. Smart** | Ghost-text autosuggestions | ![0%](https://img.shields.io/badge/-planned-6b7280?style=flat-square) |
| **4. Advanced** | Command blocks · optional sudo helper | ![0%](https://img.shields.io/badge/-planned-6b7280?style=flat-square) |
| **5. Packaging** | AppImage · rpm · Snap · Flatpak · one-line installer | ![0%](https://img.shields.io/badge/-planned-6b7280?style=flat-square) |

**Known limitations today:** no split panes yet, no font ligatures (a WebKitGTK limitation we are investigating), and no output flow control for extremely heavy streams.

---

## 🤝 Contributing

Bug reports, ideas, and pull requests are welcome. If you're fixing something, please include a test where it makes sense — `cargo test` and `npm test` should stay green. For anything larger than a small fix, open an issue first so we can agree on the approach.

---

## 🙏 Built with

<a href="https://tauri.app"><img src="https://img.shields.io/badge/Tauri-v2-24c8db?style=flat-square&logo=tauri&logoColor=white" /></a>
<a href="https://www.rust-lang.org"><img src="https://img.shields.io/badge/Rust-dea584?style=flat-square&logo=rust&logoColor=white" /></a>
<a href="https://crates.io/crates/portable-pty"><img src="https://img.shields.io/badge/portable--pty-000000?style=flat-square&logo=rust&logoColor=white" /></a>
<a href="https://xtermjs.org"><img src="https://img.shields.io/badge/xterm.js-2b2b2b?style=flat-square&logo=xterm&logoColor=white" /></a>
<a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white" /></a>
<a href="https://zustand.docs.pmnd.rs"><img src="https://img.shields.io/badge/Zustand-2b2b2b?style=flat-square&logo=react&logoColor=white" /></a>
<a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" /></a>
<a href="https://www.jetbrains.com/lp/mono/"><img src="https://img.shields.io/badge/JetBrains_Mono-000000?style=flat-square&logo=jetbrains&logoColor=white" /></a>

---

<div align="center">

**MIT licensed.** Made for people who live in the terminal.

</div>
