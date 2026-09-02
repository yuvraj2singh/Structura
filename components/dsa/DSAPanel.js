"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Binary, Play, Pause, SkipBack, SkipForward,
  ChevronRight, Loader2, RotateCcw, Search,
} from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";
import { parseInput } from "@/lib/dsa/parsers";
import { layoutDSA } from "@/lib/dsa/layout";
import { binarySearchSteps, bubbleSortSteps, linearSearchSteps } from "@/lib/dsa/algorithms";

const DSA_STRUCTS = [
  { id: "array",   label: "1D Array",     icon: "▦" },
  { id: "array2d", label: "2D Matrix",    icon: "▩" },
  { id: "list",    label: "Linked List",  icon: "⊞→" },
  { id: "stack",   label: "Stack",        icon: "⊟" },
  { id: "queue",   label: "Queue",        icon: "⊡" },
  { id: "tree",    label: "BST / Tree",   icon: "⊕" },
  { id: "heap",    label: "Heap",         icon: "△" },
  { id: "graph",   label: "Graph",        icon: "◎" },
  { id: "string",  label: "String",       icon: "Aa" },
];

const PLACEHOLDERS = {
  array:   "1 2 3 4 5  or  [1,2,3,4,5]",
  array2d: "[[1,2,3],[4,5,6],[7,8,9]]",
  list:    "1 2 3 4  or  1->2->3->4",
  stack:   "1 2 3 4  (top = last)",
  queue:   "1 2 3 4  (front = first)",
  tree:    "50 30 70 20 40 60 80",
  heap:    "90 80 70 60 50",
  graph:   "A-B\nA-C\nB-D:5\nC-D:3",
  string:  "HELLO",
};

const ALGORITHMS_FOR = {
  array:  ["Binary Search", "Linear Search", "Bubble Sort"],
  list:   ["Linear Search"],
  tree:   ["BST Search", "BST Insert"],
  heap:   [],
  graph:  [],
  stack:  [],
  queue:  [],
  string: ["Linear Search"],
  array2d:[], 
};

export default function DSAPanel({ onClose, onBroadcastBatch }) {
  const [selected, setSelected] = useState("array");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [visualized, setVisualized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Algorithm dry-run
  const [algoMode, setAlgoMode] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState("");
  const [algoInput, setAlgoInput] = useState(""); // e.g. target value
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef(null);

  const { addElements, highlightElements, clearHighlights, elements } = useCanvasStore();

  /* ── Visualize structure ─────────────────────── */
  const handleVisualize = () => {
    if (!input.trim()) { setError("Enter some data first"); return; }
    setError("");
    setLoading(true);

    try {
      const parsed = parseInput(selected, input);

      // Find free space below all existing elements so the new structure
      // doesn't overlap anything already on the canvas
      const existing = useCanvasStore.getState().elements;
      let originY = 80;
      if (existing.length > 0) {
        const maxBottom = Math.max(
          ...existing.map((el) => {
            const y2 = el.data?.y2 ?? (el.y + (el.height || 0));
            return Math.max(el.y + (el.height || 0), y2);
          })
        );
        originY = maxBottom + 60; // 60px gap below existing content
      }

      const rawEls = layoutDSA(selected, parsed.data, { x: 80, y: originY });

      // Stamp every element with a shared groupId so clicking any part
      // of this structure selects and moves the whole thing together
      const dsaGroupId = `dsa-${selected}-${Date.now()}`;
      const canvasEls = rawEls.map((el) => ({ ...el, groupId: dsaGroupId }));

      // Append — don't clear existing elements
      addElements(canvasEls);

      // Broadcast the full updated canvas to collaborators
      onBroadcastBatch?.(useCanvasStore.getState().elements);

      setVisualized(true);
      setAlgoMode(false);
      setSteps([]);
      setStepIdx(0);
    } catch (e) {
      setError(e.message || "Invalid input");
    } finally {
      setLoading(false);
    }
  };

  /* ── Run algorithm ───────────────────────────── */
  const handleRunAlgo = () => {
    if (!algoInput.trim() && selectedAlgo !== "Bubble Sort") {
      setError("Enter a target value for the algorithm");
      return;
    }
    setError("");

    try {
      const values = input.trim()
        .replace(/[\[\]()]/g, "")
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map(Number);

      let newSteps = [];
      const target = Number(algoInput);

      if (selectedAlgo === "Binary Search") {
        newSteps = binarySearchSteps([...values].sort((a, b) => a - b), target);
      } else if (selectedAlgo === "Linear Search") {
        newSteps = linearSearchSteps(values, target);
      } else if (selectedAlgo === "Bubble Sort") {
        newSteps = bubbleSortSteps(values);
      }

      setSteps(newSteps);
      setStepIdx(0);
      setAlgoMode(true);
    } catch (e) {
      setError(e.message || "Could not run algorithm");
    }
  };

  /* ── Apply highlights for current step ────────── */
  useEffect(() => {
    if (!algoMode || !steps.length) return;
    const step = steps[stepIdx];
    if (step?.highlights?.length) {
      highlightElements(
        elements.slice(0, step.highlights.length).map((el) => el.id),
        step.found ? "#10b981" : step.notFound ? "#ef4444" : "#f59e0b"
      );
    } else {
      clearHighlights();
    }
    // Broadcast updated highlight state to collaborators
    // Small delay to let the store update first
    setTimeout(() => {
      const latest = useCanvasStore.getState().elements;
      onBroadcastBatch?.(latest);
    }, 0);
  }, [stepIdx, algoMode, steps]);

  /* ── Auto-play ──────────────────────────────── */
  useEffect(() => {
    if (!playing) { clearInterval(playRef.current); return; }
    playRef.current = setInterval(() => {
      setStepIdx((i) => {
        if (i >= steps.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 900);
    return () => clearInterval(playRef.current);
  }, [playing, steps.length]);

  const algos = ALGORITHMS_FOR[selected] ?? [];

  return (
    <div
      id="dsa-panel"
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 280,
        background: "var(--bg-elevated)",
        borderLeft: "1px solid var(--border-color)",
        zIndex: 30, display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Binary size={14} style={{ color: "white" }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", flex: 1 }}>DSA Lab</span>
        <button onClick={onClose} id="dsa-close" style={ghostBtn} aria-label="Close"><X size={14} /></button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>

        {/* Structure selector */}
        <div style={sLabel}>Structure</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 14 }}>
          {DSA_STRUCTS.map((s) => (
            <button
              key={s.id}
              id={`dsa-struct-${s.id}`}
              onClick={() => { setSelected(s.id); setInput(""); setError(""); setVisualized(false); setAlgoMode(false); setSteps([]); }}
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
              <span style={{ fontSize: "0.9rem" }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={sLabel}>Input Data</div>
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          placeholder={PLACEHOLDERS[selected]}
          rows={3}
          id="dsa-input"
          style={textareaStyle(error)}
          onFocus={(e) => { if (!error) e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { if (!error) e.target.style.borderColor = "var(--border-color)"; }}
        />
        {error && <p style={{ fontSize: "0.75rem", color: "var(--danger)", margin: "4px 0 0" }}>{error}</p>}

        <button
          onClick={handleVisualize}
          disabled={loading}
          id="dsa-visualize-btn"
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "9px", borderRadius: 10, marginTop: 8, marginBottom: 16,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer",
            fontSize: "0.875rem", fontWeight: 600, opacity: loading ? 0.7 : 1,
            transition: "all 150ms",
          }}
        >
          {loading
            ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Rendering…</>
            : <><Binary size={14} /> Visualize</>}
        </button>

        {/* Algorithm dry-run */}
        {visualized && algos.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
            <div style={sLabel}>Algorithm Dry-Run</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              {algos.map((algo) => (
                <button
                  key={algo}
                  id={`algo-${algo.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => { setSelectedAlgo(algo); setAlgoInput(""); setSteps([]); setAlgoMode(false); }}
                  style={{
                    padding: "6px 10px", borderRadius: 8, textAlign: "left", fontSize: "0.825rem",
                    border: selectedAlgo === algo ? "1px solid var(--accent-border)" : "1px solid var(--border-color)",
                    background: selectedAlgo === algo ? "var(--accent-muted)" : "var(--bg-secondary)",
                    color: selectedAlgo === algo ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: selectedAlgo === algo ? 600 : 400,
                    cursor: "pointer", transition: "all 100ms",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Search size={11} />
                  {algo}
                </button>
              ))}
            </div>

            {selectedAlgo && selectedAlgo !== "Bubble Sort" && (
              <input
                type="text"
                value={algoInput}
                onChange={(e) => setAlgoInput(e.target.value)}
                placeholder={`Target value for ${selectedAlgo}`}
                id="algo-target-input"
                style={{ ...textareaStyle(false), padding: "7px 10px", resize: "none", marginBottom: 8 }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
              />
            )}

            {selectedAlgo && (
              <button
                onClick={handleRunAlgo}
                id="run-algo-btn"
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "8px", borderRadius: 10, marginBottom: 12,
                  background: "var(--bg-tertiary)", color: "var(--text-primary)",
                  border: "1px solid var(--border-color)", cursor: "pointer",
                  fontSize: "0.85rem", fontWeight: 500,
                }}
              >
                <Play size={12} /> Run {selectedAlgo}
              </button>
            )}

            {/* Step player */}
            {algoMode && steps.length > 0 && (
              <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: 12, border: "1px solid var(--border-color)" }}>
                {/* Step info */}
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 10, minHeight: 48, lineHeight: 1.5 }}>
                  <span style={{ color: "var(--accent)", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                    Step {stepIdx + 1}/{steps.length}
                  </span>
                  <br />
                  {steps[stepIdx]?.description}
                </div>

                {/* Controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <button onClick={() => { setStepIdx(0); setPlaying(false); clearHighlights(); }} style={ctrlBtn} id="step-reset" title="Reset">
                    <RotateCcw size={13} />
                  </button>
                  <button onClick={() => setStepIdx((i) => Math.max(0, i - 1))} style={ctrlBtn} id="step-back" title="Previous">
                    <SkipBack size={14} />
                  </button>
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    id="step-play-pause"
                    style={{ ...ctrlBtn, background: "var(--accent)", color: "white", width: 36, height: 36, borderRadius: "50%" }}
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))} style={ctrlBtn} id="step-next" title="Next">
                    <SkipForward size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 10, height: 3, background: "var(--border-color)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${((stepIdx + 1) / steps.length) * 100}%`, background: "var(--accent)", transition: "width 200ms" }} />
                </div>

                {/* Comparisons */}
                {steps[stepIdx]?.comparisons !== undefined && (
                  <div style={{ marginTop: 8, fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    Comparisons: <strong style={{ color: "var(--accent)" }}>{steps[stepIdx].comparisons}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Usage tip */}
        {!visualized && (
          <div style={{ marginTop: 8, padding: 12, background: "var(--bg-tertiary)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <div style={{ ...sLabel, marginBottom: 6 }}>Example</div>
            <code style={{ fontSize: "0.75rem", color: "var(--accent)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>
              {PLACEHOLDERS[selected]}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

const sLabel = { fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 };
const ghostBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", borderRadius: 6 };
const ctrlBtn  = { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "50%", cursor: "pointer", color: "var(--text-secondary)" };
const textareaStyle = (hasError) => ({
  width: "100%", resize: "vertical", background: "var(--bg-secondary)",
  color: "var(--text-primary)", fontFamily: "var(--font-mono)",
  border: `1px solid ${hasError ? "var(--danger)" : "var(--border-color)"}`,
  borderRadius: 8, padding: "9px 10px", fontSize: "0.8rem", outline: "none",
  transition: "border-color 150ms", lineHeight: 1.5,
});
