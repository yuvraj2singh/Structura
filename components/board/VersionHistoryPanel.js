"use client";
import { useState, useEffect, useCallback } from "react";
import {
  History, X, RotateCcw, Save, Trash2, Clock,
  Loader2, CheckCircle2, AlertCircle, Tag, Sparkles
} from "lucide-react";
import useCanvasStore from "@/store/useCanvasStore";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function elementPreview(elements = []) {
  const types = [...new Set(elements.map((e) => e.type))];
  return `${elements.length} elements · ${types.slice(0, 3).join(", ")}${types.length > 3 ? "…" : ""}`;
}

export default function VersionHistoryPanel({ boardId, onClose, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [restoring, setRestoring]   = useState(null); // versionId being restored
  const [deleting, setDeleting]     = useState(null);
  const [savingSnap, setSavingSnap] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [snapLabel, setSnapLabel]   = useState("");
  const [showSnapInput, setShowSnapInput] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/boards/${boardId}/versions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load versions");
      setVersions(data.versions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const handleRestore = async (version) => {
    if (!confirm(`Restore canvas to this version?\n"${version.label || timeAgo(version.createdAt)}"\n\nYour current state will be auto-saved first.`)) return;
    setRestoring(version._id);
    try {
      const res = await fetch(`/api/boards/${boardId}/versions/${version._id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");

      // Apply to local canvas
      useCanvasStore.getState().setElements(data.elements || []);
      showToast("Canvas restored successfully!");
      onRestored?.();
      await fetchVersions();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (version) => {
    if (!confirm(`Delete this version permanently?\n"${version.label || timeAgo(version.createdAt)}"`)) return;
    setDeleting(version._id);
    try {
      const res = await fetch(`/api/boards/${boardId}/versions/${version._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setVersions((v) => v.filter((x) => x._id !== version._id));
      showToast("Version deleted");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (versions.length === 0 || deletingAll) return;
    if (!confirm(`Delete all ${versions.length} saved versions for this board permanently?\n\nThis will clear all version history and cannot be undone.`)) return;
    setDeletingAll(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/versions`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete versions");
      setVersions([]);
      showToast("All versions deleted");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!snapLabel.trim()) return;
    setSavingSnap(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: snapLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Snapshot failed");
      showToast(`Snapshot "${snapLabel}" saved!`);
      setSnapLabel("");
      setShowSnapInput(false);
      await fetchVersions();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSavingSnap(false);
    }
  };

  const autoVersions   = versions.filter((v) => v.auto);
  const manualVersions = versions.filter((v) => !v.auto);

  return (
    <div
      id="version-history-panel"
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 300,
        background: "var(--bg-elevated)", borderLeft: "1px solid var(--border-color)",
        zIndex: 30, display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#f59e0b,#ef4444)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <History size={14} style={{ color: "white" }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", flex: 1 }}>Version History</span>
        <button onClick={onClose} id="history-close" style={ghostBtn}><X size={14} /></button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ margin: "8px 12px 0", padding: "8px 12px", background: toast.type === "error" ? "var(--danger-muted)" : "var(--success-muted)", border: `1px solid ${toast.type === "error" ? "var(--danger)" : "var(--success)"}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: toast.type === "error" ? "var(--danger)" : "var(--success)" }}>
          {toast.type === "error" ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
          {toast.msg}
        </div>
      )}

      {/* Save manual snapshot */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
        {showSnapInput ? (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={snapLabel}
              onChange={(e) => setSnapLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveSnapshot(); if (e.key === "Escape") setShowSnapInput(false); }}
              placeholder="Snapshot name…"
              autoFocus
              id="snapshot-label-input"
              style={{ flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--accent)", borderRadius: 8, padding: "6px 10px", fontSize: "0.82rem", color: "var(--text-primary)", outline: "none", fontFamily: "var(--font-sans)" }}
            />
            <button onClick={handleSaveSnapshot} disabled={!snapLabel.trim() || savingSnap} id="save-snapshot-btn"
              style={{ padding: "6px 12px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, opacity: !snapLabel.trim() || savingSnap ? 0.5 : 1 }}>
              {savingSnap ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
            </button>
            <button onClick={() => setShowSnapInput(false)} style={{ ...ghostBtn, width: 32 }}><X size={13} /></button>
          </div>
        ) : (
          <button onClick={() => setShowSnapInput(true)} id="create-snapshot-btn"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, border: "1px dashed var(--border-color)", background: "transparent", color: "var(--text-secondary)", fontSize: "0.82rem", cursor: "pointer", transition: "all 150ms" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
            <Tag size={13} /> Save named snapshot
          </button>
        )}
      </div>

      {/* Version list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 32, color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading versions…
          </div>
        )}

        {error && <p style={{ padding: "16px 14px", color: "var(--danger)", fontSize: "0.83rem" }}>{error}</p>}

        {!loading && !error && versions.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
            <History size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No versions yet.</p>
            <p style={{ fontSize: "0.75rem", marginTop: 4 }}>Auto-saves appear here as you edit.</p>
          </div>
        )}

        {/* Manual snapshots */}
        {manualVersions.length > 0 && (
          <>
            <div style={sectionLabel}>📌 Named Snapshots</div>
            {manualVersions.map((v) => (
              <VersionRow key={v._id} version={v} restoring={restoring} deleting={deleting} onRestore={handleRestore} onDelete={handleDelete} />
            ))}
          </>
        )}

        {/* Auto-saves */}
        {autoVersions.length > 0 && (
          <>
            <div style={sectionLabel}>🕐 Auto-saves</div>
            {autoVersions.map((v) => (
              <VersionRow key={v._id} version={v} restoring={restoring} deleting={deleting} onRestore={handleRestore} onDelete={handleDelete} />
            ))}
          </>
        )}
      </div>

      {/* Footer stats & delete all button */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={fetchVersions} style={{ ...ghostBtn, width: 26, height: 26 }} title="Refresh">
            <RotateCcw size={12} />
          </button>
          <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {versions.length > 0 && (
          <button
            onClick={handleDeleteAll}
            disabled={deletingAll}
            id="delete-all-versions-btn"
            title="Delete all version history"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid var(--danger-muted)",
              background: "transparent",
              color: "var(--danger)",
              fontSize: "0.72rem",
              fontWeight: 500,
              cursor: deletingAll ? "not-allowed" : "pointer",
              transition: "all 150ms",
              opacity: deletingAll ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--danger-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {deletingAll ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={11} />}
            Delete all
          </button>
        )}
      </div>
    </div>
  );
}

function VersionRow({ version, restoring, deleting, onRestore, onDelete }) {
  const isRestoring = restoring === version._id;
  const isDeleting  = deleting  === version._id;
  const isBusy = isRestoring || isDeleting;

  return (
    <div
      style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 10, alignItems: "flex-start", transition: "background 100ms", cursor: "default" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-secondary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Icon */}
      <div style={{ width: 28, height: 28, borderRadius: 8, background: version.auto ? "var(--bg-tertiary)" : "var(--accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {version.auto ? <Clock size={13} style={{ color: "var(--text-tertiary)" }} /> : <Tag size={13} style={{ color: "var(--accent)" }} />}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
          {version.auto && version.label && (
            <Sparkles size={11} style={{ color: "var(--accent)", flexShrink: 0 }} />
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {version.label || (version.auto ? "Auto-save" : "Snapshot")}
          </span>
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: 2 }}>
          {timeAgo(version.createdAt)}
          {version.createdBy?.name && ` · ${version.createdBy.name}`}
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
          {elementPreview(version.elements)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onRestore(version)}
          disabled={isBusy}
          id={`restore-btn-${version._id}`}
          title="Restore this version"
          style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", cursor: isBusy ? "not-allowed" : "pointer", color: "var(--text-secondary)", opacity: isBusy ? 0.5 : 1 }}
        >
          {isRestoring ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <RotateCcw size={11} />}
        </button>
        <button
          onClick={() => onDelete(version)}
          disabled={isBusy}
          id={`delete-version-btn-${version._id}`}
          title="Delete version"
          style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", cursor: isBusy ? "not-allowed" : "pointer", color: "var(--text-tertiary)", opacity: isBusy ? 0.5 : 1 }}
          onMouseEnter={(e) => { if (!isBusy) { e.currentTarget.style.background = "var(--danger-muted)"; e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger)"; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.borderColor = "var(--border-color)"; }}
        >
          {isDeleting ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={11} />}
        </button>
      </div>
    </div>
  );
}

const ghostBtn = { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", borderRadius: 6 };
const sectionLabel = { padding: "8px 14px 4px", fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase" };
