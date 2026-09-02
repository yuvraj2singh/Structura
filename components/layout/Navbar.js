"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LayoutDashboard, User, LogOut, Settings, Sparkles } from "lucide-react";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import useAuthStore from "@/store/useAuthStore";
import { getInitials, stringToColor } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, restoreSession } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isAuthenticated = Boolean(user);
  const isHome = pathname === "/";

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push(ROUTES.LOGIN);
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--bg-primary)",
        backdropFilter: isHome ? "blur(12px)" : "none",
      }}
      id="main-navbar"
    >
      {/* Left — Logo */}
      <Logo />

      {/* Right — Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ThemeToggle />

        {isAuthenticated ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }} ref={menuRef}>
            <Link href={ROUTES.DASHBOARD} className="btn btn-ghost btn-sm" id="nav-dashboard">
              <LayoutDashboard size={15} />
              Dashboard
            </Link>

            {/* Avatar button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn btn-icon"
              style={{
                background: stringToColor(user?.name || "User"),
                color: "white",
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "transform 0.15s ease",
              }}
              id="nav-user-avatar"
              aria-label="Open user profile menu"
            >
              {getInitials(user?.name || "U")}
            </button>

            {/* Profile Dropdown */}
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  width: 220,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-xl)",
                  padding: "6px",
                  zIndex: 100,
                  animation: "fadeInScale 0.15s ease both",
                }}
                id="user-profile-dropdown"
              >
                {/* User info banner */}
                <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.name || "User"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.email || ""}
                  </div>
                </div>

                <Link
                  href={ROUTES.DASHBOARD}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    fontSize: "0.8125rem",
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>

                <Link
                  href={ROUTES.SETTINGS}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    fontSize: "0.8125rem",
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Settings size={14} />
                  Settings
                </Link>

                <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />

                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--danger)",
                    background: "none",
                    border: "none",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--danger-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  id="nav-logout-btn"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href={ROUTES.LOGIN} className="btn btn-ghost btn-sm" id="nav-login">
              <LogIn size={15} />
              Sign in
            </Link>
            <Link href={ROUTES.REGISTER} className="btn btn-primary btn-sm" id="nav-register">
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
