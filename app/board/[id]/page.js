"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { X, Loader2, Sparkles, Wand2, AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";

// Board components
import BoardNav from "@/components/board/BoardNav";
import VersionHistoryPanel from "@/components/board/VersionHistoryPanel";
import ShareExportModal from "@/components/board/ShareExportModal";
import CommentsOverlay from "@/components/board/CommentsOverlay";

// Canvas components
import Canvas from "@/components/canvas/Canvas";
import Toolbar from "@/components/canvas/Toolbar";
import ZoomControls from "@/components/canvas/ZoomControls";
import PropertiesPanel from "@/components/canvas/PropertiesPanel";
import ContextMenu from "@/components/canvas/ContextMenu";

// Feature panels
import DSAPanel from "@/components/dsa/DSAPanel";

// UI components
import CommandPalette from "@/components/ui/CommandPalette";
import KeyboardShortcutsModal from "@/components/ui/KeyboardShortcutsModal";
import Toaster from "@/components/ui/Toaster";

// Collaboration
import RemoteCursors, { CollaboratorAvatars } from "@/components/collab/RemoteCursors";

// Stores & hooks
import useCanvasStore from "@/store/useCanvasStore";
import useCollabStore from "@/store/useCollabStore";
import useAuthStore from "@/store/useAuthStore";
import { useSocket, broadcastCursor, broadcastElementAdd, broadcastBatch } from "@/hooks/useSocket";
import { toast } from "@/lib/toast";
import { throttle } from "@/lib/utils";
import { AUTOSAVE_DELAY } from "@/lib/constants";

/* ─────────────────────────────────────────────────
   AI Panel
───────────────────────────────────────────────── */
const AI_SUGGESTIONS = [
  "Create a BST from 50, 30, 70, 20, 40",
  "Draw a linked list: 1→2→3→4→NULL",
  "System design for Twitter",
  "Show bubble sort on [5, 3, 8, 1, 9]",
];

function AIPanel({ onClose, onResult, socket }) {
  const [prompt, setPrompt]   = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode]       = useState("add");
  const ref = useRef(null);
  const canvasElements = useCanvasStore((s) => s.elements);

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          currentElements: canvasElements.slice(0, 20).map((el) => ({ type: el.type, x: el.x, y: el.y })),
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "AI generation failed"); return; }

      if (mode === "replace") {
        useCanvasStore.getState().setElements(data.elements);
        broadcastBatch(socket, data.elements);
      } else {
        useCanvasStore.getState().addElements(data.elements);
        broadcastElementAdd(socket, data.elements);
      }
      toast.success(`Generated ${data.elements.length} elements!`);
      setPrompt("");
      setTimeout(() => onResult?.(), 800);
    } catch { toast.error("Network error — check your connection"); }
    finally   { setLoading(false); }
  };

  return (
    <div style={{ position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)", width: "min(560px, calc(100vw - 40px))", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-xl)", zIndex: 100 }} id="ai-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px 10px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#6366f1,#a78bfa)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={15} style={{ color: "white" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>AI Canvas Generator</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>Powered by Gemini · syncs to all collaborators</div>
        </div>
        <button onClick={onClose} id="ai-close" style={ghostBtn}><X size={14} /></button>
      </div>

      <div style={{ padding: "10px 16px 0", display: "flex", gap: 6 }}>
        {[{ value: "add", label: "➕ Add to canvas" }, { value: "replace", label: "🔄 Replace canvas" }].map((m) => (
          <button key={m.value} onClick={() => setMode(m.value)}
            style={{ padding: "4px 12px", borderRadius: 20, fontSize: "0.72rem", cursor: "pointer", border: mode === m.value ? "1px solid var(--accent-border)" : "1px solid var(--border-color)", background: mode === m.value ? "var(--accent-muted)" : "transparent", color: mode === m.value ? "var(--accent)" : "var(--text-secondary)", fontWeight: mode === m.value ? 600 : 400 }}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "10px 16px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {AI_SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => setPrompt(s)}
            style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: 20, padding: "3px 10px", fontSize: "0.71rem", color: "var(--text-secondary)", cursor: "pointer", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 16px 16px", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea ref={ref} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="e.g. Create a BST from 50, 30, 70, 20, 40 or System design for Netflix…"
          rows={2} id="ai-prompt-input"
          style={{ flex: 1, resize: "none", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "10px 12px", fontSize: "0.875rem", fontFamily: "var(--font-sans)", outline: "none", lineHeight: 1.5 }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px var(--accent-muted)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; e.target.style.boxShadow = "none"; }} />
        <button onClick={submit} disabled={!prompt.trim() || loading} id="ai-generate-btn"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, opacity: (!prompt.trim() || loading) ? 0.5 : 1, whiteSpace: "nowrap" }}>
          {loading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating…</> : <><Wand2 size={14} /> Generate</>}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Board Page
───────────────────────────────────────────────── */
export default function BoardPage() {
  const routeParams = useParams();
  const boardId = routeParams?.id || "demo";

  // Panel visibility
  const [showAI,        setShowAI]        = useState(false);
  const [showDSA,       setShowDSA]       = useState(false);
  const [showHistory,   setShowHistory]   = useState(false);
  const [showShare,     setShowShare]     = useState(false);
  const [showComments,  setShowComments]  = useState(false);
  const [showCmdPalette,setShowCmdPalette]= useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showGrid,      setShowGrid]      = useState(true);

  // Board state
  const [saveState,   setSaveState]   = useState("saved");
  const [boardTitle,  setBoardTitle]  = useState("Untitled Board");
  const [contextMenu, setContextMenu] = useState(null); // { x, y, elementId }

  const autoSaveRef = useRef(null);

  const { selectedIds } = useCanvasStore();
  const { user }        = useAuthStore();
  const { connected }   = useCollabStore();

  // ── Socket.IO ──────────────────────────────────
  const { socket } = useSocket({
    boardId,
    user: user ? { id: user.id, name: user.name, color: user.color || "#6366f1" } : null,
  });

  // Keep a ref to the socket so callbacks with deps:[] always see the latest
  // connected socket. Without this, callbacks created before the socket
  // connected would capture null forever (classic stale closure).
  const socketRef = useRef(null);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  // ── Throttled cursor broadcast ─────────────────
  const handleCursorMove = useCallback(
    throttle((x, y) => broadcastCursor(socketRef.current, x, y), 50),
    [] // safe — always reads socketRef.current at call time
  );

  // ── Real-time element sync callbacks ───────────
  // Called by Canvas immediately after user draws/moves/deletes.
  // All use socketRef.current so they never capture a stale socket value.
  const handleElementAdded = useCallback((el) => {
    broadcastElementAdd(socketRef.current, [el]);
  }, []);

  const handleElementsUpdated = useCallback((els) => {
    const s = socketRef.current;
    if (!s?.connected) return;
    els.forEach((el) => {
      s.emit("element:update", { id: el.id, updates: el });
    });
  }, []);

  const handleElementsDeleted = useCallback((ids) => {
    const s = socketRef.current;
    if (s?.connected) s.emit("element:delete", { ids });
  }, []);

  const handleClearCanvas = useCallback(() => {
    useCanvasStore.getState().clearCanvas();
    broadcastBatch(socketRef.current, []);
    toast.success("Canvas cleared");
  }, []);

  // ── Rename Board & Persist to DB ───────────────
  const handleTitleChange = useCallback(async (newTitle) => {
    if (!newTitle || !newTitle.trim()) return;
    const trimmed = newTitle.trim();
    setBoardTitle(trimmed);

    if (!boardId || boardId === "demo" || !/^[a-f0-9]{24}$/.test(boardId)) return;

    try {
      setSaveState("saving");
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        setSaveState("saved");
        toast.success("Board renamed");
        socketRef.current?.emit?.("board:rename", { title: trimmed });
      } else {
        setSaveState("error");
        toast.error("Failed to rename board");
      }
    } catch {
      setSaveState("error");
      toast.error("Failed to rename board");
    }
  }, [boardId]);

  // ── Real-time remote board rename listener ────
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const handleRemoteRename = ({ title }) => {
      if (title) setBoardTitle(title);
    };
    s.on("board:rename", handleRemoteRename);
    return () => {
      s.off("board:rename", handleRemoteRename);
    };
  }, [socket]);

  // ── Auto-save to MongoDB (2s inactivity debounce) ─
  const lastSavedJsonRef = useRef("");
  useEffect(() => {
    const unsub = useCanvasStore.subscribe(async (state) => {
      const currentJson = JSON.stringify(state.elements || []);
      // If elements didn't change (e.g. pan, zoom, selection changes), do not schedule autosave
      if (currentJson === lastSavedJsonRef.current) return;

      setSaveState("saving");
      clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(async () => {
        if (!boardId || boardId === "demo" || !/^[a-f0-9]{24}$/.test(boardId)) {
          setSaveState("saved");
          return;
        }
        try {
          const res = await fetch(`/api/boards/${boardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ elements: state.elements }),
          });
          if (res.ok) {
            lastSavedJsonRef.current = currentJson;
            setSaveState("saved");
          } else {
            setSaveState("error");
          }
        } catch {
          setSaveState("error");
        }
      }, AUTOSAVE_DELAY);
    });
    return () => { unsub(); clearTimeout(autoSaveRef.current); };
  }, [boardId]);

  // ── Load board on mount ────────────────────────
  useEffect(() => {
    if (!boardId || boardId === "demo" || !/^[a-f0-9]{24}$/.test(boardId)) return;
    (async () => {
      try {
        const res = await fetch(`/api/boards/${boardId}`);
        if (!res.ok) return;
        const { board } = await res.json();
        if (board) {
          setBoardTitle(board.title || "Untitled Board");
          if (board.elements?.length) useCanvasStore.getState().setElements(board.elements);
        }
      } catch (e) { console.warn("[Board] Load failed:", e.message); }
    })();
  }, [boardId]);

  // ── Custom event bus (from CommandPalette) ─────
  useEffect(() => {
    const handler = (e) => {
      const panel = e.detail;
      setShowAI(false); setShowDSA(false); setShowHistory(false);
      setShowShare(false); setShowCmdPalette(false);
      if (panel === "ai")       setShowAI(true);
      if (panel === "dsa")      setShowDSA(true);
      if (panel === "history")  setShowHistory(true);
      if (panel === "share")    setShowShare(true);
      if (panel === "comments") setShowComments((v) => !v);
    };
    window.addEventListener("structura:toggle", handler);
    return () => window.removeEventListener("structura:toggle", handler);
  }, []);

  // ── Right-click context menu on canvas ─────────
  useEffect(() => {
    const handler = (e) => {
      const container = document.getElementById("canvas-container");
      if (!container?.contains(e.target)) return;

      e.preventDefault();

      const store = useCanvasStore.getState();
      // Convert screen → canvas coords
      const rect = container.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const cx = (sx - store.pan.x) / store.zoom;
      const cy = (sy - store.pan.y) / store.zoom;

      // Hit-test: find topmost element at click position
      const hit = [...store.elements].reverse().find((el) => {
        const w = el.width  || 60;
        const h = el.height || 60;
        return cx >= el.x && cx <= el.x + w && cy >= el.y && cy <= el.y + h;
      });

      const elementId = hit?.id || store.selectedIds[0] || null;
      if (!elementId) return; // empty canvas right-click → no menu
      setContextMenu({ x: e.clientX, y: e.clientY, elementId });
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  // ── Global keyboard shortcuts ──────────────────
  useEffect(() => {
    const handler = (e) => {
      const inInput =
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable ||
        document.getElementById("canvas-text-editor");

      // Escape closes panels, clears selection, returns to hand tool
      if (e.key === "Escape") {
        setShowAI(false); setShowDSA(false); setShowHistory(false);
        setShowShare(false); setShowCmdPalette(false); setShowShortcuts(false);
        setContextMenu(null);
        useCanvasStore.getState().clearSelected();
        useCanvasStore.getState().setActiveTool("hand");
        return;
      }

      // If user is typing inside an input field / textarea, don't trigger canvas shortcuts
      if (inInput) return;

      // Cmd+K → Command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCmdPalette((v) => !v);
        return;
      }

      // Cmd+Z / Cmd+Shift+Z / Cmd+Y → Undo / Redo
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        useCanvasStore.getState().undo();
        broadcastBatch(socketRef.current, useCanvasStore.getState().elements);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key.toLowerCase() === "z") || e.key.toLowerCase() === "y")) {
        e.preventDefault();
        useCanvasStore.getState().redo();
        broadcastBatch(socketRef.current, useCanvasStore.getState().elements);
        return;
      }

      // Cmd+D → Duplicate selected
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const selIds = useCanvasStore.getState().selectedIds;
        if (selIds.length > 0) {
          const beforeIds = new Set(useCanvasStore.getState().elements.map((el) => el.id));
          useCanvasStore.getState().duplicateSelected?.();
          const after = useCanvasStore.getState().elements;
          const newEls = after.filter((el) => !beforeIds.has(el.id));
          if (newEls.length) newEls.forEach((el) => handleElementAdded(el));
        }
        return;
      }

      // ? → shortcuts help
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }

      // Tool shortcuts (single key)
      const toolMap = {
        v: "select",
        h: "hand",
        p: "pen",
        r: "rectangle",
        c: "circle",
        l: "line",
        a: "arrow",
        t: "text",
        i: "image",
        e: "eraser",
      };
      const key = e.key.toLowerCase();
      if (toolMap[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        useCanvasStore.getState().setActiveTool(toolMap[key]);
        return;
      }

      // Delete / Backspace → Delete selected elements
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const s = useCanvasStore.getState();
        if (s.selectedIds.length > 0) {
          const idsToDelete = [...s.selectedIds];
          s.deleteElements(idsToDelete);
          handleElementsDeleted(idsToDelete);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleElementAdded, handleElementsDeleted]);

  const showProps = selectedIds.length > 0 && !showDSA && !showHistory;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--canvas-bg)" }}>

      {/* ── Global Toaster ── */}
      <Toaster />

      {/* ── Command Palette ── */}
      <CommandPalette open={showCmdPalette} onClose={() => setShowCmdPalette(false)} />

      {/* ── Keyboard Shortcuts Modal ── */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* ── Share & Export Modal ── */}
      {showShare && (
        <ShareExportModal boardId={boardId} boardTitle={boardTitle} onClose={() => setShowShare(false)} />
      )}

      {/* ── Top Nav ── */}
      <BoardNav
        title={boardTitle}
        saveState={saveState}
        onTitleChange={handleTitleChange}
        connected={connected}
        collaboratorSlot={<CollaboratorAvatars />}
        onShare={() => setShowShare(true)}
        onHistory={() => { setShowHistory((v) => !v); setShowAI(false); setShowDSA(false); }}
      />

      {/* ── Canvas area ── */}
      <div id="canvas-container" style={{ flex: 1, position: "relative", marginTop: 52, overflow: "hidden" }}>
        <Canvas
          onCursorMove={handleCursorMove}
          onElementAdded={handleElementAdded}
          onElementsUpdated={handleElementsUpdated}
          onElementsDeleted={handleElementsDeleted}
        />

        {/* Remote cursors */}
        <RemoteCursors />

        {/* Toolbar */}
        <Toolbar
          onAIClick={() => { setShowAI((v) => !v); setShowDSA(false); setShowHistory(false); }}
          onDSAClick={() => { setShowDSA((v) => !v); setShowAI(false); setShowHistory(false); }}
          onHistoryClick={() => { setShowHistory((v) => !v); setShowAI(false); setShowDSA(false); }}
          onCommentsClick={() => setShowComments((v) => !v)}
          onClearClick={handleClearCanvas}
          showAI={showAI} showDSA={showDSA} showHistory={showHistory} showComments={showComments}
        />

        {/* Zoom controls */}
        <ZoomControls showGrid={showGrid} onToggleGrid={() => setShowGrid((v) => !v)} />

        {/* ── Panels ── */}
        {showAI && (
          <AIPanel onClose={() => setShowAI(false)} onResult={() => setShowAI(false)} socket={socket} />
        )}
        {showDSA && (
          <DSAPanel
            onClose={() => setShowDSA(false)}
            onBroadcastBatch={(els) => broadcastBatch(socketRef.current, els)}
          />
        )}
        {showHistory && (
          <VersionHistoryPanel
            boardId={boardId}
            onClose={() => setShowHistory(false)}
            onRestored={() => { setShowHistory(false); toast.success("Canvas restored!"); }}
          />
        )}
        {showProps && (
          <PropertiesPanel
            onElementsUpdated={handleElementsUpdated}
            onElementsDeleted={handleElementsDeleted}
            onElementAdded={handleElementAdded}
          />
        )}

        {/* Comments overlay (right-click on canvas to add) */}
        <CommentsOverlay boardId={boardId} enabled={showComments} onClose={() => setShowComments(false)} />

        {/* Context menu */}
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onElementsUpdated={handleElementsUpdated}
          onElementsDeleted={handleElementsDeleted}
          onElementAdded={handleElementAdded}
        />

        {/* Status chips */}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, zIndex: 20, pointerEvents: "none" }}>
          <StatusChip id="status-tool"  getText={() => useCanvasStore.getState().activeTool + " tool"} />
          <StatusChip id="status-count" getText={() => `${useCanvasStore.getState().elements.length} elements`} />
          {connected && (
            <StatusChip id="status-collab"
              getText={() => `${Object.keys(useCollabStore.getState().remoteUsers).length + 1} online`}
              extraStyle={{ color: "var(--success)" }}
            />
          )}
        </div>

        {/* Cmd+K hint (bottom-right) */}
        <div style={{ position: "absolute", bottom: 84, right: 12, zIndex: 20, pointerEvents: "none" }}>
          <kbd style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "4px 8px", fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", boxShadow: "var(--shadow-sm)" }}>
            ⌘K
          </kbd>
        </div>
      </div>
    </div>
  );
}

/* ── Status Chip ────────────────────────────────── */
function StatusChip({ id, getText, extraStyle = {} }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => setText(getText());
    update();
    const unsubs = [useCanvasStore.subscribe(update), useCollabStore.subscribe(update)];
    return () => unsubs.forEach((u) => u());
  }, [getText]);
  return (
    <span id={id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "3px 9px", fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)", boxShadow: "var(--shadow-sm)", ...extraStyle }}>
      {text}
    </span>
  );
}

const ghostBtn = { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", borderRadius: 6 };
