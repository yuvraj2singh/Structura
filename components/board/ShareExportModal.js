"use client";
import { useState, useEffect, useRef } from "react";
import {
  X, Link, Mail, Download, FileJson, Image, Code2,
  CheckCircle2, AlertCircle, Loader2, Globe, Lock,
  Copy, Users, Upload, UserMinus, Crown, Edit3, Eye,
} from "lucide-react";
import { exportAsPNG, exportAsSVG, exportAsJSON, importFromJSON } from "@/lib/canvas/export";
import useCanvasStore from "@/store/useCanvasStore";

export default function ShareExportModal({ boardId, boardTitle = "Untitled", onClose }) {
  const [tab, setTab]               = useState("share");
  const [shareMode, setShareMode]   = useState("private");
  const [linkCopied, setLinkCopied] = useState(false);
  const [exporting, setExporting]   = useState("");
  const [toast, setToast]           = useState(null);
  const [inviteEmail, setInviteEmail]       = useState("");
  const [invitePermission, setInvitePermission] = useState("editor");
  const [inviting, setInviting]     = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const fileRef = useRef(null);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/board/${boardId}` : "";

  const isDemo = !boardId || boardId === "demo";

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load collaborators on open
  useEffect(() => {
    if (isDemo || tab !== "share") return;
    setLoadingCollabs(true);
    fetch(`/api/boards/${boardId}/invite`)
      .then((r) => r.json())
      .then((d) => setCollaborators(d.collaborators || []))
      .catch(() => {})
      .finally(() => setLoadingCollabs(false));
  }, [boardId, tab]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { showToast("Could not copy to clipboard", "error"); }
  };

  const handleShareModeChange = async (mode) => {
    setShareMode(mode);
    if (isDemo) return;
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareMode: mode }),
      });
      if (!res.ok) showToast("Failed to update sharing mode", "error");
    } catch { showToast("Failed to update sharing mode", "error"); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) return;
    if (isDemo) { showToast("Save the board first before inviting collaborators", "error"); return; }

    setInviting(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), permission: invitePermission }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to send invite", "error");
        return;
      }

      showToast(data.message || `Invite sent to ${inviteEmail}!`);
      setInviteEmail("");

      // If a real user was added, refresh collaborators list
      if (data.collaborator) {
        setCollaborators((prev) => [...prev, { user: data.collaborator, permission: invitePermission }]);
      }
    } catch (e) {
      showToast(e.message || "Failed to send invite", "error");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    if (isDemo) return;
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/boards/${boardId}/invite`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Failed to remove collaborator", "error"); return; }
      setCollaborators((prev) => prev.filter((c) => String(c.user?._id || c.user) !== String(userId)));
      showToast("Collaborator removed");
    } catch {
      showToast("Failed to remove collaborator", "error");
    } finally {
      setRemovingId(null);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      if (format === "png")  await exportAsPNG();
      if (format === "svg")  exportAsSVG(boardTitle);
      if (format === "json") exportAsJSON(boardTitle);
      showToast(`Exported as ${format.toUpperCase()}!`);
    } catch (e) {
      showToast(e.message || "Export failed", "error");
    } finally { setExporting(""); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const elements = await importFromJSON(file);
      useCanvasStore.getState().setElements(elements);
      showToast(`Imported ${elements.length} elements!`);
      onClose();
    } catch (e) { showToast(e.message || "Import failed", "error"); }
    e.target.value = "";
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} id="share-export-modal">
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--bg-overlay)" }} />

      {/* Modal */}
      <div style={{ position: "relative", width: "min(500px, calc(100vw - 32px))", maxHeight: "min(90vh, 640px)", display: "flex", flexDirection: "column", background: "var(--bg-elevated)", borderRadius: 20, border: "1px solid var(--border-color)", boxShadow: "var(--shadow-xl)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 0", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>Share & Export</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: 1 }}>{boardTitle}</div>
          </div>
          <button onClick={onClose} id="share-modal-close" style={ghostBtn}><X size={15} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "14px 20px 0", flexShrink: 0 }}>
          {[["share", "Share"], ["export", "Export"], ["import", "Import"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} id={`share-tab-${id}`}
              style={{ padding: "6px 16px", borderRadius: 20, fontSize: "0.8rem", cursor: "pointer", border: tab === id ? "1px solid var(--accent-border)" : "1px solid var(--border-color)", background: tab === id ? "var(--accent-muted)" : "transparent", color: tab === id ? "var(--accent)" : "var(--text-secondary)", fontWeight: tab === id ? 600 : 400, transition: "all 150ms" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ margin: "12px 20px 0", padding: "9px 13px", background: toast.type === "error" ? "var(--danger-muted)" : "var(--success-muted)", border: `1px solid ${toast.type === "error" ? "var(--danger)" : "var(--success)"}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: toast.type === "error" ? "var(--danger)" : "var(--success)", flexShrink: 0 }}>
            {toast.type === "error" ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />} {toast.msg}
          </div>
        )}

        {/* Scrollable body */}
        <div style={{ padding: "14px 20px 20px", overflowY: "auto", flex: 1 }}>

          {/* ── SHARE TAB ── */}
          {tab === "share" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Access mode */}
              <div>
                <div style={sLabel}>Access Mode</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { mode: "private", icon: Lock,  label: "Private",          desc: "Only collaborators" },
                    { mode: "link",    icon: Globe,  label: "Anyone with link", desc: "Anyone can view" },
                  ].map(({ mode, icon: Icon, label, desc }) => (
                    <button key={mode} onClick={() => handleShareModeChange(mode)}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left", border: shareMode === mode ? "2px solid var(--accent)" : "1px solid var(--border-color)", background: shareMode === mode ? "var(--accent-muted)" : "var(--bg-secondary)", transition: "all 150ms" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                        <Icon size={12} style={{ color: shareMode === mode ? "var(--accent)" : "var(--text-secondary)" }} />
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: shareMode === mode ? "var(--accent)" : "var(--text-primary)" }}>{label}</span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shareable link */}
              <div>
                <div style={sLabel}>Board Link</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input readOnly value={shareUrl} id="share-link-input"
                    style={{ flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 10px", fontSize: "0.78rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", outline: "none", overflow: "hidden", textOverflow: "ellipsis" }} />
                  <button onClick={handleCopyLink} id="copy-link-btn"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: linkCopied ? "var(--success-muted)" : "var(--accent)", color: linkCopied ? "var(--success)" : "white", border: linkCopied ? "1px solid var(--success)" : "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, transition: "all 200ms", whiteSpace: "nowrap" }}>
                    {linkCopied ? <><CheckCircle2 size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Invite by email */}
              <div>
                <div style={sLabel}>Invite Collaborators</div>

                {/* Email + permission row */}
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    placeholder="colleague@example.com" type="email" id="invite-email-input"
                    style={{ flex: 1, background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 10px", fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "var(--font-sans)", outline: "none" }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "var(--border-color)"; }} />

                  <select value={invitePermission} onChange={(e) => setInvitePermission(e.target.value)}
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 10px", fontSize: "0.8rem", color: "var(--text-primary)", cursor: "pointer", outline: "none" }}>
                    <option value="editor">Can Edit</option>
                    <option value="viewer">Can View</option>
                  </select>

                  <button onClick={handleInvite} disabled={inviting || !inviteEmail.includes("@")} id="invite-btn"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", cursor: inviting || !inviteEmail.includes("@") ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 600, opacity: inviting ? 0.6 : 1, whiteSpace: "nowrap" }}>
                    {inviting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Mail size={13} />}
                    {inviting ? "Sending…" : "Invite"}
                  </button>
                </div>

                {isDemo && (
                  <div style={{ padding: "8px 12px", background: "var(--warning-muted)", border: "1px solid var(--warning)", borderRadius: 8, fontSize: "0.76rem", color: "var(--warning)" }}>
                    ⚠️ You're on a demo board. Save a real board to invite teammates.
                  </div>
                )}

                {/* Collaborators list */}
                {!isDemo && (
                  <div>
                    <div style={{ ...sLabel, marginBottom: 6 }}>
                      Current Collaborators
                      {loadingCollabs && <Loader2 size={10} style={{ marginLeft: 6, animation: "spin 1s linear infinite", display: "inline" }} />}
                    </div>
                    {collaborators.length === 0 && !loadingCollabs ? (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", padding: "8px 0" }}>
                        No collaborators yet. Invite someone above.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {collaborators.map((c, i) => {
                          const u = c.user || {};
                          const uid = u._id || u;
                          const initials = (u.name || u.email || "?")[0]?.toUpperCase();
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                              {/* Avatar */}
                              {u.avatar ? (
                                <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)" }}>
                                  {initials}
                                </div>
                              )}
                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name || "Pending"}</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || uid}</div>
                              </div>
                              {/* Permission badge */}
                              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: c.permission === "editor" ? "var(--accent-muted)" : "var(--bg-tertiary)", fontSize: "0.7rem", fontWeight: 600, color: c.permission === "editor" ? "var(--accent)" : "var(--text-secondary)" }}>
                                {c.permission === "editor" ? <Edit3 size={9} /> : <Eye size={9} />}
                                {c.permission === "editor" ? "Editor" : "Viewer"}
                              </div>
                              {/* Remove button */}
                              <button onClick={() => handleRemoveCollaborator(String(uid))}
                                disabled={removingId === String(uid)}
                                title="Remove collaborator"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "var(--danger-muted)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "none"; }}>
                                {removingId === String(uid) ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <UserMinus size={13} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── EXPORT TAB ── */}
          {tab === "export" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={sLabel}>Download Format</div>
              {[
                { format: "png",  Icon: Image,    label: "PNG Image",   desc: "High-res raster image (2× retina)" },
                { format: "svg",  Icon: Code2,    label: "SVG Vector",  desc: "Infinitely scalable, web-ready" },
                { format: "json", Icon: FileJson, label: "JSON Data",   desc: "Raw canvas data, re-importable" },
              ].map(({ format, Icon, label, desc }) => (
                <button key={format} onClick={() => handleExport(format)} disabled={!!exporting} id={`export-${format}-btn`}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", cursor: exporting ? "not-allowed" : "pointer", opacity: exporting && exporting !== format ? 0.5 : 1, transition: "all 150ms", textAlign: "left" }}
                  onMouseEnter={(e) => { if (!exporting) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-muted)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.background = "var(--bg-secondary)"; }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {exporting === format
                      ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
                      : <Icon size={16} style={{ color: "var(--accent)" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{desc}</div>
                  </div>
                  <Download size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}

          {/* ── IMPORT TAB ── */}
          {tab === "import" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={sLabel}>Import Canvas</div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: "2px dashed var(--border-color)", borderRadius: 14, padding: "32px 20px", textAlign: "center", cursor: "pointer", transition: "all 150ms" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-muted)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.background = "transparent"; }}>
                <Upload size={28} style={{ color: "var(--text-tertiary)", marginBottom: 10 }} />
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>Drop a .json file or click to browse</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 6 }}>Only Structura JSON files are supported</div>
              </div>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} id="import-file-input" />
              <div style={{ padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10, fontSize: "0.78rem", color: "var(--text-tertiary)", border: "1px solid var(--border-subtle)" }}>
                ⚠️ Importing will <strong>replace</strong> all current canvas elements.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ghostBtn = { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", borderRadius: 6 };
const sLabel   = { fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 };
