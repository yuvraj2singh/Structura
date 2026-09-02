import { create } from "zustand";
import { deepClone, generateId } from "@/lib/utils";
import { MAX_UNDO_HISTORY } from "@/lib/constants";

/**
 * Central canvas store.
 * Manages elements, selection, viewport, undo/redo history.
 */
const useCanvasStore = create((set, get) => ({
  // ── Elements ──────────────────────────────────
  elements: [],
  selectedIds: [],

  // ── Viewport ──────────────────────────────────
  pan: { x: 0, y: 0 },
  zoom: 1,

  // ── History ───────────────────────────────────
  undoStack: [],   // each entry is a snapshot of elements[]
  redoStack: [],

  // ── Active tool ───────────────────────────────
  activeTool: "select",
  activeStyle: {
    stroke: "#6366f1",
    strokeWidth: 2,
    fill: "transparent",
    fontSize: 16,
    color: "#fafafa",
  },

  // ─────────────────────────────────────────────
  // Viewport helpers
  // ─────────────────────────────────────────────
  setPan: (pan) => set({ pan }),
  setZoom: (zoom) => set({ zoom: Math.max(0.05, Math.min(10, zoom)) }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setActiveStyle: (style) =>
    set((s) => ({ activeStyle: { ...s.activeStyle, ...style } })),

  /** Convert screen coords to canvas coords */
  screenToCanvas: (sx, sy) => {
    const { pan, zoom } = get();
    return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
  },

  // ─────────────────────────────────────────────
  // Selection
  // ─────────────────────────────────────────────
  setSelected: (ids) => set({ selectedIds: Array.isArray(ids) ? ids : [ids] }),
  addSelected: (id) =>
    set((s) => ({ selectedIds: s.selectedIds.includes(id) ? s.selectedIds : [...s.selectedIds, id] })),
  clearSelected: () => set({ selectedIds: [] }),

  getSelectedElements: () => {
    const { elements, selectedIds } = get();
    return elements.filter((el) => selectedIds.includes(el.id));
  },

  // ─────────────────────────────────────────────
  // History helpers
  // ─────────────────────────────────────────────
  _snapshot: () => deepClone(get().elements),

  _pushHistory: () => {
    const snapshot = get()._snapshot();
    set((s) => ({
      undoStack: [...s.undoStack.slice(-MAX_UNDO_HISTORY + 1), snapshot],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, elements } = get();
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [deepClone(elements), ...s.redoStack.slice(0, MAX_UNDO_HISTORY - 1)],
      elements: prev,
      selectedIds: [],
    }));
  },

  redo: () => {
    const { redoStack, elements } = get();
    if (!redoStack.length) return;
    const next = redoStack[0];
    set((s) => ({
      redoStack: s.redoStack.slice(1),
      undoStack: [...s.undoStack, deepClone(elements)],
      elements: next,
      selectedIds: [],
    }));
  },

  // ─────────────────────────────────────────────
  // Element CRUD
  // ─────────────────────────────────────────────
  addElement: (el) => {
    get()._pushHistory();
    set((s) => ({
      elements: [...s.elements, { ...el, zIndex: s.elements.length }],
    }));
    return el;
  },

  addElements: (els) => {
    get()._pushHistory();
    set((s) => ({
      elements: [
        ...s.elements,
        ...els.map((el, i) => ({ ...el, zIndex: s.elements.length + i })),
      ],
    }));
  },

  updateElement: (id, updates) => {
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id ? { ...el, ...updates, updatedAt: Date.now() } : el
      ),
    }));
  },

  updateElements: (updates) => {
    // updates: [{ id, ...changes }]
    set((s) => ({
      elements: s.elements.map((el) => {
        const u = updates.find((u) => u.id === el.id);
        return u ? { ...el, ...u, updatedAt: Date.now() } : el;
      }),
    }));
  },

  deleteSelected: () => {
    const { selectedIds } = get();
    if (!selectedIds.length) return;
    get()._pushHistory();
    set((s) => ({
      elements: s.elements.filter((el) => !s.selectedIds.includes(el.id)),
      selectedIds: [],
    }));
  },

  deleteElements: (ids) => {
    get()._pushHistory();
    set((s) => ({
      elements: s.elements.filter((el) => !ids.includes(el.id)),
      selectedIds: s.selectedIds.filter((id) => !ids.includes(id)),
    }));
  },

  duplicateSelected: () => {
    const { elements, selectedIds } = get();
    const targets = elements.filter((el) => selectedIds.includes(el.id));
    if (!targets.length) return;
    get()._pushHistory();
    const copies = targets.map((el) => ({
      ...deepClone(el),
      id: generateId("el"),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: el.zIndex + targets.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    set((s) => ({
      elements: [...s.elements, ...copies],
      selectedIds: copies.map((c) => c.id),
    }));
  },

  clearCanvas: () => {
    get()._pushHistory();
    set({ elements: [], selectedIds: [] });
  },

  // Replace all elements (used for board load / AI generation)
  setElements: (elements) => {
    set({ elements, selectedIds: [] });
  },

  // Highlight elements (used for DSA dry runs)
  highlightElements: (ids, color = "#f59e0b") => {
    set((s) => ({
      elements: s.elements.map((el) =>
        ids.includes(el.id)
          ? { ...el, style: { ...el.style, _highlight: color }, _highlighted: true }
          : { ...el, style: { ...el.style, _highlight: null }, _highlighted: false }
      ),
    }));
  },

  clearHighlights: () => {
    set((s) => ({
      elements: s.elements.map((el) => ({
        ...el,
        style: { ...el.style, _highlight: null },
        _highlighted: false,
      })),
    }));
  },
}));

export default useCanvasStore;
