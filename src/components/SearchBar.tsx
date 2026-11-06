import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { getTerminal } from "../lib/registry";
import { getTheme } from "../lib/themes";
import { useSettings } from "../stores/settings";

interface Props {
  tabId: string;
  onClose: () => void;
}

export function SearchBar({ tabId, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const themeId = useSettings((s) => s.config.theme);

  useEffect(() => inputRef.current?.focus(), []);

  const decorations = () => {
    const t = getTheme(themeId).chrome;
    return {
      matchOverviewRuler: t.accent,
      activeMatchColorOverviewRuler: t.accent,
      matchBackground: "#7a5c1a",
      activeMatchBackground: t.accent,
    };
  };

  const run = (direction: "next" | "prev", incremental = false) => {
    const search = getTerminal(tabId)?.search;
    if (!search || !query) return;
    const opts = { caseSensitive, incremental, decorations: decorations() };
    if (direction === "next") search.findNext(query, opts);
    else search.findPrevious(query, opts);
  };

  const close = () => {
    getTerminal(tabId)?.search.clearDecorations();
    onClose();
    getTerminal(tabId)?.focus();
  };

  return (
    <div className="absolute right-4 top-3 z-10 flex items-center gap-1 rounded-xl border border-border bg-surface px-2 py-1.5 shadow-lg">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          const search = getTerminal(tabId)?.search;
          if (e.target.value) {
            search?.findNext(e.target.value, { caseSensitive, incremental: true, decorations: decorations() });
          } else {
            search?.clearDecorations();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") run(e.shiftKey ? "prev" : "next");
          if (e.key === "Escape") close();
        }}
        placeholder="Search scrollback"
        aria-label="Search scrollback"
        className="w-52 bg-transparent px-2 text-[13px] text-fg outline-none placeholder:text-muted"
      />
      <button
        type="button"
        aria-pressed={caseSensitive}
        title="Match case"
        onClick={() => setCaseSensitive((v) => !v)}
        className={["rounded px-1.5 text-[12px] font-semibold", caseSensitive ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"].join(" ")}
      >
        Aa
      </button>
      <button type="button" aria-label="Previous match" onClick={() => run("prev")} className="rounded p-1 text-muted hover:text-fg">
        <ChevronUp size={15} />
      </button>
      <button type="button" aria-label="Next match" onClick={() => run("next")} className="rounded p-1 text-muted hover:text-fg">
        <ChevronDown size={15} />
      </button>
      <button type="button" aria-label="Close search" onClick={close} className="rounded p-1 text-muted hover:text-fg">
        <X size={15} />
      </button>
    </div>
  );
}
