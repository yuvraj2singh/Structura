"use client";
import {
  MousePointer2, Hand, Pen, Square, Circle, Minus,
  ArrowRight, Type, Image as ImageIcon, Eraser,
  Undo2, Redo2, Sparkles, Binary, History, MessageSquare, Trash2
} from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";

const TOOLS = [
  { id: "select",    icon: MousePointer2, label: "Select",    shortcut: "V" },
  { id: "hand",      icon: Hand,          label: "Pan",       shortcut: "H" },
  null, // divider
  { id: "pen",       icon: Pen,           label: "Pen",       shortcut: "P" },
  { id: "rectangle", icon: Square,        label: "Rectangle", shortcut: "R" },
  { id: "circle",    icon: Circle,        label: "Circle",    shortcut: "C" },
  { id: "line",      icon: Minus,         label: "Line",      shortcut: "L" },
  { id: "arrow",     icon: ArrowRight,    label: "Arrow",     shortcut: "A" },
  { id: "text",      icon: Type,          label: "Text",      shortcut: "T" },
  { id: "image",     icon: ImageIcon,     label: "Image",     shortcut: "I" },
  { id: "eraser",    icon: Eraser,        label: "Eraser",    shortcut: "E" },
];

function ToolBtn({ tool, active, onClick }) {
  const Icon = tool.icon;
  return (
    <button
      onClick={onClick}
      aria-label={`${tool.label} (${tool.shortcut})`}
      aria-pressed={active}
      id={`tool-${tool.id}`}
      title={`${tool.label}  [${tool.shortcut}]`}
      style={{
        width: 36, height: 36,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-md)",
        border: active ? "1px solid var(--accent-border)" : "1px solid transparent",
        background: active ? "var(--accent-muted)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 100ms ease",
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-primary)"; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}}
    >
      <Icon size={16} />
    </button>
  );
}

export default function Toolbar({ onAIClick, onDSAClick, onHistoryClick, onCommentsClick, onClearClick, showAI, showDSA, showHistory, showComments }) {
  const { activeTool, setActiveTool, undo, redo, undoStack, redoStack } = useCanvasStore();

  return (
    <div
      id="canvas-toolbar"
      className="canvas-toolbar-container"
      style={{
        position: "absolute",
        bottom: 20,
        left: "calc(40% + 95px)",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "5px 8px",
        margin: "0px 5px",
        borderRadius: "var(--radius-xl)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 30,
        maxWidth: "calc(100vw - 210px)",
      }}
    >
      {TOOLS.map((tool, i) =>
        tool === null ? (
          <div key={`div-${i}`} style={{ width: 1, height: 22, background: "var(--border-color)", margin: "0 3px", flexShrink: 0 }} />
        ) : (
          <ToolBtn
            key={tool.id}
            tool={tool}
            active={activeTool === tool.id}
            onClick={() => setActiveTool(tool.id)}
          />
        )
      )}

      <div style={{ width: 1, height: 22, background: "var(--border-color)", margin: "0 3px", flexShrink: 0 }} />

      {/* Undo */}
      <button
        onClick={undo}
        disabled={!undoStack.length}
        title="Undo (Ctrl+Z)"
        id="tool-undo"
        style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-md)", border: "1px solid transparent",
          background: "transparent", color: "var(--text-secondary)",
          cursor: undoStack.length ? "pointer" : "not-allowed",
          opacity: undoStack.length ? 1 : 0.35,
          transition: "all 100ms ease",
          flexShrink: 0,
        }}
      >
        <Undo2 size={15} />
      </button>

      {/* Redo */}
      <button
        onClick={redo}
        disabled={!redoStack.length}
        title="Redo (Ctrl+Shift+Z)"
        id="tool-redo"
        style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-md)", border: "1px solid transparent",
          background: "transparent", color: "var(--text-secondary)",
          cursor: redoStack.length ? "pointer" : "not-allowed",
          opacity: redoStack.length ? 1 : 0.35,
          transition: "all 100ms ease",
          flexShrink: 0,
        }}
      >
        <Redo2 size={15} />
      </button>

      <div style={{ width: 1, height: 22, background: "var(--border-color)", margin: "0 3px", flexShrink: 0 }} />

      {/* DSA */}
      <button
        onClick={onDSAClick}
        title="DSA Lab"
        id="tool-dsa"
        aria-pressed={showDSA}
        style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-md)",
          border: showDSA ? "1px solid var(--accent-border)" : "1px solid transparent",
          background: showDSA ? "var(--accent-muted)" : "transparent",
          color: showDSA ? "var(--accent)" : "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 100ms ease",
          flexShrink: 0,
        }}
      >
        <Binary size={16} />
      </button>

      {/* History */}
      <button
        onClick={onHistoryClick}
        title="Version History"
        id="tool-history"
        aria-pressed={showHistory}
        style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-md)",
          border: showHistory ? "1px solid var(--accent-border)" : "1px solid transparent",
          background: showHistory ? "var(--accent-muted)" : "transparent",
          color: showHistory ? "var(--accent)" : "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 100ms ease",
          flexShrink: 0,
        }}
      >
        <History size={16} />
      </button>

      {/* Comments */}
      <button
        onClick={onCommentsClick}
        title="Toggle Comments (right-click canvas to add)"
        id="tool-comments"
        aria-pressed={showComments}
        style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-md)",
          border: showComments ? "1px solid var(--accent-border)" : "1px solid transparent",
          background: showComments ? "var(--accent-muted)" : "transparent",
          color: showComments ? "var(--accent)" : "var(--text-secondary)",
          cursor: "pointer", transition: "all 100ms ease",
          flexShrink: 0,
        }}
      >
        <MessageSquare size={15} />
      </button>

      <div style={{ width: 1, height: 22, background: "var(--border-color)", margin: "0 3px", flexShrink: 0 }} />

      {/* Clear Canvas */}
      <button
        onClick={() => {
          if (window.confirm("Clear the entire canvas? This cannot be undone.")) onClearClick?.();
        }}
        title="Clear canvas"
        id="tool-clear"
        style={{
          width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--radius-md)", border: "1px solid transparent",
          background: "transparent", color: "var(--text-secondary)",
          cursor: "pointer", transition: "all 100ms ease",
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--danger-muted)"; e.currentTarget.style.color = "var(--danger)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Trash2 size={15} />
      </button>

      {/* AI */}
      <button
        onClick={onAIClick}
        id="tool-ai"
        aria-pressed={showAI}
        title="AI Generate (prompts canvas)"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 12px", borderRadius: "var(--radius-lg)",
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          color: "white", border: "none", cursor: "pointer",
          fontSize: "0.8125rem", fontWeight: 600,
          fontFamily: "var(--font-sans)",
          boxShadow: showAI ? "0 0 16px rgba(99,102,241,0.5)" : "none",
          transition: "all 100ms ease",
          flexShrink: 0,
        }}
      >
        <Sparkles size={13} />
        AI
      </button>
    </div>
  );
}
