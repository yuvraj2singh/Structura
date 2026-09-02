import { generateId } from "@/lib/utils";
import { ELEMENT_TYPES } from "@/lib/constants";

/**
 * Base element factory.
 * Every canvas element shares these base properties.
 */
export function createElement(type, props = {}) {
  return {
    id: generateId("el"),
    type,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    locked: false,
    visible: true,
    opacity: 1,
    style: {
      stroke: "#6366f1",
      strokeWidth: 2,
      strokeDash: "solid", // "solid" | "dashed" | "dotted"
      fill: "transparent",
      roughness: 0,
      fontFamily: "Inter",
      fontSize: 16,
      textAlign: "left",
      color: null, // null defaults to adaptive theme color
      ...props.style,
    },
    data: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...props,
  };
}

export function createRectangle(x, y, width, height, style = {}) {
  return createElement(ELEMENT_TYPES.RECTANGLE, {
    x, y, width, height,
    style: { stroke: "#6366f1", strokeWidth: 2, fill: "transparent", ...style },
  });
}

export function createCircle(cx, cy, radius, style = {}) {
  return createElement(ELEMENT_TYPES.CIRCLE, {
    x: cx - radius,
    y: cy - radius,
    width: radius * 2,
    height: radius * 2,
    style: { stroke: "#6366f1", strokeWidth: 2, fill: "transparent", ...style },
  });
}

export function createLine(x1, y1, x2, y2, style = {}) {
  return createElement(ELEMENT_TYPES.LINE, {
    x: x1, y: y1,
    data: { x2, y2 },
    width: Math.abs(x2 - x1) || 1,
    height: Math.abs(y2 - y1) || 1,
    style: { stroke: "#6b7280", strokeWidth: 2, ...style },
  });
}

export function createArrow(x1, y1, x2, y2, style = {}) {
  return createElement(ELEMENT_TYPES.ARROW, {
    x: x1, y: y1,
    data: { x2, y2, arrowHead: "end" },
    width: Math.abs(x2 - x1) || 1,
    height: Math.abs(y2 - y1) || 1,
    style: { stroke: "#6b7280", strokeWidth: 2, ...style },
  });
}

export function createText(x, y, text = "Text", style = {}) {
  return createElement(ELEMENT_TYPES.TEXT, {
    x, y, width: 200, height: 40,
    data: { text, editing: false },
    style: { fontSize: 18, fontWeight: "500", ...style },
  });
}

export function createFreehand(points = [], style = {}) {
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  return createElement(ELEMENT_TYPES.FREEHAND, {
    x: minX, y: minY,
    width: Math.max(...xs) - minX || 1,
    height: Math.max(...ys) - minY || 1,
    data: { points },
    style: { stroke: "#6366f1", strokeWidth: 2, ...style },
  });
}

/** Hit-test: is point (px,py) inside element bounding box? */
export function hitTest(el, px, py, padding = 6) {
  if (el.type === ELEMENT_TYPES.LINE || el.type === ELEMENT_TYPES.ARROW) {
    return hitTestLine(el, px, py, padding + 4);
  }
  return (
    px >= el.x - padding &&
    px <= el.x + el.width + padding &&
    py >= el.y - padding &&
    py <= el.y + el.height + padding
  );
}

function hitTestLine(el, px, py, thresh) {
  const { x2 = el.x + el.width, y2 = el.y + el.height } = el.data || {};
  const dx = x2 - el.x, dy = y2 - el.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - el.x, py - el.y) < thresh;
  let t = ((px - el.x) * dx + (py - el.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = el.x + t * dx, cy = el.y + t * dy;
  return Math.hypot(px - cx, py - cy) < thresh;
}

/** Returns the resize handles for a selected element */
export function getResizeHandles(el) {
  if (el.type === ELEMENT_TYPES.LINE || el.type === ELEMENT_TYPES.ARROW) {
    const x2 = el.data?.x2 ?? (el.x + el.width);
    const y2 = el.data?.y2 ?? (el.y + el.height);
    return [
      { id: "start", x: el.x, y: el.y, cursor: "crosshair" },
      { id: "end",   x: x2,   y: y2,   cursor: "crosshair" },
    ];
  }

  const { x, y, width: w, height: h } = el;
  return [
    { id: "nw", x: x,         y: y,         cursor: "nw-resize" },
    { id: "n",  x: x + w / 2, y: y,         cursor: "n-resize"  },
    { id: "ne", x: x + w,     y: y,         cursor: "ne-resize" },
    { id: "e",  x: x + w,     y: y + h / 2, cursor: "e-resize"  },
    { id: "se", x: x + w,     y: y + h,     cursor: "se-resize" },
    { id: "s",  x: x + w / 2, y: y + h,     cursor: "s-resize"  },
    { id: "sw", x: x,         y: y + h,     cursor: "sw-resize" },
    { id: "w",  x: x,         y: y + h / 2, cursor: "w-resize"  },
  ];
}

/** Compute updated position/size after a resize drag */
export function applyResize(el, handle, dx, dy) {
  // Lines & arrows endpoint adjustment
  if (el.type === ELEMENT_TYPES.LINE || el.type === ELEMENT_TYPES.ARROW) {
    let x1 = el.x;
    let y1 = el.y;
    let x2 = el.data?.x2 ?? (el.x + el.width);
    let y2 = el.data?.y2 ?? (el.y + el.height);
    if (handle === "start") {
      x1 += dx;
      y1 += dy;
    } else if (handle === "end") {
      x2 += dx;
      y2 += dy;
    }
    return {
      ...el,
      x: x1,
      y: y1,
      width: Math.abs(x2 - x1) || 1,
      height: Math.abs(y2 - y1) || 1,
      data: { ...(el.data || {}), x2, y2 },
    };
  }

  // Text scaling (scales font size with box height/width)
  if (el.type === ELEMENT_TYPES.TEXT) {
    let { x, y, width: w, height: h, style = {} } = el;
    const oldH = Math.max(1, h);
    switch (handle) {
      case "se": w += dx; h += dy; break;
      case "sw": x += dx; w -= dx; h += dy; break;
      case "ne": w += dx; y += dy; h -= dy; break;
      case "nw": x += dx; w -= dx; y += dy; h -= dy; break;
      case "e":  w += dx; break;
      case "w":  x += dx; w -= dx; break;
      case "s":  h += dy; break;
      case "n":  y += dy; h -= dy; break;
    }
    const newW = Math.max(40, w);
    const newH = Math.max(24, h);
    const currentSize = style.fontSize ?? 18;
    const scaleFactor = newH / oldH;
    const newFontSize = Math.max(10, Math.min(160, Math.round(currentSize * scaleFactor)));

    return {
      ...el,
      x,
      y,
      width: newW,
      height: newH,
      style: { ...style, fontSize: newFontSize },
    };
  }

  // Freehand scaling (scales internal points array)
  if (el.type === ELEMENT_TYPES.FREEHAND && el.data?.points?.length) {
    let { x, y, width: w, height: h } = el;
    const oldX = x, oldY = y, oldW = Math.max(1, w), oldH = Math.max(1, h);
    switch (handle) {
      case "se": w += dx; h += dy; break;
      case "sw": x += dx; w -= dx; h += dy; break;
      case "ne": w += dx; y += dy; h -= dy; break;
      case "nw": x += dx; w -= dx; y += dy; h -= dy; break;
      case "e":  w += dx; break;
      case "w":  x += dx; w -= dx; break;
      case "s":  h += dy; break;
      case "n":  y += dy; h -= dy; break;
    }
    const newW = Math.max(8, w);
    const newH = Math.max(8, h);
    const sx = newW / oldW;
    const sy = newH / oldH;
    const scaledPoints = el.data.points.map((p) => ({
      x: x + (p.x - oldX) * sx,
      y: y + (p.y - oldY) * sy,
    }));
    return {
      ...el,
      x,
      y,
      width: newW,
      height: newH,
      data: { ...el.data, points: scaledPoints },
    };
  }

  // Standard box resizing (rectangles, circles, images)
  let { x, y, width: w, height: h } = el;
  switch (handle) {
    case "se": w += dx; h += dy; break;
    case "sw": x += dx; w -= dx; h += dy; break;
    case "ne": w += dx; y += dy; h -= dy; break;
    case "nw": x += dx; w -= dx; y += dy; h -= dy; break;
    case "e":  w += dx; break;
    case "w":  x += dx; w -= dx; break;
    case "s":  h += dy; break;
    case "n":  y += dy; h -= dy; break;
  }
  return { ...el, x, y, width: Math.max(8, w), height: Math.max(8, h) };
}
