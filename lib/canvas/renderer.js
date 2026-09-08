import { ELEMENT_TYPES } from "@/lib/constants";
import { getResizeHandles } from "./elements";

const HANDLE_RADIUS = 5;
const HANDLE_FILL   = "#ffffff";
const HANDLE_STROKE = "#6366f1";

/**
 * Main render function — called every frame.
 * Draws all elements with the current viewport transform applied.
 */
export function renderCanvas(ctx, elements, selectedIds, pan, zoom, options = {}) {
  const { showGrid = true, theme = "dark" } = options;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = theme === "dark" ? "#0e0e11" : "#f8f9ff";
  ctx.fillRect(0, 0, w, h);

  // Grid
  if (showGrid) drawGrid(ctx, pan, zoom, w, h, theme);

  // Apply viewport transform
  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);

  // Sort by zIndex
  const sorted = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  sorted.forEach((el) => {
    if (el.visible === false) return;
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;
    drawElement(ctx, el, theme);
    ctx.restore();
  });

  // Draw selection boxes + handles on top
  sorted.forEach((el) => {
    if (!selectedIds.includes(el.id)) return;
    ctx.save();
    drawSelectionBox(ctx, el);
    ctx.restore();
  });

  ctx.restore();
}

// ── Grid ────────────────────────────────────────────
function drawGrid(ctx, pan, zoom, w, h, theme) {
  const gridSize = 24 * zoom;
  const offX = pan.x % gridSize;
  const offY = pan.y % gridSize;
  const color = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";

  ctx.fillStyle = color;
  for (let x = offX; x < w; x += gridSize) {
    for (let y = offY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── Dispatch to element-specific drawers ────────────
function drawElement(ctx, el, theme) {
  const highlighted = el._highlighted;
  if (highlighted && el.style._highlight) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = el.style._highlight;
  }

  switch (el.type) {
    case ELEMENT_TYPES.RECTANGLE:   drawRect(ctx, el); break;
    case ELEMENT_TYPES.CIRCLE:      drawCircle(ctx, el); break;
    case ELEMENT_TYPES.LINE:        drawLine(ctx, el); break;
    case ELEMENT_TYPES.ARROW:       drawArrow(ctx, el); break;
    case ELEMENT_TYPES.TEXT:        drawText(ctx, el, theme); break;
    case ELEMENT_TYPES.FREEHAND:    drawFreehand(ctx, el); break;
    case ELEMENT_TYPES.IMAGE:       drawImage(ctx, el, theme); break;
    // DSA elements
    case ELEMENT_TYPES.TREE_NODE:        drawTreeNode(ctx, el, theme); break;
    case ELEMENT_TYPES.GRAPH_NODE:       drawGraphNode(ctx, el, theme); break;
    case ELEMENT_TYPES.ARRAY_CELL:       drawArrayCell(ctx, el, theme); break;
    case ELEMENT_TYPES.LINKED_LIST_NODE: drawLinkedListNode(ctx, el, theme); break;
    case ELEMENT_TYPES.STACK_NODE:       drawStackNode(ctx, el, theme); break;
    case ELEMENT_TYPES.QUEUE_NODE:       drawQueueNode(ctx, el, theme); break;
    case ELEMENT_TYPES.GRAPH_EDGE:       drawGraphEdge(ctx, el, theme); break;
    default: break;
  }

  ctx.shadowBlur = 0;
}

// ── Rectangle ────────────────────────────────────────
function drawRect(ctx, el) {
  const { x, y, width: w, height: h, style = {} } = el;
  const r = style.borderRadius ?? 6;
  ctx.beginPath();
  if (r > 0) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  if (style.fill && style.fill !== "transparent") {
    ctx.fillStyle = style.fill;
    ctx.globalAlpha = style.fillOpacity ?? 1;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth ?? 2;
    if (style.lineDash?.length) ctx.setLineDash(style.lineDash);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ── Circle / Ellipse ──────────────────────────────────
function drawCircle(ctx, el) {
  const { x, y, width: w, height: h, style = {} } = el;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  if (style.fill && style.fill !== "transparent") {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth ?? 2;
    ctx.stroke();
  }
}

// ── Line ─────────────────────────────────────────────
function drawLine(ctx, el) {
  const { x, y, data = {}, style = {} } = el;
  const x2 = data.x2 ?? x + el.width;
  const y2 = data.y2 ?? y + el.height;
  const isHl = el._highlighted;
  const stroke = isHl ? (style._highlight ?? "#f59e0b") : (style.stroke ?? "#6b7280");
  const strokeW = isHl ? Math.max(3.5, (style.strokeWidth ?? 2) + 2) : (style.strokeWidth ?? 2);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeW;
  if (style.lineDash?.length) ctx.setLineDash(style.lineDash);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── Arrow ─────────────────────────────────────────────
function drawArrow(ctx, el) {
  const { x, y, data = {}, style = {} } = el;
  const x2 = data.x2 ?? x + el.width;
  const y2 = data.y2 ?? y + el.height;
  const isHl = el._highlighted;
  const stroke = isHl ? (style._highlight ?? "#f59e0b") : (style.stroke ?? "#6b7280");
  const strokeW = isHl ? Math.max(3.5, (style.strokeWidth ?? 2) + 2) : (style.strokeWidth ?? 2);

  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeW;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Arrowhead
  const angle = Math.atan2(y2 - y, x2 - x);
  const headLen = isHl ? 15 : 12;
  ctx.fillStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

// ── Text ──────────────────────────────────────────────
function drawText(ctx, el, theme) {
  const { x, y, width: w, height: h, data = {}, style = {} } = el;
  const text = data.text ?? "";
  const fontSize = style.fontSize ?? 18;
  const fontWeight = style.fontWeight ?? "500";
  const fontFamily = style.fontFamily ?? "Inter, system-ui, sans-serif";

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  // Adaptive contrast text color: if no custom color is specified,
  // or if it was the legacy white, automatically ensure high contrast against the theme
  const hasCustomColor = style.color && style.color !== "#fafafa" && style.color !== "#0f0f10" && style.color !== "inherit";
  ctx.fillStyle = hasCustomColor
    ? style.color
    : (theme === "dark" ? "#fafafa" : "#0f0f10");

  ctx.textAlign = style.textAlign ?? "left";
  ctx.textBaseline = "top";

  // Word wrap with font-scaled line height
  const words = text.split(" ");
  let line = "";
  let lineY = y + 4;
  const lineHeight = fontSize * 1.35;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (w > 40 && ctx.measureText(test).width > w && line) {
      ctx.fillText(line, x + 4, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x + 4, lineY);
  }
}

// ── Freehand ──────────────────────────────────────────
function drawFreehand(ctx, el) {
  const { data = {}, style = {} } = el;
  const points = data.points ?? [];
  if (points.length < 2) return;
  ctx.strokeStyle = style.stroke ?? "#6366f1";
  ctx.lineWidth = style.strokeWidth ?? 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const mp = { x: (points[i - 1].x + points[i].x) / 2, y: (points[i - 1].y + points[i].y) / 2 };
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mp.x, mp.y);
  }
  ctx.stroke();
}

// ── Image ─────────────────────────────────────────────
// imageCache stores fully-loaded HTMLImageElement objects keyed by src
const imageCache = new Map();

function preloadImage(src) {
  const cached = imageCache.get(src);
  if (cached) return cached; // already loaded

  const img = new Image();
  imageCache.set(src, img); // store immediately so we don't double-load
  img.onload = () => imageCache.set(src, img); // overwrite with loaded img
  img.src = src;
  // For base64 data URLs browsers load synchronously — check right away
  if (img.complete && img.naturalWidth > 0) imageCache.set(src, img);
  return imageCache.get(src);
}

function drawImage(ctx, el, theme) {
  const { x, y, width: w, height: h, data = {} } = el;
  const src = data.src;
  if (!src) return;

  const img = preloadImage(src);

  ctx.save();

  if (img && img.naturalWidth > 0) {
    // Paint the image directly — most reliable, no clip path issues
    ctx.drawImage(img, x, y, w, h);
  } else {
    // Loading placeholder
    ctx.fillStyle = theme === "dark" ? "#27272a" : "#f1f5f9";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = theme === "dark" ? "#71717a" : "#94a3b8";
    ctx.font = "13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Loading image…", x + w / 2, y + h / 2);
  }

  // Always draw a visible border so the image has clear bounds
  ctx.strokeStyle = theme === "dark"
    ? "rgba(255, 255, 255, 0.22)"
    : "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  ctx.restore();
}


// ── DSA: Tree Node ────────────────────────────────────
export function drawTreeNode(ctx, el, theme) {
  const { x, y, width: w, height: h, data = {}, style = {} } = el;
  const cx = x + w / 2, cy = y + h / 2, r = w / 2;
  const highlighted = el._highlighted;
  const nodeColor = highlighted ? (style._highlight ?? "#f59e0b") : (style.fill ?? (theme === "dark" ? "#1c1c1f" : "#ffffff"));
  const borderColor = highlighted ? (style._highlight ?? "#f59e0b") : (style.stroke ?? "#6366f1");

  // Glow on highlight
  if (highlighted) {
    ctx.shadowBlur = 16;
    ctx.shadowColor = style._highlight ?? "#f59e0b";
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = nodeColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = style.strokeWidth ?? 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Label
  const label = data.value !== undefined ? String(data.value) : "";
  ctx.font = `600 ${Math.max(10, r * 0.55)}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = highlighted ? "#fff" : (theme === "dark" ? "#fafafa" : "#0f0f10");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy);

  // Null marker (leaf indicator)
  if (data.isNull) {
    ctx.fillStyle = theme === "dark" ? "#52525b" : "#9ca3af";
    ctx.font = `500 10px Inter, system-ui, sans-serif`;
    ctx.fillText("∅", cx, cy);
  }
}

// ── DSA: Graph Node ───────────────────────────────────
function drawGraphNode(ctx, el, theme) {
  drawTreeNode(ctx, el, theme); // same visual, different semantics
}

// ── DSA: Array Cell ───────────────────────────────────
export function drawArrayCell(ctx, el, theme) {
  const { x, y, width: w, height: h, data = {}, style = {} } = el;
  const highlighted = el._highlighted;
  const bg = highlighted ? (style._highlight ?? "#f59e0b") : (theme === "dark" ? "#1c1c1f" : "#ffffff");
  const border = highlighted ? (style._highlight ?? "#f59e0b") : (style.stroke ?? "#27272a");

  // Cell box
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = style.strokeWidth ?? 1.5;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();

  // Value
  const val = data.value !== undefined ? String(data.value) : "";
  ctx.font = `600 ${Math.max(10, h * 0.4)}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = highlighted ? "#fff" : (theme === "dark" ? "#fafafa" : "#0f0f10");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(val, x + w / 2, y + h / 2);

  // Index label above
  if (data.index !== undefined) {
    ctx.font = `400 10px Inter, system-ui, sans-serif`;
    ctx.fillStyle = theme === "dark" ? "#71717a" : "#9ca3af";
    ctx.textBaseline = "bottom";
    ctx.fillText(String(data.index), x + w / 2, y - 4);
  }
}

// ── DSA: Linked List Node ─────────────────────────────
function drawLinkedListNode(ctx, el, theme) {
  const { x, y, width: w, height: h, data = {}, style = {} } = el;
  const highlighted = el._highlighted;
  const bg = highlighted ? (style._highlight ?? "#f59e0b") : (theme === "dark" ? "#1c1c1f" : "#ffffff");
  const border = highlighted ? (style._highlight ?? "#f59e0b") : (style.stroke ?? "#6366f1");

  // Value box (left 70%)
  const valW = w * 0.65;
  ctx.beginPath();
  ctx.roundRect(x, y, valW, h, [6, 0, 0, 6]);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pointer box (right 30%)
  ctx.beginPath();
  ctx.roundRect(x + valW, y, w - valW, h, [0, 6, 6, 0]);
  ctx.fillStyle = theme === "dark" ? "#18181b" : "#f1f3f5";
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.stroke();

  // Value text
  ctx.font = `600 ${Math.max(10, h * 0.38)}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = highlighted ? "#fff" : (theme === "dark" ? "#fafafa" : "#0f0f10");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(data.value ?? ""), x + valW / 2, y + h / 2);

  // "→" in pointer box
  ctx.font = `500 ${Math.max(9, h * 0.32)}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = theme === "dark" ? "#71717a" : "#9ca3af";
  ctx.fillText(data.isNull ? "∅" : "→", x + valW + (w - valW) / 2, y + h / 2);
}

// ── DSA: Stack Node ───────────────────────────────────
function drawStackNode(ctx, el, theme) {
  // Reuse array cell style
  drawArrayCell(ctx, el, theme);
  // Stack label on left side
  const { x, y, width: w, height: h, data = {} } = el;
  if (data.isTop) {
    ctx.font = `700 9px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#6366f1";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("TOP →", x - 4, y + h / 2);
  }
}

// ── DSA: Queue Node ───────────────────────────────────
function drawQueueNode(ctx, el, theme) {
  drawArrayCell(ctx, el, theme);
}

// ── DSA: Graph Edge ───────────────────────────────────
function drawGraphEdge(ctx, el, theme) {
  const isDirected = el.data?.directed !== false;
  if (isDirected) {
    drawArrow(ctx, el);
  } else {
    drawLine(ctx, el);
  }

  // Weight label if present
  const { x, y, data = {}, style = {} } = el;
  if (data.weight !== undefined && data.weight !== null && String(data.weight).trim() !== "") {
    const x2 = data.x2 ?? (x + el.width);
    const y2 = data.y2 ?? (y + el.height);
    const mx = (x + x2) / 2, my = (y + y2) / 2;
    const weightStr = String(data.weight);

    ctx.save();
    ctx.font = "bold 11px Inter, system-ui, sans-serif";
    const textW = ctx.measureText(weightStr).width;
    const boxW = Math.max(18, textW + 8);
    const boxH = 16;

    // Weight pill background
    ctx.fillStyle = theme === "dark" ? "#1e1e24" : "#ffffff";
    ctx.strokeStyle = style.stroke ?? (theme === "dark" ? "#4f46e5" : "#6366f1");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(mx - boxW / 2, my - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    // Weight text
    ctx.fillStyle = theme === "dark" ? "#f4f4f5" : "#18181b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(weightStr, mx, my);
    ctx.restore();
  }
}

// ── Selection box + handles ───────────────────────────
function drawSelectionBox(ctx, el) {
  if (el.type === ELEMENT_TYPES.LINE || el.type === ELEMENT_TYPES.ARROW) {
    const x2 = el.data?.x2 ?? (el.x + el.width);
    const y2 = el.data?.y2 ?? (el.y + el.height);

    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    const handles = getResizeHandles(el);
    handles.forEach(({ x: hx, y: hy }) => {
      ctx.beginPath();
      ctx.arc(hx, hy, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = HANDLE_FILL;
      ctx.fill();
      ctx.strokeStyle = HANDLE_STROKE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    return;
  }

  const { x, y, width: w, height: h } = el;
  const pad = 4;

  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
  ctx.setLineDash([]);

  const handles = getResizeHandles({ ...el, x: x - pad, y: y - pad, width: w + pad * 2, height: h + pad * 2 });
  handles.forEach(({ x: hx, y: hy }) => {
    ctx.beginPath();
    ctx.arc(hx, hy, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = HANDLE_FILL;
    ctx.fill();
    ctx.strokeStyle = HANDLE_STROKE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

/** Draw a live freehand stroke while the user is drawing */
export function drawLiveStroke(ctx, points, style = {}) {
  if (points.length < 2) return;
  ctx.strokeStyle = style.stroke ?? "#6366f1";
  ctx.lineWidth = style.strokeWidth ?? 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const mp = { x: (points[i - 1].x + points[i].x) / 2, y: (points[i - 1].y + points[i].y) / 2 };
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mp.x, mp.y);
  }
  ctx.stroke();
}
