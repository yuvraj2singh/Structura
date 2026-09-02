"use client";
import { X, Trash2, Copy, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";

export default function PropertiesPanel({
  onElementsUpdated,
  onElementsDeleted,
  onElementAdded,
}) {
  const { selectedIds, elements, updateElement, deleteSelected, duplicateSelected } = useCanvasStore();
  const selected = elements.filter(el => selectedIds.includes(el.id));

  if (!selected.length) return null;

  const el = selected[0]; // show props of first selected element
  const multi = selected.length > 1;
  const s = el.style ?? {};

  const update = (key, val) => {
    updateElement(el.id, { [key]: val });
    const updated = useCanvasStore.getState().elements.find(e => e.id === el.id);
    if (updated) onElementsUpdated?.([updated]);
  };

  const updateStyle = (key, val) => {
    const newStyle = { ...el.style, [key]: val };
    updateElement(el.id, { style: newStyle });
    const updated = useCanvasStore.getState().elements.find(e => e.id === el.id);
    if (updated) onElementsUpdated?.([updated]);
  };

  const handleDelete = () => {
    const ids = [...selectedIds];
    deleteSelected();
    onElementsDeleted?.(ids);
  };

  const handleDuplicate = () => {
    const beforeIds = new Set(useCanvasStore.getState().elements.map(e => e.id));
    duplicateSelected();
    const after = useCanvasStore.getState().elements;
    const newEls = after.filter(e => !beforeIds.has(e.id));
    if (newEls.length) {
      newEls.forEach(elem => onElementAdded?.(elem));
    }
  };

  return (
    <div
      id="properties-panel"
      style={{
        position: "absolute", top: 60, right: 0,
        width: 220, bottom: 0, overflowY: "auto",
        background: "var(--bg-elevated)",
        borderLeft: "1px solid var(--border-color)",
        zIndex: 30, display: "flex", flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", flex: 1 }}>
          {multi ? `${selected.length} elements` : el.type}
        </span>
        <button
          onClick={handleDelete}
          title="Delete"
          id="props-delete"
          style={iconBtn}
        >
          <Trash2 size={13} style={{ color: "var(--danger)" }} />
        </button>
        <button
          onClick={handleDuplicate}
          title="Duplicate"
          id="props-duplicate"
          style={iconBtn}
        >
          <Copy size={13} />
        </button>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Position & Size (single element only) */}
        {!multi && (
          <section>
            <div style={sectionLabel}>Position & Size</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "X", key: "x", val: Math.round(el.x) },
                { label: "Y", key: "y", val: Math.round(el.y) },
                { label: "W", key: "width", val: Math.round(el.width) },
                { label: "H", key: "height", val: Math.round(el.height) },
              ].map(({ label, key, val }) => (
                <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={fieldLabel}>{label}</span>
                  <input
                    type="number"
                    value={val}
                    onChange={e => update(key, Number(e.target.value))}
                    style={numInput}
                    id={`props-${key}`}
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Stroke */}
        <section>
          <div style={sectionLabel}>Stroke</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={s.stroke ?? "#6366f1"}
              onChange={e => updateStyle("stroke", e.target.value)}
              style={{ width: 32, height: 28, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", cursor: "pointer", padding: 2 }}
              id="props-stroke-color"
              title="Stroke color"
            />
            <input
              type="number"
              min={0.5} max={20} step={0.5}
              value={s.strokeWidth ?? 2}
              onChange={e => updateStyle("strokeWidth", Number(e.target.value))}
              style={{ ...numInput, flex: 1 }}
              id="props-stroke-width"
              title="Stroke width"
            />
          </div>
        </section>

        {/* Fill */}
        <section>
          <div style={sectionLabel}>Fill</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={s.fill === "transparent" || !s.fill ? "#000000" : s.fill}
              onChange={e => updateStyle("fill", e.target.value)}
              style={{ width: 32, height: 28, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", cursor: "pointer", padding: 2 }}
              id="props-fill-color"
              title="Fill color"
            />
            <select
              value={s.fill === "transparent" || !s.fill ? "none" : "solid"}
              onChange={e => updateStyle("fill", e.target.value === "none" ? "transparent" : "#6366f1")}
              style={{ ...numInput, flex: 1 }}
              id="props-fill-type"
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
            </select>
          </div>
          {s.fill && s.fill !== "transparent" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span style={fieldLabel}>Opacity</span>
              <input
                type="range" min={0} max={1} step={0.05}
                value={s.fillOpacity ?? 1}
                onChange={e => updateStyle("fillOpacity", Number(e.target.value))}
                style={{ flex: 1 }}
                id="props-fill-opacity"
              />
              <span style={fieldLabel}>{Math.round((s.fillOpacity ?? 1) * 100)}%</span>
            </label>
          )}
        </section>

        {/* Opacity */}
        <section>
          <div style={sectionLabel}>Opacity</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range" min={0} max={1} step={0.05}
              value={el.opacity ?? 1}
              onChange={e => update("opacity", Number(e.target.value))}
              style={{ flex: 1 }}
              id="props-opacity"
            />
            <span style={fieldLabel}>{Math.round((el.opacity ?? 1) * 100)}%</span>
          </label>
        </section>

        {/* Visibility & Lock */}
        <section>
          <div style={sectionLabel}>Layer</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => update("visible", !el.visible)}
              id="props-visibility"
              title={el.visible ? "Hide" : "Show"}
              style={{ ...iconBtn, flex: 1, justifyContent: "center", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", gap: 5, fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              {el.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              {el.visible ? "Visible" : "Hidden"}
            </button>
            <button
              onClick={() => update("locked", !el.locked)}
              id="props-lock"
              title={el.locked ? "Unlock" : "Lock"}
              style={{ ...iconBtn, flex: 1, justifyContent: "center", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", gap: 5, fontSize: "0.75rem", color: "var(--text-secondary)" }}
            >
              {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
              {el.locked ? "Locked" : "Unlocked"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const sectionLabel = { fontSize: "0.7rem", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 };
const fieldLabel   = { fontSize: "0.72rem", color: "var(--text-tertiary)" };
const numInput     = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "0.8rem", padding: "4px 8px", fontFamily: "var(--font-mono)", outline: "none", width: "100%" };
const iconBtn      = { display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, borderRadius: "var(--radius-sm)", transition: "all 100ms ease" };
