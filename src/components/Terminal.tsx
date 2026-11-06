import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { openUrl } from "@tauri-apps/plugin-opener";
import "@xterm/xterm/css/xterm.css";

import { ptyKill, ptyResize, ptySpawn, ptyWrite, ptyWriteBinary } from "../lib/ipc";
import { registerTerminal, unregisterTerminal } from "../lib/registry";
import { getTheme } from "../lib/themes";
import { useSettings } from "../stores/settings";
import { useTabs, type Tab } from "../stores/tabs";

interface Props {
  tab: Tab;
  active: boolean;
}

/** Only web links are ever handed to the OS; anything else is ignored. */
const isSafeUrl = (uri: string) => /^https?:\/\//i.test(uri);

export function TerminalView({ tab, active }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  // One terminal + one PTY per tab, for the lifetime of the tab.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let ptyId: number | null = null;
    let exited = false;
    const cleanups: Array<() => void> = [];

    const { config } = useSettings.getState();
    const theme = getTheme(config.theme);

    const term = new Terminal({
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      lineHeight: config.lineHeight,
      scrollback: config.scrollback,
      cursorStyle: config.cursorStyle,
      cursorBlink: config.cursorBlink,
      theme: theme.terminal,
      allowProposedApi: true, // required by the unicode11 addon
      allowTransparency: false,
    });
    const fit = new FitAddon();
    const search = new SearchAddon();
    term.loadAddon(fit);
    term.loadAddon(search);
    term.loadAddon(new Unicode11Addon());
    term.unicode.activeVersion = "11";
    term.loadAddon(
      new WebLinksAddon((event, uri) => {
        // Require Ctrl+click so a stray click never launches a browser.
        if (!(event.ctrlKey || event.metaKey) || !isSafeUrl(uri)) return;
        openUrl(uri).catch((err) => console.error("openUrl failed:", err));
      }),
    );
    termRef.current = term;
    fitRef.current = fit;

    const refit = () => {
      if (disposed || host.offsetParent === null) return; // hidden tab: no size to fit
      try {
        fit.fit();
      } catch {
        /* container momentarily has no size */
      }
    };
    registerTerminal(tab.id, { term, search, focus: () => term.focus(), refit });

    const start = async () => {
      // Cell metrics are measured on open, so the web font must be ready first.
      try {
        await document.fonts.load(`${config.fontSize}px "JetBrains Mono Variable"`);
      } catch {
        /* fall back to whatever monospace font is available */
      }
      if (disposed) return;

      term.open(host);

      if (config.gpuRendering) {
        try {
          const { WebglAddon } = await import("@xterm/addon-webgl");
          const gl = new WebglAddon();
          gl.onContextLoss(() => gl.dispose());
          term.loadAddon(gl);
        } catch (err) {
          console.warn("WebGL renderer unavailable, using DOM renderer:", err);
        }
      }
      refit();

      let id: number;
      try {
        id = await ptySpawn(term.cols, term.rows, {
          onData: (bytes) => term.write(bytes),
          onExit: (code) => {
            exited = true;
            if (code === 0) {
              useTabs.getState().closeTab(tab.id);
            } else {
              term.write(`\r\n\x1b[2m[process exited with code ${code} - press Enter to close]\x1b[0m`);
            }
          },
        });
      } catch (err) {
        term.write(`\x1b[31mFailed to start shell: ${String(err)}\x1b[0m\r\n`);
        return;
      }
      if (disposed) {
        void ptyKill(id).catch(() => undefined);
        return;
      }
      ptyId = id;

      const d1 = term.onData((data) => {
        if (exited) {
          if (data === "\r") useTabs.getState().closeTab(tab.id);
          return;
        }
        ptyWrite(id, data).catch((err) => console.error("pty_write failed:", err));
      });
      const d2 = term.onBinary((data) => {
        if (!exited) ptyWriteBinary(id, data).catch(() => undefined);
      });
      const d3 = term.onResize(({ cols, rows }) => {
        ptyResize(id, cols, rows).catch(() => undefined);
      });
      const d4 = term.onTitleChange((title) => useTabs.getState().setTitle(tab.id, title));
      cleanups.push(() => d1.dispose(), () => d2.dispose(), () => d3.dispose(), () => d4.dispose());

      // Sync size once more now that the PTY exists, then take focus if visible.
      ptyResize(id, term.cols, term.rows).catch(() => undefined);
      if (activeRef.current) term.focus();
    };
    void start();

    // Re-fit whenever the container changes size (window resize, sidebar, splits).
    let raf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(refit);
    });
    observer.observe(host);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      cleanups.forEach((fn) => fn());
      unregisterTerminal(tab.id);
      if (ptyId !== null) void ptyKill(ptyId).catch(() => undefined);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // The terminal is created once per tab; live settings are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  // Apply setting changes to the already-running terminal.
  const config = useSettings((s) => s.config);
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.theme = getTheme(config.theme).terminal;
    term.options.fontSize = config.fontSize;
    term.options.fontFamily = config.fontFamily;
    term.options.lineHeight = config.lineHeight;
    term.options.scrollback = config.scrollback;
    term.options.cursorStyle = config.cursorStyle;
    term.options.cursorBlink = config.cursorBlink;
    requestAnimationFrame(() => fitRef.current?.fit());
  }, [config]);

  // A tab that just became visible needs a fresh fit and keyboard focus.
  useEffect(() => {
    if (!active) return;
    const raf = requestAnimationFrame(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* not measurable yet */
      }
      termRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 px-3 pt-2 pb-1"
      style={{ visibility: active ? "visible" : "hidden" }}
      aria-hidden={!active}
    />
  );
}
