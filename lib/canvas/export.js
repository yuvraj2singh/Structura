/**
 * Canvas Export Engine
 * Supports: PNG (via HTML Canvas), SVG (vector), JSON (raw data)
 */
import useCanvasStore from "@/store/useCanvasStore";
import { ELEMENT_TYPES } from "@/lib/constants";

/* ── Helper: find bounding box of all elements ── */
function getBoundingBox(elements) {
  if (!elements.length) return { x: 0, y: 0, width: 800, height: 600 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width  || 60));
    maxY = Math.max(maxY, el.y + (el.height || 60));
  }
  const PAD = 40;
  return {
    x: minX - PAD, y: minY - PAD,
    width:  maxX - minX + PAD * 2,
    height: maxY - minY + PAD * 2,
  };
}

/* ── Draw one element onto a 2D canvas context ── */
function drawElement(ctx, el, offsetX, offsetY) {
  const x = el.x - offsetX;
  const y = el.y - offsetY;
  const w = el.width  || 60;
  const h = el.height || 60;
  const s = el.style  || {};

  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;
  ctx.strokeStyle = s.stroke      || "#6366f1";
  ctx.lineWidth   = s.strokeWidth || 2;
  ctx.fillStyle   = s.fill        || "transparent";

  switch (el.type) {
    case ELEMENT_TYPES.RECTANGLE:
    case "array-cell":
    case "stack-node":
    case "queue-node":
    case "linked-list-node": {
      const r = s.borderRadius || 6;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      if (s.fill && s.fill !== "transparent") ctx.fill();
      ctx.stroke();
      // Label
      if (el.data?.value !== undefined) {
        ctx.fillStyle = s.color || "#fafafa";
        ctx.font = `${s.fontWeight || 600} ${s.fontSize || 14}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(el.data.value), x + w / 2, y + h / 2);
      }
      break;
    }

    case ELEMENT_TYPES.CIRCLE:
    case "tree-node":
    case "graph-node": {
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      if (s.fill && s.fill !== "transparent") ctx.fill();
      ctx.stroke();
      if (el.data?.value !== undefined) {
        ctx.fillStyle = s.color || "#fafafa";
        ctx.font = `700 ${s.fontSize || 13}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(el.data.value), x + w / 2, y + h / 2);
      }
      break;
    }

    case ELEMENT_TYPES.LINE:
    case ELEMENT_TYPES.ARROW:
    case "graph-edge": {
      const x2 = (el.data?.x2 ?? x + w) - offsetX;
      const y2 = (el.data?.y2 ?? y + h) - offsetY;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // Arrowhead
      if (el.type !== ELEMENT_TYPES.LINE) {
        const angle = Math.atan2(y2 - y, x2 - x);
        const al = 10;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - al * Math.cos(angle - 0.4), y2 - al * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - al * Math.cos(angle + 0.4), y2 - al * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = s.stroke || "#6366f1";
        ctx.fill();
      }
      break;
    }

    case ELEMENT_TYPES.TEXT: {
      ctx.fillStyle = s.color || "#fafafa";
      ctx.font = `${s.fontWeight || 400} ${s.fontSize || 14}px Inter, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const text = el.data?.text || "";
      const lines = text.split("\n");
      lines.forEach((line, i) => ctx.fillText(line, x, y + i * (s.fontSize || 14) * 1.4));
      break;
    }

    case ELEMENT_TYPES.FREEHAND: {
      const pts = el.data?.points || [];
      if (pts.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(pts[0].x - offsetX, pts[0].y - offsetY);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x - offsetX, pts[i].y - offsetY);
      ctx.stroke();
      break;
    }

    default: {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      if (s.fill && s.fill !== "transparent") ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ── Export as PNG ──────────────────────────────── */
export async function exportAsPNG({ scale = 2, bg = "#0e0e11" } = {}) {
  const { elements } = useCanvasStore.getState();
  if (!elements.length) throw new Error("Canvas is empty — nothing to export");

  const bb = getBoundingBox(elements);
  const canvas = document.createElement("canvas");
  canvas.width  = bb.width  * scale;
  canvas.height = bb.height * scale;

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, bb.width, bb.height);

  // Sort by zIndex
  const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  for (const el of sorted) drawElement(ctx, el, bb.x, bb.y);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `structura-export-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve();
    }, "image/png");
  });
}

/* ── Export as JSON ─────────────────────────────── */
export function exportAsJSON(title = "untitled") {
  const { elements } = useCanvasStore.getState();
  if (!elements.length) throw new Error("Canvas is empty");

  const payload = JSON.stringify({ version: 1, title, elements, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ── Import from JSON ───────────────────────────── */
export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.elements)) throw new Error("Invalid Structura JSON file");
        resolve(data.elements);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}

/* ── Export as SVG ──────────────────────────────── */
export function exportAsSVG(title = "structura") {
  const { elements } = useCanvasStore.getState();
  if (!elements.length) throw new Error("Canvas is empty");

  const bb = getBoundingBox(elements);
  const sorted = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  const svgEls = sorted.map((el) => {
    const x = el.x - bb.x, y = el.y - bb.y;
    const w = el.width || 60, h = el.height || 60;
    const s = el.style || {};
    const stroke = s.stroke || "#6366f1";
    const fill   = (s.fill === "transparent" || !s.fill) ? "none" : s.fill;
    const sw     = s.strokeWidth || 2;

    switch (el.type) {
      case ELEMENT_TYPES.RECTANGLE:
      case "array-cell":
      case "stack-node":
      case "queue-node":
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${
          el.data?.value !== undefined ? `<text x="${x + w/2}" y="${y + h/2 + 5}" text-anchor="middle" fill="#fafafa" font-size="13" font-family="Inter">${el.data.value}</text>` : ""}`;

      case ELEMENT_TYPES.CIRCLE:
      case "tree-node":
      case "graph-node":
        return `<circle cx="${x + w/2}" cy="${y + h/2}" r="${Math.min(w,h)/2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${
          el.data?.value !== undefined ? `<text x="${x + w/2}" y="${y + h/2 + 5}" text-anchor="middle" fill="#fafafa" font-size="13" font-family="Inter">${el.data.value}</text>` : ""}`;

      case ELEMENT_TYPES.ARROW:
      case ELEMENT_TYPES.LINE: {
        const x2 = (el.data?.x2 ?? x + w) - bb.x;
        const y2 = (el.data?.y2 ?? y + h) - bb.y;
        return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" marker-end="url(#arrow)"/>`;
      }

      case ELEMENT_TYPES.TEXT:
        return `<text x="${x}" y="${y + 14}" fill="${s.color || "#fafafa"}" font-size="${s.fontSize || 14}" font-family="Inter">${(el.data?.text || "").replace(/</g, "&lt;")}</text>`;

      default:
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
  }).join("\n  ");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bb.width}" height="${bb.height}" viewBox="0 0 ${bb.width} ${bb.height}">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#0e0e11"/>
  ${svgEls}
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
