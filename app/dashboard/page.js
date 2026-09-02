"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, Search, Grid3x3, List, MoreHorizontal, Star, StarOff,
  Clock, Share2, Trash2, Edit3, Copy, FileDown, ArrowUpRight,
  Sparkles, Users, Lock, Globe, Filter, SortAsc, Binary, Network,
  GitBranch, TrendingUp, Zap
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import ThemeToggle from "@/components/ui/ThemeToggle";
import UserProfileMenu from "@/components/ui/UserProfileMenu";
import { timeAgo, stringToColor, getInitials } from "@/lib/utils";

/* ── Fake board data for skeleton ─────────────── */
const DEMO_BOARDS = [
  {
    id: "b1", title: "Auth Flow v2", type: "FLOWCHART", updatedAt: new Date(Date.now() - 7200000),
    elements: 46, collaborators: 2, starred: true, isOwner: true,
    preview: "auth", description: "OAuth2 + JWT authentication architecture with refresh token flow",
  },
  {
    id: "b2", title: "Binary Tree Dry Run", type: "DSA", updatedAt: new Date(Date.now() - 86400000),
    elements: 18, collaborators: 0, starred: false, isOwner: true,
    preview: "tree", description: "BST insertion and inorder traversal step-by-step",
  },
  {
    id: "b3", title: "GraphQL Schema Map", type: "DIAGRAM", updatedAt: new Date(Date.now() - 259200000),
    elements: 31, collaborators: 3, starred: false, isOwner: false,
    preview: "graph", description: "Full GraphQL type definitions and resolver hierarchy",
  },
  {
    id: "b4", title: "Core Microservices", type: "ARCHITECTURE", updatedAt: new Date(Date.now() - 432000000),
    elements: 112, collaborators: 4, starred: true, isOwner: true,
    preview: "micro", description: "Distributed service mesh with Kafka, Redis, and PostgreSQL",
  },
  {
    id: "b5", title: "Dijkstra Visualization", type: "DSA", updatedAt: new Date(Date.now() - 600000000),
    elements: 22, collaborators: 1, starred: false, isOwner: true,
    preview: "dijkstra", description: "Shortest path algorithm with weighted graph",
  },
  {
    id: "b6", title: "React Component Tree", type: "DIAGRAM", updatedAt: new Date(Date.now() - 900000000),
    elements: 38, collaborators: 0, starred: false, isOwner: true,
    preview: "react", description: "Component hierarchy with state and prop flow",
  },
];

const TYPE_COLORS = {
  DSA: { bg: "var(--accent-muted)", color: "var(--accent)", border: "var(--accent-border)" },
  FLOWCHART: { bg: "var(--success-muted)", color: "var(--success)", border: "rgba(52,211,153,0.2)" },
  ARCHITECTURE: { bg: "var(--warning-muted)", color: "var(--warning)", border: "rgba(251,191,36,0.2)" },
  DIAGRAM: { bg: "var(--info-muted)", color: "var(--info)", border: "rgba(96,165,250,0.2)" },
};

/* ── Mini canvas thumbnail ─────────────────────── */
function BoardThumbnail({ type, title }) {
  const icons = {
    tree: <Binary size={32} style={{ color: "var(--accent)" }} />,
    auth: <Lock size={32} style={{ color: "var(--success)" }} />,
    graph: <Network size={32} style={{ color: "var(--info)" }} />,
    micro: <GitBranch size={32} style={{ color: "var(--warning)" }} />,
    dijkstra: <TrendingUp size={32} style={{ color: "var(--accent)" }} />,
    react: <Zap size={32} style={{ color: "var(--warning)" }} />,
  };
  return (
    <div
      className="dot-grid"
      style={{
        height: "140px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--canvas-bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, var(--accent-muted) 0%, transparent 70%)",
          opacity: 0.6,
        }}
      />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {icons[type] || <Binary size={32} style={{ color: "var(--accent)" }} />}
        <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
          {title.substring(0, 20)}
        </span>
      </div>
    </div>
  );
}

/* ── Board Card (grid) ──────────────────────────── */
function BoardCard({ board, onStar, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const typeStyle = TYPE_COLORS[board.type] || TYPE_COLORS.DIAGRAM;

  return (
    <div
      className="card"
      style={{ overflow: "hidden", cursor: "default", position: "relative" }}
      id={`board-card-${board.id}`}
    >
      {/* Thumbnail */}
      <Link href={`/board/${board.id}`} style={{ display: "block", textDecoration: "none" }}>
        <BoardThumbnail type={board.preview} title={board.title} />
      </Link>

      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <Link
            href={`/board/${board.id}`}
            style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)", textDecoration: "none", flex: 1, lineHeight: 1.3 }}
          >
            {board.title}
          </Link>
          {/* Star */}
          <button
            onClick={() => onStar(board.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: board.starred ? "var(--warning)" : "var(--text-tertiary)", padding: 2, flexShrink: 0 }}
            aria-label={board.starred ? "Unstar board" : "Star board"}
            id={`star-board-${board.id}`}
          >
            {board.starred ? <Star size={14} fill="var(--warning)" /> : <Star size={14} />}
          </button>
          {/* Menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 2 }}
              aria-label="Board options"
              id={`board-menu-${board.id}`}
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
                  zIndex: 100,
                  overflow: "hidden",
                  animation: "fadeInScale 0.15s ease both",
                }}
              >
                {[
                  { icon: Edit3, label: "Rename", id: `rename-${board.id}` },
                  { icon: Copy, label: "Duplicate", id: `duplicate-${board.id}` },
                  { icon: Share2, label: "Share", id: `share-${board.id}` },
                  { icon: FileDown, label: "Export", id: `export-${board.id}` },
                  { icon: Trash2, label: "Delete", id: `delete-${board.id}`, danger: true },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={item.id}
                      onClick={() => {
                        setMenuOpen(false);
                        if (item.label === "Delete") onDelete(board.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "8px 14px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        color: item.danger ? "var(--danger)" : "var(--text-secondary)",
                        textAlign: "left",
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

        {/* Type badge + meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span
            className="badge"
            style={{ background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`, fontSize: "0.65rem" }}
          >
            {board.type}
          </span>
          {!board.isOwner && (
            <span className="badge badge-success" style={{ fontSize: "0.65rem" }}>Shared</span>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} />
            {timeAgo(board.updatedAt)}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {board.collaborators > 0 && (
              <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 3 }}>
                <Users size={11} />
                {board.collaborators}
              </span>
            )}
            <span style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
              {board.elements} elements
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Board Row (list) ───────────────────────────── */
function BoardRow({ board, onStar, onDelete }) {
  const typeStyle = TYPE_COLORS[board.type] || TYPE_COLORS.DIAGRAM;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        transition: "background var(--transition-fast)",
        cursor: "default",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      id={`board-row-${board.id}`}
    >
      <Link href={`/board/${board.id}`} style={{ textDecoration: "none", flex: "0 0 28px" }}>
        <div
          style={{
            width: 28,
            height: 28,
            background: typeStyle.bg,
            border: `1px solid ${typeStyle.border}`,
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Binary size={13} style={{ color: typeStyle.color }} />
        </div>
      </Link>
      <Link href={`/board/${board.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 2 }}>{board.title}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {board.description}
        </div>
      </Link>
      <span className="badge" style={{ background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`, fontSize: "0.65rem", flexShrink: 0 }}>
        {board.type}
      </span>
      <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", width: 80, textAlign: "right", flexShrink: 0 }}>
        {timeAgo(board.updatedAt)}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <button onClick={() => onStar(board.id)} style={{ background: "none", border: "none", cursor: "pointer", color: board.starred ? "var(--warning)" : "var(--text-tertiary)", padding: 4 }} id={`star-row-${board.id}`}>
          {board.starred ? <Star size={13} fill="var(--warning)" /> : <Star size={13} />}
        </button>
        <Link href={`/board/${board.id}`} style={{ color: "var(--text-tertiary)", display: "flex", padding: 4 }} id={`open-row-${board.id}`}>
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────── */
export default function DashboardPage() {
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [boards, setBoards] = useState(DEMO_BOARDS);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  // Load real boards from MongoDB
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/boards");
        if (res.ok) {
          const { boards: data } = await res.json();
          if (data?.length) {
            setBoards(data.map((b) => ({
              ...b,
              id: b._id,
              elements: b.elements?.length ?? 0,
              collaborators: b.collaborators?.length ?? 0,
              isOwner: true,
              starred: false,
              preview: "graph",
              description: b.description || "Blank board",
            })));
          }
        }
      } catch (e) {
        console.warn("[Dashboard] Could not load boards:", e.message);
      } finally {
        setBoardsLoading(false);
      }
    })();
  }, []);

  const filtered = boards.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStar = (id) =>
    setBoards((bs) => bs.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b)));

  const deleteBoard = (id) =>
    setBoards((bs) => bs.filter((b) => b.id !== id));

  const createBoard = async () => {
    if (!newBoardName.trim()) return;
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBoardName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create board");
      // Navigate to the new board immediately
      window.location.href = `/board/${data.board._id}`;
    } catch (e) {
      console.error("[createBoard]", e.message);
      // Fallback: add optimistically with temp ID
      const nb = {
        id: `temp-${Date.now()}`, _id: `temp-${Date.now()}`,
        title: newBoardName.trim(), type: "DIAGRAM",
        updatedAt: new Date(), elements: 0, collaborators: 0,
        starred: false, isOwner: true, preview: "graph",
      };
      setBoards([nb, ...boards]);
      setShowNewModal(false);
      setNewBoardName("");
    }
  };

  const quickTemplates = [
    { icon: <Binary size={20} style={{ color: "var(--accent)" }} />, label: "DSA Visualizer", desc: "Array, Tree, Graph…", type: "DSA" },
    { icon: <Network size={20} style={{ color: "var(--warning)" }} />, label: "System Design", desc: "Microservices, APIs…", type: "ARCHITECTURE" },
    { icon: <GitBranch size={20} style={{ color: "var(--success)" }} />, label: "Flowchart", desc: "Auth flow, logic…", type: "FLOWCHART" },
    { icon: <Sparkles size={20} style={{ color: "var(--info)" }} />, label: "AI Generate", desc: "Describe and create", type: "AI" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar />

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 240, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header
          style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-primary)",
            position: "sticky",
            top: 0,
            zIndex: 30,
            gap: 12,
          }}
          id="dashboard-header"
        >
          {/* Search */}
          <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
            <input
              type="search"
              className="input"
              placeholder="Search boards, elements, text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, height: 36, fontSize: "0.85rem" }}
              id="dashboard-search"
              aria-label="Search boards"
            />
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewModal(true)} style={{ gap: 6 }} id="dashboard-create-board">
              <Plus size={14} />
              Create Board
            </button>
            <UserProfileMenu placement="bottom" />
          </div>
        </header>

        {/* Body */}
        <main style={{ flex: 1, padding: "28px" }} id="dashboard-main">
          {/* Quick templates */}
          <section style={{ marginBottom: 36 }} id="quick-templates">
            <h2 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
              Quick start
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {/* Blank canvas */}
              <button
                onClick={() => setShowNewModal(true)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "24px",
                  border: "2px dashed var(--border-color)",
                  borderRadius: "var(--radius-lg)",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  transition: "all var(--transition-base)",
                  minHeight: 110,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                  e.currentTarget.style.background = "transparent";
                }}
                id="quick-blank-canvas"
              >
                <div style={{ width: 36, height: 36, border: "1.5px dashed currentColor", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "inherit", marginBottom: 2 }}>Blank Canvas</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Start from scratch</div>
                </div>
              </button>

              {quickTemplates.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    setNewBoardName(`New ${t.label}`);
                    setShowNewModal(true);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "20px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all var(--transition-base)",
                    minHeight: 110,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-border)";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "";
                  }}
                  id={`quick-${t.type.toLowerCase()}`}
                >
                  <div style={{ width: 36, height: 36, background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {t.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Boards section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
              My Boards
              <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 8 }}>
                {filtered.length} board{filtered.length !== 1 ? "s" : ""}
              </span>
            </h2>
            {/* Sort / Filter */}
            <button className="btn btn-ghost btn-sm" style={{ gap: 5 }} id="sort-boards">
              <SortAsc size={13} /> Sort
            </button>
            <button className="btn btn-ghost btn-sm" style={{ gap: 5 }} id="filter-boards">
              <Filter size={13} /> Filter
            </button>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 2, background: "var(--bg-tertiary)", padding: 3, borderRadius: "var(--radius-md)" }}>
              <button
                onClick={() => setViewMode("grid")}
                className="btn btn-icon btn-sm"
                style={{ background: viewMode === "grid" ? "var(--bg-elevated)" : "transparent", color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-tertiary)", border: viewMode === "grid" ? "1px solid var(--border-color)" : "1px solid transparent", transition: "all var(--transition-fast)" }}
                id="view-grid"
                aria-label="Grid view"
              >
                <Grid3x3 size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="btn btn-icon btn-sm"
                style={{ background: viewMode === "list" ? "var(--bg-elevated)" : "transparent", color: viewMode === "list" ? "var(--text-primary)" : "var(--text-tertiary)", border: viewMode === "list" ? "1px solid var(--border-color)" : "1px solid transparent", transition: "all var(--transition-fast)" }}
                id="view-list"
                aria-label="List view"
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 24px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📋</div>
              <h3 style={{ marginBottom: 8, color: "var(--text-primary)" }}>No boards found</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
                {search ? `No boards matching "${search}"` : "Create your first board to get started"}
              </p>
              <button onClick={() => setShowNewModal(true)} className="btn btn-primary" id="empty-create-board">
                <Plus size={15} /> Create Board
              </button>
            </div>
          )}

          {/* Grid view */}
          {viewMode === "grid" && filtered.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }} id="boards-grid">
              {filtered.map((b) => (
                <BoardCard key={b.id} board={b} onStar={toggleStar} onDelete={deleteBoard} />
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode === "list" && filtered.length > 0 && (
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)", overflow: "hidden" }} id="boards-list">
              {filtered.map((b) => (
                <BoardRow key={b.id} board={b} onStar={toggleStar} onDelete={deleteBoard} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── New Board Modal ── */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--bg-overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewModal(false); }}
          id="new-board-modal-overlay"
        >
          <div
            className="animate-scale-in"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-xl)",
              padding: "32px",
              width: "100%",
              maxWidth: 440,
              boxShadow: "var(--shadow-xl)",
            }}
            id="new-board-modal"
          >
            <h2 style={{ fontSize: "1.25rem", marginBottom: 6 }}>Create new board</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 24 }}>
              Give your board a name and start building.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label className="input-label" htmlFor="new-board-name">Board name</label>
              <input
                id="new-board-name"
                type="text"
                className="input"
                placeholder="e.g. DSA Practice, System Design…"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createBoard()}
                autoFocus
              />
            </div>

            {/* Visibility */}
            <div style={{ marginBottom: 24 }}>
              <label className="input-label">Visibility</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { icon: Lock, label: "Private" },
                  { icon: Globe, label: "Public" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, gap: 6 }}
                    id={`visibility-${label.toLowerCase()}`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowNewModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                id="cancel-new-board"
              >
                Cancel
              </button>
              <button
                onClick={createBoard}
                className="btn btn-primary"
                disabled={!newBoardName.trim()}
                style={{ flex: 1, gap: 6 }}
                id="confirm-new-board"
              >
                <Plus size={15} />
                Create Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
