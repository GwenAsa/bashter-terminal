import { create } from "zustand";
import { configGet, configSet, type AppConfig } from "../lib/ipc";
import { DEFAULT_THEME_ID } from "../lib/themes";

export const FALLBACK_CONFIG: AppConfig = {
  theme: DEFAULT_THEME_ID,
  fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", "Fira Code", monospace',
  fontSize: 14,
  lineHeight: 1.25,
  scrollback: 10000,
  cursorStyle: "block",
  cursorBlink: true,
  gpuRendering: false,
  shell: null,
};

interface SettingsState {
  config: AppConfig;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppConfig>) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useSettings = create<SettingsState>((set, get) => ({
  config: FALLBACK_CONFIG,
  loaded: false,

  async load() {
    try {
      set({ config: await configGet(), loaded: true });
    } catch (err) {
      // A broken config must never stop the terminal from opening.
      console.error("config_get failed, using defaults:", err);
      set({ config: FALLBACK_CONFIG, loaded: true });
    }
  },

  update(patch) {
    set({ config: { ...get().config, ...patch } });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      configSet(get().config)
        .then((saved) => set({ config: saved }))
        .catch((err) => console.error("config_set failed:", err));
    }, 300);
  },
}));
