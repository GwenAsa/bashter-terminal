// Lets app-level code (shortcuts, search bar) reach the live terminal behind a tab
// without pushing xterm instances through React state.
import type { Terminal } from "@xterm/xterm";
import type { SearchAddon } from "@xterm/addon-search";

export interface TerminalHandle {
  term: Terminal;
  search: SearchAddon;
  focus: () => void;
  refit: () => void;
}

const handles = new Map<string, TerminalHandle>();

export const registerTerminal = (tabId: string, handle: TerminalHandle) => {
  handles.set(tabId, handle);
};
export const unregisterTerminal = (tabId: string) => {
  handles.delete(tabId);
};
export const getTerminal = (tabId: string) => handles.get(tabId);
export const allTerminals = () => handles.values();
