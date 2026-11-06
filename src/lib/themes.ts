import type { ITheme } from "@xterm/xterm";

/** UI chrome colours. Applied as CSS variables so custom themes (Phase 2) need no CSS. */
export interface ChromeColors {
  chrome: string;
  surface: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
}

export interface BashterTheme {
  id: string;
  name: string;
  mode: "dark" | "light";
  chrome: ChromeColors;
  terminal: ITheme;
}

const nightshift: BashterTheme = {
  id: "nightshift",
  name: "Nightshift",
  mode: "dark",
  chrome: {
    chrome: "#0a0b18",
    surface: "#191b38",
    border: "#2a2d55",
    fg: "#e4e6f7",
    muted: "#8386b0",
    accent: "#ffc857",
    accentFg: "#1a1405",
  },
  terminal: {
    background: "#0f1022",
    foreground: "#e4e6f7",
    cursor: "#ffc857",
    cursorAccent: "#0f1022",
    selectionBackground: "rgba(255, 200, 87, 0.25)",
    black: "#1b1d3a",
    red: "#ff6b81",
    green: "#7bd88f",
    yellow: "#ffc857",
    blue: "#7aa2ff",
    magenta: "#c792ea",
    cyan: "#5ce1e6",
    white: "#c9cceb",
    brightBlack: "#4a4e85",
    brightRed: "#ff8fa0",
    brightGreen: "#9bf0ac",
    brightYellow: "#ffd97d",
    brightBlue: "#9dbbff",
    brightMagenta: "#ddb0ff",
    brightCyan: "#8df0f4",
    brightWhite: "#f4f5ff",
  },
};

const daybreak: BashterTheme = {
  id: "daybreak",
  name: "Daybreak",
  mode: "light",
  chrome: {
    chrome: "#e6e9f3",
    surface: "#f4f6fb",
    border: "#cfd4e6",
    fg: "#23253f",
    muted: "#6a6e94",
    accent: "#b45309",
    accentFg: "#fff7ed",
  },
  terminal: {
    background: "#f6f7fb",
    foreground: "#23253f",
    cursor: "#b45309",
    cursorAccent: "#f6f7fb",
    selectionBackground: "rgba(180, 83, 9, 0.2)",
    black: "#23253f",
    red: "#c7254e",
    green: "#1e7f4f",
    yellow: "#9a6700",
    blue: "#2f5bd8",
    magenta: "#8a3fc4",
    cyan: "#0f7c86",
    white: "#8e92b5",
    brightBlack: "#5b5f86",
    brightRed: "#e0436a",
    brightGreen: "#2a9d63",
    brightYellow: "#b8860b",
    brightBlue: "#4b76f0",
    brightMagenta: "#a45ce0",
    brightCyan: "#1798a3",
    brightWhite: "#b9bdd8",
  },
};

export const THEMES: Record<string, BashterTheme> = {
  [nightshift.id]: nightshift,
  [daybreak.id]: daybreak,
};

export const DEFAULT_THEME_ID = nightshift.id;

export function getTheme(id: string): BashterTheme {
  return THEMES[id] ?? nightshift;
}

/** Writes the chrome colours onto :root; Tailwind tokens read these variables. */
export function applyChrome(theme: BashterTheme): void {
  const root = document.documentElement;
  const c = theme.chrome;
  root.style.setProperty("--bt-chrome", c.chrome);
  root.style.setProperty("--bt-surface", c.surface);
  root.style.setProperty("--bt-term", theme.terminal.background ?? c.surface);
  root.style.setProperty("--bt-border", c.border);
  root.style.setProperty("--bt-fg", c.fg);
  root.style.setProperty("--bt-muted", c.muted);
  root.style.setProperty("--bt-accent", c.accent);
  root.style.setProperty("--bt-accent-fg", c.accentFg);
  root.style.colorScheme = theme.mode;
}
