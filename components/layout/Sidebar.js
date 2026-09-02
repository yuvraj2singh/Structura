"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock, LayoutGrid, Users, Settings, Plus, Search,
  Star, Trash2, HelpCircle
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { ROUTES } from "@/lib/constants";

const NAV_ITEMS = [
  { icon: Clock,       label: "Recent",      href: "/dashboard?view=recent",   id: "sidebar-recent" },
  { icon: LayoutGrid,  label: "My Boards",   href: "/dashboard?view=mine",     id: "sidebar-mine" },
  { icon: Star,        label: "Starred",     href: "/dashboard?view=starred",  id: "sidebar-starred" },
  { icon: Users,       label: "Shared",      href: "/dashboard?view=shared",   id: "sidebar-shared" },
  { icon: Trash2,      label: "Trash",       href: "/dashboard?view=trash",    id: "sidebar-trash" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        overflow: "hidden",
      }}
      id="dashboard-sidebar"
    >
      {/* Logo area */}
      <div
        style={{
          padding: "18px 16px 14px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Logo size="sm" />
        <span className="badge badge-accent" style={{ marginLeft: "auto", fontSize: "0.65rem" }}>Beta</span>
      </div>

      {/* New board button */}
      <div style={{ padding: "12px 12px 8px" }}>
        <Link
          href={ROUTES.DASHBOARD}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", gap: 6, fontSize: "0.8375rem" }}
          id="sidebar-new-board"
        >
          <Plus size={15} />
          New Board
        </Link>
      </div>

      {/* Search */}
      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            className="input"
            placeholder="Search boards…"
            style={{ paddingLeft: 30, fontSize: "0.8125rem", height: 34 }}
            id="sidebar-search"
            aria-label="Search boards"
          />
        </div>
      </div>

      <hr className="divider" style={{ margin: "0 12px" }} />

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }} aria-label="Dashboard navigation">
        <div style={{ marginBottom: 4, padding: "4px 8px", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname + (typeof window !== "undefined" ? window.location.search : "") === item.href ||
            (item.href === "/dashboard?view=mine" && pathname === "/dashboard");

          return (
            <Link
              key={item.id}
              href={item.href}
              id={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                background: isActive ? "var(--accent-muted)" : "transparent",
                fontSize: "0.875rem",
                fontWeight: isActive ? 500 : 400,
                marginBottom: 1,
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}

        {/* Team section */}
        <div style={{ marginTop: 16, marginBottom: 4, padding: "4px 8px", fontSize: "0.7rem", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Teams
        </div>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 10px",
            borderRadius: "var(--radius-md)",
            width: "100%",
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            cursor: "pointer",
            textAlign: "left",
          }}
          id="sidebar-invite-team"
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "1.5px dashed var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={11} style={{ color: "var(--text-tertiary)" }} />
          </div>
          <span>Invite teammates</span>
        </button>
      </nav>

      <hr className="divider" />

      {/* Bottom — user + settings */}
      <div style={{ padding: "12px" }}>
        <Link
          href={ROUTES.SETTINGS}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 10px",
            borderRadius: "var(--radius-md)",
            textDecoration: "none",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            marginBottom: 4,
          }}
          id="sidebar-settings"
        >
          <Settings size={15} />
          Settings
        </Link>
        <Link
          href="#"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 10px",
            borderRadius: "var(--radius-md)",
            textDecoration: "none",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
          }}
          id="sidebar-help"
        >
          <HelpCircle size={15} />
          Help & Docs
        </Link>
      </div>
    </aside>
  );
}
