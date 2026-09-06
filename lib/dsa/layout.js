/**
 * DSA Layout Engine
 * Converts parsed DSA data into arrays of canvas elements with (x,y) positions.
 */
import { createElement } from "@/lib/canvas/elements";
import { ELEMENT_TYPES } from "@/lib/constants";
import { generateId } from "@/lib/utils";

// Layout constants
const CELL_W    = 56;
const CELL_H    = 44;
const CELL_GAP  = 4;
const NODE_R    = 28;  // radius of tree/graph nodes
const NODE_D    = NODE_R * 2;
const NODE_GAP  = 20;  // horizontal gap between tree nodes
const LEVEL_H   = 90;  // vertical gap between tree levels

/** Create a canvas element for a DSA node */
function makeCell(x, y, w, h, type, data, style = {}) {
  return createElement(type, {
    x, y, width: w, height: h,
    data,
    style: {
      stroke: "#6366f1",
      strokeWidth: 1.5,
      fill: "transparent",
      ...style,
    },
    zIndex: 0,
  });
}

function makeArrow(x1, y1, x2, y2, data = {}, style = {}) {
  return createElement(ELEMENT_TYPES.ARROW, {
    x: x1, y: y1,
    width: Math.abs(x2 - x1) || 1,
    height: Math.abs(y2 - y1) || 1,
    data: { x2, y2, ...data },
    style: { stroke: "#52525b", strokeWidth: 1.5, ...style },
  });
}

function makeLabel(x, y, text, style = {}) {
  return createElement(ELEMENT_TYPES.TEXT, {
    x, y, width: 120, height: 20,
    data: { text },
    style: { fontSize: 11, color: "#71717a", ...style },
  });
}

/* ── 1D Array ────────────────────────────────────── */
export function layoutArray(items, origin = { x: 60, y: 80 }) {
  const elements = [];
  items.forEach((item, i) => {
    const x = origin.x + i * (CELL_W + CELL_GAP);
    elements.push(makeCell(x, origin.y, CELL_W, CELL_H, ELEMENT_TYPES.ARRAY_CELL, {
      value: item.value,
      index: item.index,
    }));
  });
  return elements;
}

/* ── 2D Array / Matrix ───────────────────────────── */
export function layoutArray2D(matrix, origin = { x: 60, y: 80 }) {
  const elements = [];
  const cols = matrix[0]?.length || 0;
  matrix.forEach((row, ri) => {
    row.forEach((val, ci) => {
      const x = origin.x + ci * (CELL_W + CELL_GAP);
      const y = origin.y + ri * (CELL_H + CELL_GAP);
      const flatIndex = ri * cols + ci;
      elements.push(makeCell(x, y, CELL_W, CELL_H, ELEMENT_TYPES.ARRAY_CELL, {
        value: val,
        index: `[${ri}][${ci}]`,
        flatIndex,
        row: ri,
        col: ci,
      }));
    });
  });
  return elements;
}

/* ── Linked List ─────────────────────────────────── */
export function layoutLinkedList(items, origin = { x: 60, y: 80 }) {
  const elements = [];
  const nodeW = 90;
  const nodeH = 44;
  const gap   = 40;

  items.forEach((item, i) => {
    const x = origin.x + i * (nodeW + gap);
    elements.push(makeCell(x, origin.y, nodeW, nodeH, ELEMENT_TYPES.LINKED_LIST_NODE, {
      value: item.value,
      isNull: item.isNull,
    }));
    // Arrow to next
    if (i < items.length - 1) {
      elements.push(makeArrow(
        x + nodeW, origin.y + nodeH / 2,
        x + nodeW + gap, origin.y + nodeH / 2
      ));
    } else {
      // NULL pointer
      elements.push(makeLabel(x + nodeW + 6, origin.y + nodeH / 2 - 8, "NULL", { color: "#52525b" }));
    }
    // HEAD label
    if (i === 0) {
      elements.push(makeLabel(x + nodeW / 4, origin.y - 22, "HEAD", { color: "#818cf8", fontSize: 10, fontWeight: "600" }));
    }
  });
  return elements;
}

/* ── Stack ───────────────────────────────────────── */
export function layoutStack(items, origin = { x: 60, y: 60 }) {
  const elements = [];
  const reversed = [...items].reverse(); // top at top visually

  reversed.forEach((item, i) => {
    const y = origin.y + i * (CELL_H + CELL_GAP);
    elements.push(makeCell(origin.x, y, CELL_W * 2, CELL_H, ELEMENT_TYPES.STACK_NODE, {
      value: item.value,
      isTop: item.isTop,
      isBottom: item.isBottom,
    }));
    if (i === 0) {
      elements.push(makeLabel(origin.x + CELL_W * 2 + 10, y + CELL_H / 2 - 8, "← TOP", { color: "#818cf8", fontSize: 10, fontWeight: "600" }));
    }
    if (i === reversed.length - 1) {
      elements.push(makeLabel(origin.x + CELL_W * 2 + 10, y + CELL_H / 2 - 8, "← BOTTOM", { color: "#71717a", fontSize: 10 }));
    }
  });
  return elements;
}

/* ── Queue ───────────────────────────────────────── */
export function layoutQueue(items, origin = { x: 60, y: 80 }) {
  const elements = [];
  items.forEach((item, i) => {
    const x = origin.x + i * (CELL_W + CELL_GAP);
    elements.push(makeCell(x, origin.y, CELL_W, CELL_H, ELEMENT_TYPES.QUEUE_NODE, {
      value: item.value,
      isFront: item.isFront,
      isRear: item.isRear,
    }));
    if (item.isFront) {
      elements.push(makeLabel(x + CELL_W / 4, origin.y - 22, "FRONT", { color: "#818cf8", fontSize: 10, fontWeight: "600" }));
    }
    if (item.isRear) {
      elements.push(makeLabel(x + CELL_W / 4, origin.y + CELL_H + 6, "REAR", { color: "#71717a", fontSize: 10 }));
    }
  });
  return elements;
}

/* ── BST / Tree ──────────────────────────────────── */
export function layoutTree(nodes, origin = { x: 60, y: 60 }) {
  if (!nodes.length) return [];

  const elements = [];
  const nodeMap = {};

  // Assign pixel x position by in-order x index
  const xs = nodes.map((n) => n.x);
  const minX = Math.min(...xs);
  const positioned = nodes.map((n) => ({
    ...n,
    px: origin.x + (n.x - minX) * (NODE_D + NODE_GAP),
    py: origin.y + n.depth * LEVEL_H,
  }));

  positioned.forEach((n) => (nodeMap[n.id] = n));

  // Draw edges first (so they appear under nodes)
  positioned.forEach((n) => {
    if (n.leftId && nodeMap[n.leftId]) {
      const child = nodeMap[n.leftId];
      elements.push(makeArrow(
        n.px + NODE_R, n.py + NODE_R,
        child.px + NODE_R, child.py + NODE_R,
        {}, { stroke: "#3f3f46" }
      ));
    }
    if (n.rightId && nodeMap[n.rightId]) {
      const child = nodeMap[n.rightId];
      elements.push(makeArrow(
        n.px + NODE_R, n.py + NODE_R,
        child.px + NODE_R, child.py + NODE_R,
        {}, { stroke: "#3f3f46" }
      ));
    }
  });

  // Draw nodes on top
  positioned.forEach((n) => {
    elements.push(makeCell(n.px, n.py, NODE_D, NODE_D, ELEMENT_TYPES.TREE_NODE, {
      value: n.value,
      id: n.id,
    }));
  });

  return elements;
}

/* ── Heap ────────────────────────────────────────── */
export function layoutHeap(items, origin = { x: 60, y: 60 }) {
  if (!items.length) return [];

  const elements = [];
  const positioned = items.map((item) => {
    const depth = Math.floor(Math.log2(item.index + 1));
    const levelStart = Math.pow(2, depth) - 1;
    const posInLevel = item.index - levelStart;
    const levelCount = Math.pow(2, depth);
    const totalWidth = (levelCount - 1) * (NODE_D + NODE_GAP);
    const px = origin.x + posInLevel * (NODE_D + NODE_GAP) - totalWidth / 2 + (items.length * (NODE_D + NODE_GAP)) / 4;
    const py = origin.y + depth * LEVEL_H;
    return { ...item, px, py };
  });

  const posMap = {};
  positioned.forEach((n) => (posMap[n.index] = n));

  // Draw edges
  positioned.forEach((n) => {
    if (n.parentIndex !== null && posMap[n.parentIndex]) {
      const parent = posMap[n.parentIndex];
      elements.push(makeArrow(
        parent.px + NODE_R, parent.py + NODE_R,
        n.px + NODE_R, n.py + NODE_R,
        {}, { stroke: "#3f3f46" }
      ));
    }
  });

  // Draw nodes
  positioned.forEach((n) => {
    elements.push(makeCell(n.px, n.py, NODE_D, NODE_D, ELEMENT_TYPES.TREE_NODE, {
      value: n.value,
      index: n.index,
    }));
  });

  // Also render as array at bottom
  const arrayY = origin.y + (Math.floor(Math.log2(items.length)) + 2) * LEVEL_H;
  items.forEach((item, i) => {
    elements.push(makeCell(
      origin.x + i * (CELL_W + CELL_GAP), arrayY,
      CELL_W, CELL_H, ELEMENT_TYPES.ARRAY_CELL,
      { value: item.value, index: i }
    ));
  });

  return elements;
}

function makeGraphEdge(x1, y1, x2, y2, data = {}, style = {}) {
  return createElement(ELEMENT_TYPES.GRAPH_EDGE, {
    x: x1, y: y1,
    width: Math.abs(x2 - x1) || 1,
    height: Math.abs(y2 - y1) || 1,
    data: { x2, y2, ...data },
    style: { stroke: "#6366f1", strokeWidth: 2, ...style },
  });
}

function makeLine(x1, y1, x2, y2, data = {}, style = {}) {
  return createElement(ELEMENT_TYPES.LINE, {
    x: x1, y: y1,
    width: Math.abs(x2 - x1) || 1,
    height: Math.abs(y2 - y1) || 1,
    data: { x2, y2, ...data },
    style: { stroke: "#52525b", strokeWidth: 2, ...style },
  });
}

/* ── Graph ───────────────────────────────────────── */
export function layoutGraph({ nodes, edges, directed = false, weighted = false }, origin = { x: 60, y: 60 }) {
  const elements = [];
  const count = nodes.length;
  const radius = Math.max(120, count * 36);
  const cx = origin.x + radius + NODE_R;
  const cy = origin.y + radius + NODE_R;

  // Arrange nodes in a circle
  const posMap = {};
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const px = cx + radius * Math.cos(angle) - NODE_R;
    const py = cy + radius * Math.sin(angle) - NODE_R;
    posMap[node.id] = { px, py };
    elements.push(makeCell(px, py, NODE_D, NODE_D, ELEMENT_TYPES.GRAPH_NODE, {
      value: node.label,
      id: `graph-node-${node.id}`,
    }));
  });

  // Track drawn undirected edges to prevent duplicate overlapping visual lines
  const drawnEdges = new Set();

  // Draw edges
  edges.forEach((edge) => {
    const from = posMap[edge.from];
    const to   = posMap[edge.to];
    if (!from || !to) return;

    if (!directed) {
      const edgeKey = [edge.from, edge.to].sort().join("<->");
      if (drawnEdges.has(edgeKey)) return;
      drawnEdges.add(edgeKey);
    }

    elements.push(makeGraphEdge(
      from.px + NODE_R, from.py + NODE_R,
      to.px + NODE_R,   to.py + NODE_R,
      {
        directed,
        weight: weighted ? edge.weight : null,
      },
      { stroke: "#6366f1", strokeWidth: 2 }
    ));
  });

  return elements;
}

/* ── String ──────────────────────────────────────── */
export function layoutString(chars, origin = { x: 60, y: 80 }) {
  const elements = [];
  const cellW = 48;

  chars.forEach((ch, i) => {
    const x = origin.x + i * (cellW + CELL_GAP);
    elements.push(makeCell(x, origin.y, cellW, CELL_H, ELEMENT_TYPES.ARRAY_CELL, {
      value: ch.value,
      index: ch.index,
    }));
  });

  return elements;
}

/* ── Main dispatcher ─────────────────────────────── */
export function layoutDSA(type, parsedData, origin = { x: 80, y: 80 }) {
  switch (type) {
    case "array":   return layoutArray(parsedData, origin);
    case "array2d": return layoutArray2D(parsedData, origin);
    case "list":    return layoutLinkedList(parsedData, origin);
    case "stack":   return layoutStack(parsedData, origin);
    case "queue":   return layoutQueue(parsedData, origin);
    case "tree":    return layoutTree(parsedData, origin);
    case "heap":    return layoutHeap(parsedData, origin);
    case "graph":   return layoutGraph(parsedData, origin);
    case "string":  return layoutString(parsedData, origin);
    default: return [];
  }
}
