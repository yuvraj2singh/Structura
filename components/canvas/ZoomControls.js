"use client";
import { ZoomIn, ZoomOut, Maximize2, Grid3x3 } from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";

export default function ZoomControls({ showGrid, onToggleGrid }) {
  const { zoom, setZoom, setPan } = useCanvasStore();
  const pct = Math.round(zoom * 100);

  return (
    <div
      id="zoom-controls"
      className="canvas-zoom-container"
      style={{
        position: "absolute", bottom: 20, left: 20,
        display: "flex", alignItems: "center", gap: 2,
        padding: "4px 6px", borderRadius: "var(--radius-lg)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-md)", zIndex: 30,
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => setZoom(Math.max(0.05, zoom - 0.1))}
        title="Zoom out" id="zoom-out"
        style={btnStyle}
      >
        <ZoomOut size={13} />
      </button>

      <button
        onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
        title="Reset zoom" id="zoom-reset"
        style={{ ...btnStyle, minWidth: 46, fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}
      >
        {pct}%
      </button>

      <button
        onClick={() => setZoom(Math.min(10, zoom + 0.1))}
        title="Zoom in" id="zoom-in"
        style={btnStyle}
      >
        <ZoomIn size={13} />
      </button>

      <div style={{ width: 1, height: 16, background: "var(--border-color)", margin: "0 2px" }} />

      <button
        onClick={onToggleGrid}
        title={showGrid ? "Hide grid" : "Show grid"}
        id="toggle-grid"
        aria-pressed={showGrid}
        style={{ ...btnStyle, color: showGrid ? "var(--accent)" : "var(--text-tertiary)" }}
      >
        <Grid3x3 size={13} />
      </button>

      <button
        onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
        title="Fit to screen" id="fit-screen"
        style={btnStyle}
      >
        <Maximize2 size={13} />
      </button>
    </div>
  );
}

const btnStyle = {
  width: 28, height: 28, display: "flex", alignItems: "center",
  justifyContent: "center", borderRadius: "var(--radius-sm)",
  border: "none", background: "transparent",
  color: "var(--text-secondary)", cursor: "pointer",
  transition: "all 100ms ease",
};
