import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Moon, Search, Sun } from "lucide-react";

import { SearchBar } from "./components/SearchBar";
import { Tabs } from "./components/Tabs";
import { TerminalView } from "./components/Terminal";
import { useShortcuts } from "./hooks/useShortcuts";
import { applyChrome, getTheme } from "./lib/themes";
import { useSettings } from "./stores/settings";
import { useTabs } from "./stores/tabs";

export default function App() {
  const loaded = useSettings((s) => s.loaded);
  const themeId = useSettings((s) => s.config.theme);
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const empty = useTabs((s) => s.empty);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleSearch = useCallback(() => setSearchOpen((v) => !v), []);
  useShortcuts({ toggleSearch });

  useEffect(() => {
    void useSettings.getState().load();
  }, []);

  useEffect(() => {
    applyChrome(getTheme(themeId));
  }, [themeId]);

  // Closing the last tab closes the window, like every other terminal.
  useEffect(() => {
    if (empty) void getCurrentWindow().close();
  }, [empty]);

  // Mirror the active tab's title in the window title bar.
  const activeTitle = tabs.find((t) => t.id === activeId)?.title;
  useEffect(() => {
    void getCurrentWindow().setTitle(activeTitle ? `${activeTitle} - BashTer` : "BashTer");
  }, [activeTitle]);

  // Do not spawn shells before the config (font, scrollback, shell) is known.
  if (!loaded) return null;

  const isDark = getTheme(themeId).mode === "dark";

  return (
    <div className="flex h-full flex-col bg-chrome text-fg">
      <header className="flex items-end gap-2 px-2 pt-2">
        <Tabs />
        <div className="mb-1 flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Search scrollback"
            title="Search (Ctrl+Shift+F)"
            onClick={toggleSearch}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => useSettings.getState().update({ theme: isDark ? "daybreak" : "nightshift" })}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 bg-term">
        {tabs.map((tab) => (
          <TerminalView key={tab.id} tab={tab} active={tab.id === activeId} />
        ))}
        {searchOpen && activeId && <SearchBar key={activeId} tabId={activeId} onClose={() => setSearchOpen(false)} />}
      </main>
    </div>
  );
}
