import { Plus, X } from "lucide-react";
import { useTabs } from "../stores/tabs";

export function Tabs() {
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const { setActive, closeTab, addTab } = useTabs.getState();

  return (
    <div role="tablist" aria-label="Terminal tabs" className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={selected}
            tabIndex={-1}
            title={tab.title}
            onClick={() => setActive(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) closeTab(tab.id);
            }}
            className={[
              "group flex h-9 min-w-[7rem] max-w-[14rem] shrink-0 cursor-default select-none items-center gap-2 rounded-t-xl px-3 text-[13px]",
              selected ? "bg-term text-fg" : "text-muted hover:bg-surface hover:text-fg",
            ].join(" ")}
          >
            {/* The tab icon is a cursor block: filled when this tab is the active one. */}
            <span
              aria-hidden
              className={["h-3.5 w-2 shrink-0 rounded-[2px]", selected ? "bg-accent" : "border border-muted"].join(" ")}
            />
            <span className="min-w-0 flex-1 truncate">{tab.title}</span>
            <button
              type="button"
              aria-label={`Close ${tab.title}`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="rounded p-0.5 opacity-0 hover:bg-border focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        aria-label="New tab"
        title="New tab (Ctrl+Shift+T)"
        onClick={() => addTab()}
        className="mb-1 ml-1 shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface hover:text-fg"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
