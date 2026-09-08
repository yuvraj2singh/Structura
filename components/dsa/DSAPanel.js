"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Binary, Play, Pause, SkipBack, SkipForward,
  Loader2, RotateCcw, Sparkles, Layers, Maximize2, Minimize2,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";
import { parseInput } from "@/lib/dsa/parsers";
import { layoutDSA } from "@/lib/dsa/layout";
import { createElement } from "@/lib/canvas/elements";
import { ELEMENT_TYPES } from "@/lib/constants";
import toast from "react-hot-toast";

// ── Constants ─────────────────────────────────────────
const DSA_STRUCTS = [
  { id: "array",   label: "1D Array",    icon: "▦" },
  { id: "array2d", label: "2D Matrix",   icon: "▩" },
  { id: "list",    label: "Linked List", icon: "⊞→" },
  { id: "stack",   label: "Stack",       icon: "⊟" },
  { id: "queue",   label: "Queue",       icon: "⊡" },
  { id: "tree",    label: "BST / Tree",  icon: "⊕" },
  { id: "heap",    label: "Heap",        icon: "△" },
  { id: "graph",   label: "Graph",       icon: "◎" },
  { id: "string",  label: "String",      icon: "Aa" },
];

const PROGRAMMING_LANGUAGES = [
  { id: "cpp",        name: "C++" },
  { id: "python",     name: "Python" },
  { id: "java",       name: "Java" },
  { id: "javascript", name: "JavaScript" },
  { id: "c",          name: "C" },
  { id: "typescript", name: "TypeScript" },
  { id: "rust",       name: "Rust" },
  { id: "go",         name: "Go" },
  { id: "csharp",     name: "C#" },
];

// Example snippets only shown when the editor is empty
const EXAMPLE_SNIPPETS = [
  {
    label: "Two Sum (C++)",
    language: "cpp",
    code: `#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> mp;
    for (int i = 0; i < nums.size(); i++) {
        int need = target - nums[i];
        if (mp.count(need)) return {mp[need], i};
        mp[nums[i]] = i;
    }
    return {};
}
// nums = {2, 7, 11, 15}  target = 9`,
  },
  {
    label: "Binary Search (Python)",
    language: "python",
    code: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
result = binary_search(arr, 23)`,
  },
  {
    label: "Valid Parentheses (Java)",
    language: "java",
    code: `import java.util.Stack;

public boolean isValid(String s) {
    Stack<Character> stack = new Stack<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '{' || c == '[') {
            stack.push(c);
        } else {
            if (stack.isEmpty()) return false;
            char top = stack.pop();
            if (c == ')' && top != '(') return false;
            if (c == '}' && top != '{') return false;
            if (c == ']' && top != '[') return false;
        }
    }
    return stack.isEmpty();
}
// Input: "{[()]}"`,
  },
  {
    label: "BFS Graph (Python)",
    language: "python",
    code: `from collections import deque

def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nb in graph.get(node, []):
            if nb not in visited:
                visited.add(nb)
                queue.append(nb)
    return order

graph = {1:[2,3], 2:[1,3], 3:[1,2,4], 4:[3]}
bfs(graph, 1)`,
  },
  {
    label: "Bubble Sort (Python)",
    language: "python",
    code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

nums = [64, 34, 25, 12, 22, 11]
bubble_sort(nums)`,
  },
  {
    label: "BST Traversal (Python)",
    language: "python",
    code: `def inorder(root, res=[]):
    if not root:
        return res
    inorder(root.left, res)
    res.append(root.val)
    inorder(root.right, res)
    return res

# Tree: 50 30 70 20 40 60 80`,
  },
];

const STRUCT_TYPE_LABELS = {
  array: "1D Array",
  array2d: "2D Matrix",
  list: "Linked List",
  stack: "Stack",
  queue: "Queue",
  tree: "BST / Tree",
  heap: "Heap",
  graph: "Graph",
  heap: "Heap",
  string: "String",
};

const HIGHLIGHT_COLORS = {
  "#6366f1": "Active",
  "#f59e0b": "Comparing",
  "#10b981": "Found",
  "#ef4444": "Removed",
};

// ── Main Component ─────────────────────────────────────
export default function DSAPanel({ onClose, onBroadcastBatch }) {
  // Panel mode
  const [panelTab, setPanelTab] = useState("code");

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startW: 420 });

  // Manual builder state
  const [selected, setSelected] = useState("array");
  const [manualInput, setManualInput] = useState("");
  const [graphDirected, setGraphDirected] = useState(false);
  const [graphWeighted, setGraphWeighted] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // Code dry-run state
  const [codeLang, setCodeLang] = useState("cpp");
  const [codeText, setCodeText] = useState("");
  const [codeError, setCodeError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [retryable, setRetryable] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [createdEls, setCreatedEls] = useState([]);

  // Stepper state
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const playerRef = useRef(null);
  const initialElementsRef = useRef(new Map());

  const broadcastRef = useRef(onBroadcastBatch);
  useEffect(() => {
    broadcastRef.current = onBroadcastBatch;
  }, [onBroadcastBatch]);

  const addElements = useCanvasStore((s) => s.addElements);
  const highlightElements = useCanvasStore((s) => s.highlightElements);
  const clearHighlights = useCanvasStore((s) => s.clearHighlights);

  // ── Resize Logic ─────────────────────────────────────
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e) => {
      const delta = resizeRef.current.startX - e.clientX;
      const next = Math.min(Math.max(340, resizeRef.current.startW + delta), window.innerWidth - 80);
      setPanelWidth(next);
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // ── Canvas: render structure ───────────────────────
  const renderOnCanvas = useCallback((structType, inputData, options = {}) => {
    const parsed = parseInput(structType, inputData, options);
    const existing = useCanvasStore.getState().elements;
    let originY = 80;
    if (existing.length > 0) {
      const maxY = Math.max(...existing.map((el) => {
        const y2 = el.data?.y2 ?? (el.y + (el.height || 0));
        return Math.max(el.y + (el.height || 0), y2);
      }));
      originY = maxY + 60;
    }
    const raw = layoutDSA(structType, parsed.data, { x: 80, y: options.label ? originY + 28 : originY });
    const gid = `dsa-${structType}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const els = raw.map((el) => ({ ...el, groupId: gid }));
    if (options.label) {
      els.unshift(
        createElement(ELEMENT_TYPES.TEXT, {
          x: 80,
          y: originY,
          width: 320,
          height: 22,
          data: { text: options.label },
          style: { fontSize: 13, fontWeight: "700", color: "#818cf8" },
          groupId: gid,
        })
      );
    }
    addElements(els);
    broadcastRef.current?.(useCanvasStore.getState().elements);
    return els;
  }, [addElements]);

  // ── Manual Visualize ───────────────────────────────
  const handleManualVisualize = () => {
    if (!manualInput.trim()) { setManualError("Enter data first"); return; }
    setManualError("");
    setManualLoading(true);
    try {
      const els = renderOnCanvas(selected, manualInput, {
        directed: graphDirected,
        weighted: graphWeighted,
      });
      initialElementsRef.current = new Map(els.map((e) => [e.id, { ...(e.data || {}) }]));
      setCreatedEls(els);
      setSteps([]);
      setStepIdx(0);
      toast.success(`${STRUCT_TYPE_LABELS[selected] || selected} drawn on canvas`);
    } catch (e) {
      setManualError(e.message || "Invalid input");
    } finally {
      setManualLoading(false);
    }
  };

  // ── AI Code Analysis ───────────────────────────────
  const handleAnalyze = async () => {
    if (!codeText.trim()) { setCodeError("Paste your algorithm code first"); return; }
    setCodeError("");
    setRetryable(false);
    setAnalyzing(true);
    setPlaying(false);
    setSteps([]);
    setStepIdx(0);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/dsa/code-dryrun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeText, language: codeLang }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRetryable(data.retryable === true);
        throw new Error(data.error || "Analysis failed");
      }
      if (!data.structureType || !data.initialInput || !Array.isArray(data.steps) || data.steps.length === 0) {
        throw new Error("AI returned incomplete result — please try again");
      }

      // Draw detected structures on canvas (support multiple structures)
      const structuresToRender = Array.isArray(data.structures) && data.structures.length > 0
        ? data.structures
        : [{ name: data.structureType, type: data.structureType, initialInput: data.initialInput }];

      let allEls = [];
      for (const struct of structuresToRender) {
        if (!struct.type || !struct.initialInput) continue;
        const els = renderOnCanvas(
          struct.type,
          struct.initialInput,
          {
            ...(data.graphOptions || {}),
            label: struct.name || STRUCT_TYPE_LABELS[struct.type] || struct.type,
          }
        );
        allEls = allEls.concat(els);
      }

      initialElementsRef.current = new Map(allEls.map((e) => [e.id, { ...(e.data || {}) }]));
      setCreatedEls(allEls);
      setAnalysisResult(data);
      setSteps(data.steps);
      setStepIdx(0);
      const dsCount = data.dataStructuresUsed?.length || 1;
      toast.success(`Detected: ${data.dataStructuresUsed?.join(" + ") || STRUCT_TYPE_LABELS[data.structureType] || data.structureType}`);
    } catch (e) {
      setCodeError(e.message || "Analysis failed");
      toast.error(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Highlight matching ─────────────────────────────
  const syncHighlight = useCallback((step, els) => {
    if (!step || !els.length) { clearHighlights(); return; }
    const highlights = step.highlights || [];
    if (!highlights.length) { clearHighlights(); return; }

    const ids = [];
    highlights.forEach((hl) => {
      // 1. If hl is an object with r/row and c/col (e.g. { r: 1, c: 2 })
      if (hl && typeof hl === "object" && !Array.isArray(hl)) {
        const r = hl.r ?? hl.row;
        const c = hl.c ?? hl.col;
        if (r !== undefined && c !== undefined) {
          const match = els.find((e) => e.data?.row === Number(r) && e.data?.col === Number(c));
          if (match) { ids.push(match.id); return; }
        }
      }

      // 2. If hl is a coordinate array [r, c]
      if (Array.isArray(hl) && hl.length === 2) {
        const [r, c] = hl;
        const match = els.find((e) => e.data?.row === Number(r) && e.data?.col === Number(c));
        if (match) { ids.push(match.id); return; }
      }

      // 3. If hl is a string coordinate like "[1][2]" or "[1, 2]" or "1,2"
      if (typeof hl === "string") {
        const coordMatch = hl.match(/\[?(\d+)[,\s\]\[]+(\d+)\]?/);
        if (coordMatch) {
          const r = Number(coordMatch[1]);
          const c = Number(coordMatch[2]);
          const match = els.find((e) => e.data?.row === r && e.data?.col === c);
          if (match) { ids.push(match.id); return; }
        }
      }

      // 4. Try 2D index match or flatIndex / 1D index
      const asNum = Number(hl);
      if (!isNaN(asNum)) {
        const byFlat = els.find((e) => e.data?.flatIndex === asNum);
        if (byFlat) { ids.push(byFlat.id); return; }
        const byIdx = els.find((e) => e.data?.index === asNum);
        if (byIdx) { ids.push(byIdx.id); return; }
      }

      // 5. Try exact index string match (e.g., e.data?.index === hl)
      const byIdxStr = els.find((e) => String(e.data?.index) === String(hl));
      if (byIdxStr) { ids.push(byIdxStr.id); return; }

      // 6. Try value / label match
      const byVal = els.find(
        (e) => String(e.data?.value) === String(hl) || String(e.data?.id) === String(hl)
      );
      if (byVal) { ids.push(byVal.id); return; }

      // 7. Positional fallback for elements
      if (!isNaN(asNum) && els[asNum]) {
        ids.push(els[asNum].id);
      }
    });

    if (ids.length) highlightElements(ids, step.highlightColor || "#6366f1");
    else clearHighlights();
  }, [highlightElements, clearHighlights]);

  // ── Sync Element Values based on Step Mutations ────
  const syncStepState = useCallback((targetIdx) => {
    if (!steps.length || !createdEls.length) return;

    // 1. Baseline values from initial snapshot
    const currentValues = new Map();
    createdEls.forEach((el) => {
      const init = initialElementsRef.current.get(el.id);
      if (init && init.value !== undefined) {
        currentValues.set(el.id, init.value);
      } else if (el.data?.value !== undefined) {
        currentValues.set(el.id, el.data.value);
      }
    });

    const findCell = (target, mut) => {
      if (!target && !mut) return null;
      const r = mut?.r ?? (typeof target === "object" && !Array.isArray(target) ? (target?.r ?? target?.row) : undefined);
      const c = mut?.c ?? (typeof target === "object" && !Array.isArray(target) ? (target?.c ?? target?.col) : undefined);
      if (r !== undefined && c !== undefined) {
        const found = createdEls.find((e) => e.data?.row === Number(r) && e.data?.col === Number(c));
        if (found) return found;
      }
      if (Array.isArray(target) && target.length === 2) {
        const found = createdEls.find((e) => e.data?.row === Number(target[0]) && e.data?.col === Number(target[1]));
        if (found) return found;
      }
      if (typeof target === "string") {
        const coordMatch = target.match(/\[?(\d+)[,\s\]\[]+(\d+)\]?/);
        if (coordMatch) {
          const row = Number(coordMatch[1]);
          const col = Number(coordMatch[2]);
          const found = createdEls.find((e) => e.data?.row === row && e.data?.col === col);
          if (found) return found;
        }
        const byIdxStr = createdEls.find((e) => String(e.data?.index) === String(target));
        if (byIdxStr) return byIdxStr;
      }
      const asNum = Number(target);
      if (!isNaN(asNum)) {
        const byFlat = createdEls.find((e) => e.data?.flatIndex === asNum);
        if (byFlat) return byFlat;
        const byIdx = createdEls.find((e) => e.data?.index === asNum);
        if (byIdx) return byIdx;
      }
      return null;
    };

    // 2. Replay all steps up to targetIdx
    for (let i = 0; i <= targetIdx && i < steps.length; i++) {
      const s = steps[i];
      if (!s) continue;

      if (s.dataSnapshot && typeof s.dataSnapshot === "string") {
        const tokens = s.dataSnapshot.trim().replace(/[\[\],]/g, " ").split(/\s+/).filter(Boolean);
        const matrixCells = createdEls.filter((e) => e.data?.flatIndex !== undefined);
        if (tokens.length === matrixCells.length) {
          matrixCells.forEach((cell) => {
            const idx = cell.data.flatIndex;
            if (tokens[idx] !== undefined) {
              currentValues.set(cell.id, tokens[idx]);
            }
          });
        }
      }

      const mutations = Array.isArray(s.mutations) ? s.mutations : [];
      mutations.forEach((m) => {
        if (!m || m.value === undefined) return;
        const target = m.target ?? m.index ?? m.coordinate ?? (s.highlights && s.highlights[0]);
        const cell = findCell(target, m);
        if (cell) {
          currentValues.set(cell.id, m.value);
        }
      });
    }

    // 3. Apply updates if any element value changed
    const currentElements = useCanvasStore.getState().elements;
    const updates = [];
    currentValues.forEach((newVal, id) => {
      const existing = currentElements.find((e) => e.id === id);
      if (existing && String(existing.data?.value) !== String(newVal)) {
        updates.push({
          id,
          data: { ...existing.data, value: newVal },
        });
      }
    });

    if (updates.length > 0) {
      useCanvasStore.getState().updateElements(updates);
      broadcastRef.current?.(useCanvasStore.getState().elements);
    }
  }, [steps, createdEls]);

  useEffect(() => {
    if (steps.length && createdEls.length) {
      syncStepState(stepIdx);
      syncHighlight(steps[stepIdx], createdEls);
    }
  }, [stepIdx, steps, createdEls, syncStepState, syncHighlight]);

  // Clear highlights only on component unmount
  useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, [clearHighlights]);

  // ── Auto-play ──────────────────────────────────────
  useEffect(() => {
    clearInterval(playerRef.current);
    if (!playing || !steps.length) return;
    const interval = Math.max(300, 1400 / playSpeed);
    playerRef.current = setInterval(() => {
      setStepIdx((p) => {
        if (p >= steps.length - 1) { setPlaying(false); return p; }
        return p + 1;
      });
    }, interval);
    return () => clearInterval(playerRef.current);
  }, [playing, steps.length, playSpeed]);

  const curStep = steps[stepIdx];
  const codeLines = codeText.split("\n");

  return (
    <div
      id="dsa-panel"
      style={{
        position: "absolute",
        top: 0, right: 0, bottom: 0,
        width: panelWidth,
        background: "var(--bg-elevated)",
        borderLeft: "1px solid var(--border-color)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-4px 0 28px rgba(0,0,0,0.18)",
        boxSizing: "border-box",
      }}
    >
      {/* ── Resize Handle ── */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          resizeRef.current = { startX: e.clientX, startW: panelWidth };
          setIsResizing(true);
        }}
        id="dsa-resize-handle"
        style={{
          position: "absolute", top: 0, left: -4, bottom: 0,
          width: 8, cursor: "col-resize", zIndex: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onMouseEnter={(e) => { e.currentTarget.querySelector(".handle-bar").style.background = "var(--accent)"; }}
        onMouseLeave={(e) => { if (!isResizing) e.currentTarget.querySelector(".handle-bar").style.background = "var(--border-color)"; }}
      >
        <div className="handle-bar" style={{ width: 3, height: 32, background: isResizing ? "var(--accent)" : "var(--border-color)", borderRadius: 3, transition: "background 150ms" }} />
      </div>

      {/* ── Header ── */}
      <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Binary size={14} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: "0.93rem", flex: 1 }}>DSA Visualizer</span>
        <button
          title={panelWidth > 560 ? "Compact view" : "Wide view"}
          onClick={() => setPanelWidth((w) => w > 560 ? 420 : 680)}
          style={ghostBtn}
        >
          {panelWidth > 560 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <button id="dsa-close" onClick={onClose} style={ghostBtn} aria-label="Close"><X size={14} /></button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--border-color)", flexShrink: 0, background: "var(--bg-secondary)" }}>
        {[
          { id: "code", icon: <Sparkles size={12} />, label: "AI Code Dry Run" },
          { id: "manual", icon: <Layers size={12} />, label: "Manual Builder" },
        ].map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            onClick={() => { setPanelTab(t.id); setCodeError(""); setManualError(""); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "6px 8px", borderRadius: 6, fontSize: "0.78rem",
              fontWeight: panelTab === t.id ? 700 : 500, border: "none", cursor: "pointer",
              background: panelTab === t.id ? "var(--bg-elevated)" : "transparent",
              color: panelTab === t.id ? "var(--accent)" : "var(--text-secondary)",
              boxShadow: panelTab === t.id ? "var(--shadow-sm)" : "none",
              transition: "all 120ms",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>

        {/* ═══ TAB 1: AI CODE DRY RUN ═══════════════════ */}
        {panelTab === "code" && (
          <div>
            {/* Language selector row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", flexShrink: 0 }}>Language:</span>
              <select
                id="code-lang-select"
                value={codeLang}
                onChange={(e) => setCodeLang(e.target.value)}
                style={{
                  padding: "4px 8px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600,
                  background: "var(--bg-secondary)", color: "var(--accent)",
                  border: "1px solid var(--border-color)", outline: "none", cursor: "pointer",
                }}
              >
                {PROGRAMMING_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", marginLeft: "auto" }}>Max 15 elements</span>
            </div>

            {/* Example snippet pills */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", marginBottom: 4 }}>Examples (click to load):</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {EXAMPLE_SNIPPETS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => {
                      setCodeLang(s.language);
                      setCodeText(s.code);
                      setCodeError("");
                      setAnalysisResult(null);
                      setSteps([]);
                    }}
                    style={{
                      ...badgeBtn,
                      background: codeText === s.code ? "var(--accent-muted)" : "var(--bg-secondary)",
                      borderColor: codeText === s.code ? "var(--accent)" : "var(--border-color)",
                      color: codeText === s.code ? "var(--accent)" : "var(--text-secondary)",
                      fontWeight: codeText === s.code ? 600 : 400,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hint text */}
            <div style={{ marginBottom: 6, padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text-primary)" }}>Write any algorithm</strong> — the AI automatically detects which data structure your code uses (array, graph, tree, stack, queue, etc.) and builds the correct visualization.
              </div>
            </div>

            {/* Code textarea */}
            <div style={{ marginBottom: 8 }}>
              <textarea
                id="code-dryrun-input"
                value={codeText}
                onChange={(e) => { setCodeText(e.target.value); setCodeError(""); }}
                placeholder={`// Paste your algorithm code here in ${PROGRAMMING_LANGUAGES.find(l => l.id === codeLang)?.name || codeLang}.\n// Works with any custom or standard algorithm.`}
                rows={10}
                spellCheck={false}
                style={{
                  ...codeTextarea,
                  borderColor: codeError ? "var(--danger)" : "var(--border-color)",
                }}
              />
            </div>

            {codeError && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)", marginBottom: 8 }}>
                <AlertCircle size={13} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: "0.78rem", color: "var(--danger)", lineHeight: 1.4 }}>
                  {codeError}
                  {retryable && <button onClick={handleAnalyze} style={{ marginLeft: 6, fontWeight: 700, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.78rem", textDecoration: "underline" }}>Retry</button>}
                </div>
              </div>
            )}

            {/* Analyze button */}
            <button
              id="analyze-btn"
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 7, padding: "10px", borderRadius: 10, marginBottom: 14,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white", border: "none", cursor: analyzing ? "not-allowed" : "pointer",
                fontSize: "0.875rem", fontWeight: 600, opacity: analyzing ? 0.75 : 1,
                boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
                transition: "all 150ms",
              }}
            >
              {analyzing
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Analyzing & Building Visualization…</>
                : <><Sparkles size={14} /> Detect DS & Run Dry Run</>
              }
            </button>

            {/* ── Results ── */}
            {analysisResult && steps.length > 0 && (
              <div>
                {/* Summary row */}
                <div style={{ marginBottom: 10, padding: "10px", background: "var(--bg-secondary)", borderRadius: 9, border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {analysisResult.algorithmName}
                    </span>
                    {analysisResult.complexity?.time && (
                      <span style={{ fontSize: "0.68rem", padding: "2px 7px", borderRadius: 20, background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontWeight: 600, border: "1px solid var(--border-color)", flexShrink: 0 }}>
                        {analysisResult.complexity.time}
                      </span>
                    )}
                  </div>

                  {/* Detected Data Structures Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    {(analysisResult.dataStructuresUsed && analysisResult.dataStructuresUsed.length > 0
                      ? analysisResult.dataStructuresUsed
                      : [STRUCT_TYPE_LABELS[analysisResult.structureType] || analysisResult.structureType]
                    ).map((ds, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: idx === 0 ? "var(--accent-muted)" : "rgba(99, 102, 241, 0.08)",
                          color: "var(--accent)",
                          fontWeight: 600,
                          border: "1px solid rgba(99, 102, 241, 0.2)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span style={{ opacity: 0.6, fontSize: "0.65rem" }}>◆</span> {ds}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", lineHeight: 1.45 }}>
                    {analysisResult.summary}
                  </div>
                </div>

                {/* Code viewer with active line highlight */}
                <div style={{ marginBottom: 10, borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden" }}>
                  <div style={{ padding: "4px 10px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
                    <span>Code Trace</span>
                    <span>{PROGRAMMING_LANGUAGES.find(l => l.id === codeLang)?.name}</span>
                  </div>
                  <div style={{ maxHeight: 140, overflowY: "auto", background: "var(--bg-primary)", fontFamily: "var(--font-mono)", fontSize: "0.73rem" }}>
                    {codeLines.map((ln, i) => {
                      const lineNum = i + 1;
                      const active = curStep?.line === lineNum;
                      return (
                        <div
                          key={lineNum}
                          style={{
                            display: "flex",
                            padding: "1px 8px",
                            background: active ? "rgba(99,102,241,0.2)" : "transparent",
                            borderLeft: `3px solid ${active ? "var(--accent)" : "transparent"}`,
                            color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          <span style={{ width: 22, opacity: 0.5, userSelect: "none", flexShrink: 0 }}>{lineNum}</span>
                          <span style={{ whiteSpace: "pre", color: active ? "var(--accent)" : "inherit" }}>{ln || " "}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stepper card */}
                <div style={{ background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border-color)", padding: "10px", marginBottom: 10 }}>
                  {/* Step info */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Step {stepIdx + 1} / {steps.length}
                    </span>
                    {curStep?.action && (
                      <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: 4, background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)" }}>
                        {curStep.action}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.45 }}>
                    {curStep?.description}
                  </div>

                  {/* Variables */}
                  {curStep?.variables && Object.keys(curStep.variables).length > 0 && (
                    <div style={{ background: "var(--bg-primary)", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border-subtle)", marginBottom: 10 }}>
                      <div style={{ fontSize: "0.63rem", fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                        Live Variables
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                        {Object.entries(curStep.variables).map(([k, v]) => (
                          <span key={k}>
                            <span style={{ color: "var(--accent)" }}>{k}</span>
                            {" = "}
                            <strong style={{ color: "var(--text-primary)" }}>{String(v)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button id="dr-reset" onClick={() => { setStepIdx(0); setPlaying(false); }} style={ctrlBtn} title="Reset"><RotateCcw size={13} /></button>
                      <button id="dr-back" onClick={() => setStepIdx((i) => Math.max(0, i - 1))} disabled={stepIdx === 0} style={{ ...ctrlBtn, opacity: stepIdx === 0 ? 0.4 : 1 }} title="Back"><SkipBack size={13} /></button>
                      <button
                        id="dr-play"
                        onClick={() => setPlaying((p) => !p)}
                        style={{ ...ctrlBtn, background: "var(--accent)", color: "white", borderRadius: "50%", width: 34, height: 34 }}
                      >
                        {playing ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button id="dr-next" onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))} disabled={stepIdx === steps.length - 1} style={{ ...ctrlBtn, opacity: stepIdx === steps.length - 1 ? 0.4 : 1 }} title="Next"><SkipForward size={13} /></button>
                    </div>
                    <div style={{ display: "flex", gap: 2, background: "var(--bg-primary)", padding: 2, borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
                      {[0.5, 1, 2].map((s) => (
                        <button key={s} onClick={() => setPlaySpeed(s)} style={{ padding: "2px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: playSpeed === s ? 700 : 500, border: "none", cursor: "pointer", background: playSpeed === s ? "var(--accent)" : "transparent", color: playSpeed === s ? "white" : "var(--text-tertiary)" }}>
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step Scrubber Slider */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-tertiary)", marginBottom: 2 }}>
                      <span>Start</span>
                      <span>Scrub Steps</span>
                      <span>End</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={steps.length - 1}
                      value={stepIdx}
                      onChange={(e) => {
                        setPlaying(false);
                        setStepIdx(Number(e.target.value));
                      }}
                      style={{
                        width: "100%",
                        height: 4,
                        accentColor: "var(--accent)",
                        cursor: "pointer",
                      }}
                      title={`Scrub to step ${stepIdx + 1} of ${steps.length}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 2: MANUAL BUILDER ═══════════════════ */}
        {panelTab === "manual" && (
          <div>
            {/* Structure picker */}
            <div style={sLabel}>Choose Structure</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 14 }}>
              {DSA_STRUCTS.map((s) => (
                <button
                  key={s.id}
                  id={`dsa-struct-${s.id}`}
                  onClick={() => { setSelected(s.id); setManualInput(""); setManualError(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 9px", borderRadius: 8,
                    border: selected === s.id ? "1px solid var(--accent-border)" : "1px solid var(--border-color)",
                    background: selected === s.id ? "var(--accent-muted)" : "var(--bg-secondary)",
                    color: selected === s.id ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: selected === s.id ? 600 : 400,
                    fontSize: "0.8rem", cursor: "pointer", transition: "all 100ms",
                  }}
                >
                  <span style={{ fontSize: "0.9rem" }}>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>

            {/* Graph options */}
            {selected === "graph" && (
              <div style={{ marginBottom: 14, padding: "10px", background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border-color)" }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase" }}>Direction</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {[{ val: false, label: "Undirected (—)" }, { val: true, label: "Directed (→)" }].map(({ val, label }) => (
                      <button key={String(val)} type="button" onClick={() => setGraphDirected(val)} style={{ ...toggleBtn, border: graphDirected === val ? "1px solid var(--accent-border)" : "1px solid var(--border-color)", background: graphDirected === val ? "var(--accent-muted)" : "var(--bg-primary)", color: graphDirected === val ? "var(--accent)" : "var(--text-secondary)", fontWeight: graphDirected === val ? 600 : 400 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase" }}>Weights</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {[{ val: false, label: "Unweighted" }, { val: true, label: "Weighted" }].map(({ val, label }) => (
                      <button key={String(val)} type="button" onClick={() => setGraphWeighted(val)} style={{ ...toggleBtn, border: graphWeighted === val ? "1px solid var(--accent-border)" : "1px solid var(--border-color)", background: graphWeighted === val ? "var(--accent-muted)" : "var(--bg-primary)", color: graphWeighted === val ? "var(--accent)" : "var(--text-secondary)", fontWeight: graphWeighted === val ? 600 : 400 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Data input */}
            <div style={{ ...sLabel, marginBottom: 5 }}>Input Data</div>
            <textarea
              id="dsa-manual-input"
              value={manualInput}
              onChange={(e) => { setManualInput(e.target.value); setManualError(""); }}
              placeholder={
                selected === "array" ? "1 2 3 4 5  or  [1,2,3,4,5]"
                  : selected === "graph" ? "1 2\n2 3\n3 4\n4 1\n1 3"
                  : selected === "tree" ? "50 30 70 20 40 60 80"
                  : selected === "stack" ? "1 2 3 4  (top = last)"
                  : selected === "queue" ? "1 2 3 4  (front = first)"
                  : selected === "list" ? "1 2 3 4 5"
                  : selected === "array2d" ? "[[1,2,3],[4,5,6]]"
                  : selected === "heap" ? "90 80 70 60 50"
                  : "Enter data"
              }
              rows={selected === "graph" ? 5 : 3}
              style={{
                ...codeTextarea,
                borderColor: manualError ? "var(--danger)" : "var(--border-color)",
                marginBottom: 6,
              }}
            />
            {manualError && <p style={{ fontSize: "0.75rem", color: "var(--danger)", margin: "0 0 8px" }}>{manualError}</p>}

            <button
              id="manual-visualize-btn"
              onClick={handleManualVisualize}
              disabled={manualLoading}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, padding: "9px", borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white", border: "none", cursor: manualLoading ? "not-allowed" : "pointer",
                fontSize: "0.875rem", fontWeight: 600, opacity: manualLoading ? 0.7 : 1,
                transition: "all 150ms",
              }}
            >
              {manualLoading
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Rendering…</>
                : <><Binary size={14} /> Visualize on Canvas</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Style constants ────────────────────────────────────
const sLabel = { fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 };
const ghostBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", borderRadius: 6 };
const ctrlBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 6, cursor: "pointer", color: "var(--text-secondary)" };
const badgeBtn = { padding: "3px 8px", borderRadius: 6, fontSize: "0.72rem", border: "1px solid var(--border-color)", cursor: "pointer", transition: "all 120ms" };
const toggleBtn = { padding: "5px 8px", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer", transition: "all 100ms", border: "1px solid var(--border-color)" };
const codeTextarea = {
  width: "100%", resize: "vertical", background: "var(--bg-secondary)",
  color: "var(--text-primary)", fontFamily: "var(--font-mono)",
  border: "1px solid var(--border-color)",
  borderRadius: 8, padding: "9px 10px", fontSize: "0.78rem", outline: "none",
  transition: "border-color 150ms", lineHeight: 1.5,
  tabSize: 2,
};
