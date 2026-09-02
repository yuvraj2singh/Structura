/**
 * AI Response Parser
 * Validates and normalises raw LLM output into safe canvas elements.
 */
import { generateId } from "@/lib/utils";

const VALID_TYPES = new Set([
  "rectangle", "circle", "line", "arrow", "text", "freehand",
  "tree-node", "graph-node", "graph-edge",
  "array-cell", "linked-list-node", "stack-node", "queue-node",
]);

const VALID_STYLE_KEYS = new Set([
  "stroke", "strokeWidth", "fill", "fillOpacity", "borderRadius",
  "fontSize", "fontFamily", "fontWeight", "color", "textAlign", "lineDash",
  "_highlight",
]);

/** Strip markdown code fences if LLM accidentally wraps in them */
function stripCodeFences(raw) {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/** Extract the JSON array even if wrapped in extra text */
function extractJSONArray(raw) {
  const start = raw.indexOf("[");
  const end   = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON array found in AI response");
  }
  return raw.slice(start, end + 1);
}

/** Sanitize a single element — fill defaults, drop unknown keys */
function sanitizeElement(el, index) {
  if (!el || typeof el !== "object") throw new Error(`Element ${index} is not an object`);

  const type = String(el.type ?? "rectangle");
  if (!VALID_TYPES.has(type)) {
    console.warn(`[AI] Unknown element type "${type}", defaulting to rectangle`);
  }

  // Numeric fields with defaults
  const x      = Number.isFinite(el.x)      ? el.x      : 80 + index * 20;
  const y      = Number.isFinite(el.y)      ? el.y      : 80 + index * 20;
  const width  = Number.isFinite(el.width)  ? Math.max(8, el.width)  : 100;
  const height = Number.isFinite(el.height) ? Math.max(8, el.height) : 60;

  // Style — only allow known keys
  const rawStyle = el.style && typeof el.style === "object" ? el.style : {};
  const style = {};
  for (const [k, v] of Object.entries(rawStyle)) {
    if (VALID_STYLE_KEYS.has(k)) style[k] = v;
  }
  // Defaults
  if (!style.stroke)      style.stroke      = "#6366f1";
  if (!style.strokeWidth) style.strokeWidth = 2;
  if (!style.fill)        style.fill        = "transparent";

  // Data — allow anything (user-facing values)
  const data = el.data && typeof el.data === "object" ? el.data : {};

  return {
    id:        el.id ? String(el.id) : generateId("ai"),
    type:      VALID_TYPES.has(type) ? type : "rectangle",
    x, y, width, height,
    rotation:  Number.isFinite(el.rotation) ? el.rotation : 0,
    opacity:   Number.isFinite(el.opacity)  ? Math.max(0, Math.min(1, el.opacity)) : 1,
    visible:   true,
    locked:    false,
    zIndex:    index,
    style,
    data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Parse raw AI text response into an array of validated canvas elements.
 * @param {string} rawText - The raw string from the LLM
 * @returns {{ elements: object[], warnings: string[] }}
 */
export function parseAIResponse(rawText) {
  const warnings = [];
  let elements = [];

  try {
    const cleaned  = stripCodeFences(rawText);
    const jsonStr  = extractJSONArray(cleaned);
    const parsed   = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      throw new Error("AI response is not a JSON array");
    }

    elements = parsed
      .slice(0, 80) // max 80 elements
      .map((el, i) => {
        try {
          return sanitizeElement(el, i);
        } catch (err) {
          warnings.push(`Skipped element ${i}: ${err.message}`);
          return null;
        }
      })
      .filter(Boolean);

    if (!elements.length) {
      throw new Error("AI returned no valid elements");
    }
  } catch (err) {
    throw new Error(`Failed to parse AI response: ${err.message}`);
  }

  return { elements, warnings };
}
