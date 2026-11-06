import { create } from "zustand";

export interface Tab {
  id: string;
  title: string;
}

interface TabsState {
  tabs: Tab[];
  activeId: string;
  /** Set when the last tab closes; App reacts by closing the window. */
  empty: boolean;
  addTab: () => string;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  setTitle: (id: string, title: string) => void;
  cycle: (direction: 1 | -1) => void;
  activateIndex: (index: number) => void;
}

const newTab = (): Tab => ({ id: crypto.randomUUID(), title: "shell" });

const first = newTab();

export const useTabs = create<TabsState>((set, get) => ({
  tabs: [first],
  activeId: first.id,
  empty: false,

  addTab() {
    const tab = newTab();
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }));
    return tab.id;
  },

  closeTab(id) {
    const { tabs, activeId } = get();
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      set({ tabs: [], activeId: "", empty: true });
      return;
    }
    // Closing the active tab focuses its left neighbour (or the new first tab).
    const nextActive =
      id === activeId ? remaining[Math.max(0, index - 1)].id : activeId;
    set({ tabs: remaining, activeId: nextActive });
  },

  setActive(id) {
    if (get().tabs.some((t) => t.id === id)) set({ activeId: id });
  },

  setTitle(id, title) {
    const clean = title.trim().slice(0, 120);
    if (!clean) return;
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, title: clean } : t)) }));
  },

  cycle(direction) {
    const { tabs, activeId } = get();
    if (tabs.length < 2) return;
    const i = tabs.findIndex((t) => t.id === activeId);
    set({ activeId: tabs[(i + direction + tabs.length) % tabs.length].id });
  },

  activateIndex(index) {
    const tab = get().tabs[index];
    if (tab) set({ activeId: tab.id });
  },
}));
