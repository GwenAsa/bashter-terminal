import { useEffect } from "react";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { getTerminal } from "../lib/registry";
import { useSettings } from "../stores/settings";
import { useTabs } from "../stores/tabs";

interface Options {
  toggleSearch: () => void;
}

const MIN_FONT = 8;
const MAX_FONT = 40;

/**
 * App-level shortcuts, handled in the capture phase so xterm never sees them.
 *
 * Deliberate choices:
 *  - Tab and clipboard shortcuts use Ctrl+Shift, because plain Ctrl+T / Ctrl+W / Ctrl+V
 *    are real shell and editor keys (transpose, delete-word, literal-next / vim block mode).
 *  - Ctrl+C copies only while text is selected; otherwise it stays SIGINT.
 */
export function useShortcuts({ toggleSearch }: Options) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tabs = useTabs.getState();
      const handle = getTerminal(tabs.activeId);
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey && !e.altKey && !e.metaKey;

      const consume = (action: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        action();
      };

      // Alt+1..9 jumps to a tab.
      if (e.altKey && !e.ctrlKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        return consume(() => tabs.activateIndex(Number(e.key) - 1));
      }

      // Shift+Insert pastes.
      if (e.shiftKey && !e.ctrlKey && !e.altKey && e.key === "Insert") {
        return consume(() => void paste());
      }

      if (!ctrl) return;

      if (e.key === "Tab") return consume(() => tabs.cycle(e.shiftKey ? -1 : 1));
      if (e.key === "PageDown" && !e.shiftKey) return consume(() => tabs.cycle(1));
      if (e.key === "PageUp" && !e.shiftKey) return consume(() => tabs.cycle(-1));

      // Ctrl+C with a selection copies; without one it must reach the shell.
      if (key === "c" && !e.shiftKey && handle?.term.hasSelection()) {
        return consume(() => void copy());
      }

      if (!e.shiftKey) return;

      switch (key) {
        case "t":
          return consume(() => tabs.addTab());
        case "w":
          return consume(() => tabs.closeTab(tabs.activeId));
        case "c":
          return consume(() => void copy());
        case "v":
          return consume(() => void paste());
        case "f":
          return consume(toggleSearch);
        case "+":
        case "=":
          return consume(() => zoom(1));
        case "_":
        case "-":
          return consume(() => zoom(-1));
        case ")":
        case "0":
          return consume(() => useSettings.getState().update({ fontSize: 14 }));
      }
    };

    const copy = async () => {
      const handle = getTerminal(useTabs.getState().activeId);
      const text = handle?.term.getSelection();
      if (!text) return;
      try {
        await writeText(text);
      } catch (err) {
        console.error("clipboard write failed:", err);
      }
    };

    const paste = async () => {
      const handle = getTerminal(useTabs.getState().activeId);
      if (!handle) return;
      try {
        const text = await readText();
        // term.paste() applies bracketed-paste mode when the app has enabled it.
        if (text) handle.term.paste(text);
      } catch (err) {
        console.error("clipboard read failed:", err);
      }
    };

    const zoom = (delta: number) => {
      const { config, update } = useSettings.getState();
      update({ fontSize: Math.min(MAX_FONT, Math.max(MIN_FONT, config.fontSize + delta)) });
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [toggleSearch]);
}
