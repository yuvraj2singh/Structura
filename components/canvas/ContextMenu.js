"use client";
import { useEffect, useRef } from "react";
import {
  Copy, Trash2, Lock, Unlock, Eye, EyeOff,
  ArrowUpToLine, ArrowDownToLine, ChevronUp, ChevronDown,
} from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";

export default function CanvasContextMenu({
  menu,
  onClose,
  onElementsUpdated,
  onElementsDeleted,
  onElementAdded,
}) {
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!menu) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [menu, onClose]);

  // Close on escape
  useEffect(() => {
    if (!menu) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [menu, onClose]);

  if (!menu) return null;

  const { x, y, elementId } = menu;
  const store = useCanvasStore.getState();
  const element = store.elements.find((el) => el.id === elementId);
  const hasSelection = store.selectedIds.length > 0;

  // Position so it stays on screen
  const MENU_W = 200, MENU_H = 300;
  const left = Math.min(x, window.innerWidth  - MENU_W - 12);
  const top  = Math.min(y, window.innerHeight - MENU_H - 12);

  const action = (fn) => { onClose(); setTimeout(fn, 40); };

  const notifyUpdate = (id, updates) => {
    store.updateElement(id, updates);
    const updated = useCanvasStore.getState().elements.find((e) => e.id === id);
    if (updated) onElementsUpdated?.([updated]);
  };

  const ITEMS = [
    {
      id: "ctx-duplicate",
      label: "Duplicate",
      icon: Copy,
      shortcut: "⌘D",
      enabled: hasSelection,
      onClick: () => action(() => {
        const beforeIds = new Set(store.elements.map((e) => e.id));
        store.duplicateSelected();
        const after = useCanvasStore.getState().elements;
        const newEls = after.filter((e) => !beforeIds.has(e.id));
        if (newEls.length) {
          newEls.forEach((elem) => onElementAdded?.(elem));
        }
      }),
    },
    {
      id: "ctx-delete",
      label: "Delete",
      icon: Trash2,
      shortcut: "⌫",
      enabled: hasSelection,
      danger: true,
      onClick: () => action(() => {
        const ids = [...store.selectedIds];
        store.deleteElements(ids);
        onElementsDeleted?.(ids);
      }),
    },
    { divider: true },
    {
      id: "ctx-lock",
      label: element?.locked ? "Unlock" : "Lock",
      icon: element?.locked ? Unlock : Lock,
      enabled: !!element,
      onClick: () => action(() => notifyUpdate(elementId, { locked: !element?.locked })),
    },
    {
      id: "ctx-visibility",
      label: element?.visible === false ? "Show" : "Hide",
      icon: element?.visible === false ? Eye : EyeOff,
      enabled: !!element,
      onClick: () => action(() => notifyUpdate(elementId, { visible: element?.visible === false })),
    },
    { divider: true },
    {
      id: "ctx-bring-front",
      label: "Bring to Front",
      icon: ArrowUpToLine,
      enabled: !!element,
      onClick: () => action(() => {
        const maxZ = Math.max(...store.elements.map((e) => e.zIndex || 0));
        notifyUpdate(elementId, { zIndex: maxZ + 1 });
      }),
    },
    {
      id: "ctx-bring-forward",
      label: "Bring Forward",
      icon: ChevronUp,
      enabled: !!element,
      onClick: () => action(() => notifyUpdate(elementId, { zIndex: (element?.zIndex || 0) + 1 })),
    },
    {
      id: "ctx-send-backward",
      label: "Send Backward",
      icon: ChevronDown,
      enabled: !!element,
      onClick: () => action(() => notifyUpdate(elementId, { zIndex: Math.max((element?.zIndex || 0) - 1, 0) })),
    },
    {
      id: "ctx-send-back",
      label: "Send to Back",
      icon: ArrowDownToLine,
      enabled: !!element,
      onClick: () => action(() => notifyUpdate(elementId, { zIndex: 0 })),
    },
  ];

  return (
    <div
      ref={ref}
      id="canvas-context-menu"
      style={{
        position: "fixed", left, top, zIndex: 300,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        boxShadow: "var(--shadow-xl)",
        overflow: "hidden",
        minWidth: 200,
        animation: "scaleIn 100ms ease",
        transformOrigin: "top left",
      }}
    >
      {ITEMS.map((item, i) => {
        if (item.divider) {
          return <div key={`div-${i}`} style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />;
        }
        return (
          <button
            key={item.id}
            id={item.id}
            onClick={item.enabled ? item.onClick : undefined}
            disabled={!item.enabled}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px", border: "none", cursor: item.enabled ? "pointer" : "not-allowed",
              background: "transparent", textAlign: "left",
              opacity: item.enabled ? 1 : 0.35,
              color: item.danger ? "var(--danger)" : "var(--text-primary)",
              transition: "background 80ms",
            }}
            onMouseEnter={(e) => { if (item.enabled) e.currentTarget.style.background = item.danger ? "var(--danger-muted)" : "var(--bg-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <item.icon size={14} style={{ flexShrink: 0, color: item.danger ? "var(--danger)" : "var(--text-secondary)" }} />
            <span style={{ flex: 1, fontSize: "0.83rem" }}>{item.label}</span>
            {item.shortcut && (
              <kbd style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 4, padding: "1px 5px" }}>
                {item.shortcut}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}
