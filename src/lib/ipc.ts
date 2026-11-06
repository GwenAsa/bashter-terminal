// Typed wrappers around the Tauri commands exposed by the Rust backend.
// Every backend error arrives as a plain string (see src-tauri/src/error.rs).
import { Channel, invoke } from "@tauri-apps/api/core";

export interface AppConfig {
  theme: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  scrollback: number;
  cursorStyle: "block" | "underline" | "bar";
  cursorBlink: boolean;
  gpuRendering: boolean;
  shell: string | null;
}

export interface SpawnHandlers {
  /** Raw PTY bytes. Passed straight to xterm, which copes with split UTF-8. */
  onData: (bytes: Uint8Array) => void;
  /** Called once when the child process ends. */
  onExit: (code: number) => void;
}

export async function ptySpawn(
  cols: number,
  rows: number,
  handlers: SpawnHandlers,
  cwd?: string,
): Promise<number> {
  const onData = new Channel<ArrayBuffer>();
  onData.onmessage = (buf) => handlers.onData(new Uint8Array(buf));
  const onExit = new Channel<number>();
  onExit.onmessage = (code) => handlers.onExit(code);
  return invoke<number>("pty_spawn", { cols, rows, cwd: cwd ?? null, onData, onExit });
}

export const ptyWrite = (id: number, data: string) => invoke<void>("pty_write", { id, data });

/** xterm's onBinary delivers latin1 "binary strings" (legacy mouse reports). */
export const ptyWriteBinary = (id: number, data: string) =>
  invoke<void>("pty_write_binary", {
    id,
    data: Array.from(data, (c) => c.charCodeAt(0) & 0xff),
  });

export const ptyResize = (id: number, cols: number, rows: number) =>
  invoke<void>("pty_resize", { id, cols, rows });

export const ptyKill = (id: number) => invoke<void>("pty_kill", { id });

export const configGet = () => invoke<AppConfig>("config_get");
export const configSet = (config: AppConfig) => invoke<AppConfig>("config_set", { config });
