"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, X, Send, CheckCircle2, Loader2,
  CornerDownRight, Check, Trash2
} from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";
import { getInitials, stringToColor, timeAgo } from "@/lib/utils";

/**
 * CommentsOverlay
 * Renders floating comment pins on the canvas in screen space.
 * When enabled, click or right-click on the canvas to drop a comment.
 */
export default function CommentsOverlay({ boardId, enabled, onClose }) {
  const [comments, setComments]   = useState([]);
  const [open, setOpen]           = useState(null); // commentId or "new"
  const [newPos, setNewPos]       = useState(null); // {x, y, sx, sy}
  const [loading, setLoading]     = useState(false);

  const [vp, setVp] = useState({ pan: { x: 0, y: 0 }, zoom: 1 });
  useEffect(() => {
    return useCanvasStore.subscribe((s) => setVp({ pan: s.pan, zoom: s.zoom }));
  }, []);

  const canvasToScreen = (cx, cy) => ({
    sx: cx * vp.zoom + vp.pan.x,
    sy: cy * vp.zoom + vp.pan.y,
  });

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!boardId || boardId === "demo") return;
    try {
      const res = await fetch(`/api/boards/${boardId}/comments`);
      if (!res.ok) return;
      const { comments: data } = await res.json();
      setComments(data || []);
    } catch {}
  }, [boardId]);

  useEffect(() => {
    if (enabled) fetchComments();
  }, [enabled, fetchComments]);

  // Click on canvas to drop comment
  useEffect(() => {
    if (!enabled) return;

    const handlePointer = (e) => {
      // Don't intercept if clicking inside an open comment popup, pin, or toolbar
      if (e.target.closest("#comments-overlay [data-pin], #comments-overlay [data-popup], #canvas-toolbar, #board-nav, #dsa-panel, #ai-panel")) {
        return;
      }
      const canvasContainer = document.getElementById("canvas-container");
      if (!canvasContainer?.contains(e.target)) return;

      const rect = canvasContainer.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const cx = (sx - vp.pan.x) / vp.zoom;
      const cy = (sy - vp.pan.y) / vp.zoom;

      setNewPos({ x: cx, y: cy, sx, sy });
      setOpen("new");
    };

    const handleContextMenu = (e) => {
      const canvasContainer = document.getElementById("canvas-container");
      if (!canvasContainer?.contains(e.target)) return;
      e.preventDefault();
      handlePointer(e);
    };

    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enabled, vp]);

  if (!enabled) return null;

  return (
    <div id="comments-overlay" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 40 }}>
      {/* Top Banner Indicator */}
      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", background: "var(--bg-elevated)", border: "1px solid var(--accent)", borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, boxShadow: "var(--shadow-md)", pointerEvents: "auto", zIndex: 45 }}>
        <MessageSquare size={13} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>
          Comments Mode: Right-click anywhere on the canvas to add a comment
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", alignItems: "center", padding: 2 }}>
          <X size={13} />
        </button>
      </div>

      {/* Existing comment pins */}
      {comments.map((c) => {
        const { sx, sy } = canvasToScreen(c.x, c.y);
        return (
          <CommentPin
            key={c._id}
            comment={c}
            sx={sx} sy={sy}
            isOpen={open === c._id}
            onToggle={() => setOpen(open === c._id ? null : c._id)}
            onReply={async (text) => {
              if (!text.trim()) return;
              try {
                const res = await fetch(`/api/boards/${boardId}/comments/${c._id}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text }),
                });
                const { comment: updated } = await res.json();
                if (updated) {
                  setComments((cs) => cs.map((x) => (x._id === c._id ? updated : x)));
                }
              } catch {}
            }}
            onResolve={async () => {
              await fetch(`/api/boards/${boardId}/comments/${c._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resolved: true }),
              });
              setComments((cs) => cs.filter((x) => x._id !== c._id));
              setOpen(null);
            }}
          />
        );
      })}

      {/* New comment composer */}
      {open === "new" && newPos && (
        <NewCommentComposer
          sx={newPos.sx} sy={newPos.sy}
          onSubmit={async (text) => {
            if (!text.trim() || !boardId || boardId === "demo") { setOpen(null); return; }
            setLoading(true);
            try {
              const res = await fetch(`/api/boards/${boardId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, x: newPos.x, y: newPos.y }),
              });
              const { comment } = await res.json();
              if (comment) setComments((cs) => [comment, ...cs]);
            } catch {}
            setLoading(false);
            setOpen(null);
            setNewPos(null);
          }}
          onCancel={() => { setOpen(null); setNewPos(null); }}
          loading={loading}
        />
      )}
    </div>
  );
}

function CommentPin({ comment, sx, sy, isOpen, onToggle, onReply, onResolve }) {
  const author = comment.author?.name || "Anonymous";
  const color  = stringToColor(author);
  const count  = (comment.replies?.length || 0) + 1;
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    await onReply(replyText);
    setReplyText("");
    setReplying(false);
  };

  return (
    <div data-pin="true" style={{ position: "absolute", left: sx, top: sy, pointerEvents: "auto", zIndex: 41 }}>
      {/* Pin button */}
      <button
        onClick={onToggle}
        id={`comment-pin-${comment._id}`}
        title={`${author}: ${comment.text}`}
        style={{
          width: 32, height: 32, borderRadius: "50% 50% 50% 0", background: color,
          border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transform: "translate(-4px, -28px)", boxShadow: "0 2px 10px rgba(0,0,0,0.3)", position: "relative"
        }}
      >
        <MessageSquare size={13} style={{ color: "white" }} />
        {count > 1 && (
          <span style={{ position: "absolute", top: -6, right: -6, background: "var(--accent)", color: "white", borderRadius: 10, fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px", minWidth: 16, textAlign: "center" }}>
            {count}
          </span>
        )}
      </button>

      {/* Thread popup */}
      {isOpen && (
        <div data-popup="true" style={{ position: "absolute", left: 12, top: -28, width: 280, background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: 14, boxShadow: "var(--shadow-xl)", zIndex: 42, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: "white", flexShrink: 0 }}>
              {getInitials(author)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{author}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>{timeAgo(comment.createdAt)}</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={onResolve} title="Resolve comment" id={`resolve-comment-${comment._id}`}
                style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--success)", borderRadius: 4 }}>
                <Check size={13} />
              </button>
              <button onClick={onToggle} style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", borderRadius: 4 }}>
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Comment text */}
          <div style={{ padding: "10px 12px", fontSize: "0.82rem", color: "var(--text-primary)", lineHeight: 1.5, maxHeight: 150, overflowY: "auto" }}>
            {comment.text}
          </div>

          {/* Replies list */}
          {comment.replies && comment.replies.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", maxHeight: 120, overflowY: "auto", background: "var(--bg-secondary)" }}>
              {comment.replies.map((r, i) => (
                <div key={i} style={{ padding: "6px 12px", borderBottom: i < comment.replies.length - 1 ? "1px solid var(--border-subtle)" : "none", fontSize: "0.75rem" }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.7rem", marginBottom: 2 }}>{r.author?.name || "User"}</div>
                  <div style={{ color: "var(--text-secondary)" }}>{r.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 6, background: "var(--bg-elevated)" }}>
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
              placeholder="Reply…"
              style={{ flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "5px 8px", fontSize: "0.75rem", color: "var(--text-primary)", outline: "none" }}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || replying}
              style={{ padding: "5px 8px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", opacity: !replyText.trim() || replying ? 0.5 : 1 }}
            >
              {replying ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={11} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewCommentComposer({ sx, sy, onSubmit, onCancel, loading }) {
  const [text, setText] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <div data-popup="true" style={{ position: "absolute", left: sx + 8, top: sy - 10, width: 260, background: "var(--bg-elevated)", border: "1px solid var(--accent-border)", borderRadius: 14, boxShadow: "var(--shadow-xl)", zIndex: 42, overflow: "hidden", pointerEvents: "auto" }}>
      <div style={{ padding: "10px 12px 0", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8 }}>
        <MessageSquare size={13} style={{ color: "var(--accent)" }} />
        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>New comment</span>
        <button onClick={onCancel} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}><X size={12} /></button>
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(text); } if (e.key === "Escape") onCancel(); }}
          placeholder="Add a comment… (Enter to post)"
          rows={3}
          id="new-comment-textarea"
          style={{ width: "100%", resize: "none", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 10px", fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "var(--font-sans)", outline: "none", lineHeight: 1.5 }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
          <button onClick={onCancel} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", fontSize: "0.78rem", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onSubmit(text)} disabled={!text.trim() || loading} id="post-comment-btn"
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", opacity: !text.trim() || loading ? 0.5 : 1 }}>
            {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />} Post
          </button>
        </div>
      </div>
    </div>
  );
}
