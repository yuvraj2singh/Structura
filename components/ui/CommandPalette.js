"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Command, Search, X, Binary, Sparkles, History, Share2,
  Download, Undo2, Redo2, Trash2, Copy, ZoomIn, ZoomOut,
  Grid3X3, Sun, Moon, MousePointer2, Hand, Pen,
  Square, Circle, Type, ArrowRight, Minus, Eraser,
  MessageSquare, RotateCcw,
} from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";
import useThemeStore from "@/store/useThemeStore";
import { toast } from "@/lib/toast";
import { exportAsPNG, exportAsSVG, exportAsJSON } from "@/lib/canvas/export";

const COMMANDS = [
  // Tools
  { id: "tool-select",    group: "Tools",    label: "Select Tool",       icon: MousePointer2, shortcut: "V",       action: () => useCanvasStore.getState().setActiveTool("select") },
  { id: "tool-hand",      group: "Tools",    label: "Pan / Hand Tool",   icon: Hand,          shortcut: "H",       action: () => useCanvasStore.getState().setActiveTool("hand") },
  { id: "tool-pen",       group: "Tools",    label: "Pen / Freehand",    icon: Pen,           shortcut: "P",       action: () => useCanvasStore.getState().setActiveTool("pen") },
  { id: "tool-rect",      group: "Tools",    label: "Rectangle",         icon: Square,        shortcut: "R",       action: () => useCanvasStore.getState().setActiveTool("rectangle") },
  { id: "tool-circle",    group: "Tools",    label: "Circle",            icon: Circle,        shortcut: "C",       action: () => useCanvasStore.getState().setActiveTool("circle") },
  { id: "tool-text",      group: "Tools",    label: "Text",              icon: Type,          shortcut: "T",       action: () => useCanvasStore.getState().setActiveTool("text") },
  { id: "tool-arrow",     group: "Tools",    label: "Arrow",             icon: ArrowRight,    shortcut: "A",       action: () => useCanvasStore.getState().setActiveTool("arrow") },
  { id: "tool-line",      group: "Tools",    label: "Line",              icon: Minus,         shortcut: "L",       action: () => useCanvasStore.getState().setActiveTool("line") },
  { id: "tool-eraser",    group: "Tools",    label: "Eraser",            icon: Eraser,        shortcut: "E",       action: () => useCanvasStore.getState().setActiveTool("eraser") },

  // Canvas
  { id: "canvas-undo",    group: "Canvas",   label: "Undo",              icon: Undo2,         shortcut: "⌘Z",     action: () => useCanvasStore.getState().undo() },
  { id: "canvas-redo",    group: "Canvas",   label: "Redo",              icon: Redo2,         shortcut: "⌘⇧Z",    action: () => useCanvasStore.getState().redo() },
  { id: "canvas-dup",     group: "Canvas",   label: "Duplicate Selected",icon: Copy,          shortcut: "⌘D",     action: () => useCanvasStore.getState().duplicateSelected() },
  { id: "canvas-delete",  group: "Canvas",   label: "Delete Selected",   icon: Trash2,        shortcut: "⌫",      action: () => { const s = useCanvasStore.getState(); s.deleteElements(s.selectedIds); } },
  { id: "canvas-clear",   group: "Canvas",   label: "Clear Canvas",      icon: RotateCcw,     shortcut: "",        action: () => { if (confirm("Clear entire canvas?")) useCanvasStore.getState().clearCanvas(); } },
  { id: "zoom-in",        group: "Canvas",   label: "Zoom In",           icon: ZoomIn,        shortcut: "+",       action: () => useCanvasStore.getState().setZoom(Math.min(useCanvasStore.getState().zoom * 1.25, 5)) },
  { id: "zoom-out",       group: "Canvas",   label: "Zoom Out",          icon: ZoomOut,       shortcut: "-",       action: () => useCanvasStore.getState().setZoom(Math.max(useCanvasStore.getState().zoom * 0.8, 0.1)) },
  { id: "zoom-reset",     group: "Canvas",   label: "Reset Zoom (100%)", icon: ZoomIn,        shortcut: "0",       action: () => useCanvasStore.getState().setZoom(1) },

  // Export
  { id: "export-png",     group: "Export",   label: "Export as PNG",     icon: Download,      shortcut: "",        action: async () => { try { await exportAsPNG(); toast.success("Exported as PNG"); } catch (e) { toast.error(e.message); } } },
  { id: "export-svg",     group: "Export",   label: "Export as SVG",     icon: Download,      shortcut: "",        action: () => { try { exportAsSVG("board"); toast.success("Exported as SVG"); } catch (e) { toast.error(e.message); } } },
  { id: "export-json",    group: "Export",   label: "Export as JSON",    icon: Download,      shortcut: "",        action: () => { try { exportAsJSON("board"); toast.success("Exported as JSON"); } catch (e) { toast.error(e.message); } } },

  // Panels (dispatched as custom events so the board page can handle them)
  { id: "open-dsa",       group: "Panels",   label: "Open DSA Lab",      icon: Binary,        shortcut: "",        action: () => window.dispatchEvent(new CustomEvent("structura:toggle", { detail: "dsa" })) },
  { id: "open-ai",        group: "Panels",   label: "Open AI Generator", icon: Sparkles,      shortcut: "",        action: () => window.dispatchEvent(new CustomEvent("structura:toggle", { detail: "ai" })) },
  { id: "open-history",   group: "Panels",   label: "Open Version History",icon: History,     shortcut: "",        action: () => window.dispatchEvent(new CustomEvent("structura:toggle", { detail: "history" })) },
  { id: "open-share",     group: "Panels",   label: "Share / Export",    icon: Share2,        shortcut: "",        action: () => window.dispatchEvent(new CustomEvent("structura:toggle", { detail: "share" })) },
  { id: "open-comments",  group: "Panels",   label: "Toggle Comments",   icon: MessageSquare, shortcut: "",        action: () => window.dispatchEvent(new CustomEvent("structura:toggle", { detail: "comments" })) },

  // Appearance
  { id: "theme-toggle",   group: "Appearance", label: "Toggle Dark/Light Mode", icon: Moon, shortcut: "", action: () => useThemeStore.getState().toggleTheme() },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery]     = useState("");
  const [cursor, setCursor]   = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const filtered = query.trim()
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.group.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flat = filtered;

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  const run = useCallback((cmd) => {
    onClose();
    setTimeout(() => cmd.action(), 80);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && flat[cursor]) run(flat[cursor]);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cursor, flat, run, onClose]);

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cursor="true"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }} id="command-palette">
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--bg-overlay)" }} />

      {/* Palette */}
      <div style={{ position: "relative", width: "min(580px, calc(100vw - 32px))", background: "var(--bg-elevated)", borderRadius: 16, border: "1px solid var(--border-color)", boxShadow: "var(--shadow-xl)", overflow: "hidden", transform: "translateY(0)", animation: "fadeSlideDown 150ms ease" }}>

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border-color)" }}>
          <Search size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            id="command-palette-input"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "0.95rem", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex" }}>
              <X size={14} />
            </button>
          )}
          <kbd style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "2px 6px", fontSize: "0.68rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: "60vh", overflowY: "auto", padding: "6px 0 8px" }}>
          {Object.entries(grouped).map(([group, cmds]) => (
            <div key={group}>
              <div style={{ padding: "8px 16px 4px", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{group}</div>
              {cmds.map((cmd) => {
                const myIdx = flat.indexOf(cmd);
                const isActive = myIdx === cursor;
                return (
                  <button
                    key={cmd.id}
                    data-cursor={isActive}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setCursor(myIdx)}
                    id={`cmd-${cmd.id}`}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 16px", border: "none", cursor: "pointer", textAlign: "left",
                      background: isActive ? "var(--accent-muted)" : "transparent",
                      transition: "background 80ms",
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: isActive ? "var(--accent)" : "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 80ms" }}>
                      <cmd.icon size={13} style={{ color: isActive ? "white" : "var(--text-secondary)" }} />
                    </div>
                    <span style={{ flex: 1, fontSize: "0.85rem", color: isActive ? "var(--accent)" : "var(--text-primary)", fontWeight: isActive ? 600 : 400 }}>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 5, padding: "1px 6px", fontSize: "0.68rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{cmd.shortcut}</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
              No commands matching "<strong>{query}</strong>"
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 14, fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
          {[["↑↓", "Navigate"], ["↵", "Run"], ["Esc", "Close"]].map(([key, label]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <kbd style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
