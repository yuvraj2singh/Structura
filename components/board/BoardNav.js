"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft, Share2, Users, Cloud, CloudOff, CheckCircle2,
  Loader2, MoreHorizontal, Download, History, MessageSquare,
  Settings, Star
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { stringToColor, getInitials } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

const SAVE_STATES = {
  saved: { label: "Saved", icon: CheckCircle2, color: "var(--success)" },
  saving: { label: "Saving…", icon: Loader2, color: "var(--text-tertiary)" },
  error: { label: "Save failed", icon: CloudOff, color: "var(--danger)" },
  unsaved: { label: "Unsaved changes", icon: Cloud, color: "var(--warning)" },
};

export default function BoardNav({
  title = "Untitled Board",
  saveState = "saved",
  collaborators = [],
  collaboratorSlot = null,
  connected = false,
  onTitleChange,
  onShare,
  onHistory,
  onExport,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const { label: saveLabel, icon: SaveIcon, color: saveColor } = SAVE_STATES[saveState];

  const handleTitleSave = () => {
    setEditingTitle(false);
    if (localTitle.trim() && localTitle !== title) {
      onTitleChange?.(localTitle.trim());
    } else {
      setLocalTitle(title);
    }
  };

  return (
    <header
      style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-primary)",
        gap: 8,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
      id="board-nav"
    >
      {/* Left — Back + Logo + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
        <Link
          href={ROUTES.DASHBOARD}
          className="btn btn-ghost btn-icon"
          style={{ flexShrink: 0 }}
          id="board-back"
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={16} />
        </Link>

        <Logo size="sm" showText={false} />

        <div style={{ width: 1, height: 20, background: "var(--border-color)", flexShrink: 0 }} />

        {/* Editable title */}
        {editingTitle ? (
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") { setLocalTitle(title); setEditingTitle(false); }
            }}
            autoFocus
            style={{
              border: "none",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              outline: "2px solid var(--accent)",
              minWidth: 120,
              maxWidth: 300,
            }}
            id="board-title-input"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              color: "var(--text-primary)",
              padding: "4px 6px",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 280,
              transition: "background var(--transition-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            id="board-title-btn"
            aria-label="Click to rename board"
          >
            {title}
          </button>
        )}

        {/* Save status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: "var(--radius-full)",
            background: "transparent",
          }}
        >
          <SaveIcon
            size={12}
            style={{
              color: saveColor,
              animation: saveState === "saving" ? "spin-slow 1s linear infinite" : "none",
            }}
          />
          <span style={{ fontSize: "0.75rem", color: saveColor, whiteSpace: "nowrap" }}>
            {saveLabel}
          </span>
        </div>
      </div>

      {/* Right — Collaborators + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Live collaborator avatars (from Socket.IO collab store) */}
        {collaboratorSlot && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {collaboratorSlot}
            {/* Connection indicator dot */}
            <div title={connected ? "Live sync active" : "Offline — changes saved locally"} style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "var(--success)" : "var(--text-tertiary)", flexShrink: 0, boxShadow: connected ? "0 0 6px var(--success)" : "none", transition: "all 400ms" }} />
          </div>
        )}

        {/* Fallback: static collaborators prop (no socket) */}
        {!collaboratorSlot && collaborators.length > 0 && (
          <div style={{ display: "flex", alignItems: "center" }}>
            {collaborators.slice(0, 3).map((c, i) => (
              <div key={c.id || i} title={c.name} style={{ width: 28, height: 28, borderRadius: "50%", background: c.color || stringToColor(c.name), border: "2px solid var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 600, color: "white", marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i, position: "relative" }}>
                {getInitials(c.name)}
              </div>
            ))}
            {collaborators.length > 3 && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-tertiary)", border: "2px solid var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 600, color: "var(--text-secondary)", marginLeft: -8 }}>
                +{collaborators.length - 3}
              </div>
            )}
          </div>
        )}

        <ThemeToggle />

        {/* History */}
        <button
          className="btn btn-ghost btn-icon tooltip"
          data-tooltip="Version history"
          onClick={onHistory}
          id="board-history-btn"
          aria-label="Version history"
        >
          <History size={15} />
        </button>

        {/* Comments */}
        <button
          className="btn btn-ghost btn-icon tooltip"
          data-tooltip="Comments"
          id="board-comments-btn"
          aria-label="Comments"
        >
          <MessageSquare size={15} />
        </button>

        {/* Share */}
        <button
          onClick={onShare}
          className="btn btn-primary btn-sm"
          style={{ gap: 5 }}
          id="board-share-btn"
        >
          <Share2 size={13} />
          Share
        </button>

        {/* More options */}
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setMenuOpen(!menuOpen)}
            id="board-more-btn"
            aria-label="More board options"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                minWidth: 160,
                overflow: "hidden",
                zIndex: 100,
                animation: "fadeInScale 0.15s ease both",
              }}
            >
              {[
                { icon: Star, label: "Star board", id: "board-star" },
                { icon: Download, label: "Export", id: "board-export", action: onExport },
                { icon: Users, label: "Manage access", id: "board-access" },
                { icon: Settings, label: "Board settings", id: "board-settings" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={item.id}
                    onClick={() => { setMenuOpen(false); item.action?.(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "8px 14px", background: "none",
                      border: "none", cursor: "pointer", fontSize: "0.8125rem",
                      color: "var(--text-secondary)", textAlign: "left",
                      transition: "background var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <Icon size={13} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
