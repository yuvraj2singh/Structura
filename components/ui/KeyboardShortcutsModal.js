"use client";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  {
    group: "Tools",
    items: [
      ["V", "Select / Move"],
      ["H", "Hand / Pan"],
      ["P", "Pen / Freehand"],
      ["R", "Rectangle"],
      ["C", "Circle"],
      ["L", "Line"],
      ["A", "Arrow"],
      ["T", "Text"],
      ["E", "Eraser"],
    ],
  },
  {
    group: "Canvas",
    items: [
      ["⌘ Z", "Undo"],
      ["⌘ ⇧ Z", "Redo"],
      ["⌘ D", "Duplicate selection"],
      ["Delete / ⌫", "Delete selected"],
      ["Escape", "Deselect / Close panel"],
      ["Space + drag", "Pan canvas"],
      ["⌘ scroll", "Zoom in/out"],
      ["0", "Reset zoom to 100%"],
    ],
  },
  {
    group: "Panels",
    items: [
      ["⌘ K", "Open Command Palette"],
      ["?", "Show keyboard shortcuts"],
      ["/ (toolbar)", "Toggle AI Generator"],
      ["/ (toolbar)", "Toggle DSA Lab"],
    ],
  },
  {
    group: "Selection",
    items: [
      ["Click", "Select element"],
      ["Drag (empty)", "Multi-select box"],
      ["Drag handle", "Resize element"],
    ],
  },
];

export default function KeyboardShortcutsModal({ onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}
      id="keyboard-shortcuts-modal"
    >
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--bg-overlay)" }} />

      {/* Modal */}
      <div style={{ position: "relative", width: "min(680px, calc(100vw - 32px))", maxHeight: "80vh", background: "var(--bg-elevated)", borderRadius: 20, border: "1px solid var(--border-color)", boxShadow: "var(--shadow-xl)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Keyboard size={16} style={{ color: "white" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>Keyboard Shortcuts</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>Press <kbd style={kbdStyle}>?</kbd> anytime to show this</div>
          </div>
          <button onClick={onClose} id="shortcuts-modal-close" style={ghostBtn}><X size={15} /></button>
        </div>

        {/* Grid */}
        <div style={{ overflowY: "auto", padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {SHORTCUTS.map(({ group, items }) => (
            <div key={group} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>{group}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map(([key, label]) => (
                  <div key={key + label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{label}</span>
                    <kbd style={kbdStyle}>{key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)", fontSize: "0.72rem", color: "var(--text-tertiary)", flexShrink: 0 }}>
          Press <kbd style={kbdStyle}>⌘ K</kbd> to open the Command Palette for all actions
        </div>
      </div>
    </div>
  );
}

const ghostBtn = { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", borderRadius: 6 };
const kbdStyle = { background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 6, padding: "2px 7px", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-primary)", whiteSpace: "nowrap" };
