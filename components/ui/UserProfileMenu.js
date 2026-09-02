"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Settings, LogOut, Loader2
} from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import { getInitials, stringToColor } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import toast from "react-hot-toast";

/**
 * User Profile Avatar trigger with dropdown menu for account actions & logout.
 */
export default function UserProfileMenu({
  placement = "bottom", // "bottom" (drops downward) | "top" (drops upward)
  compact = false,
}) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);

  const displayName = user?.name || "Guest User";
  const displayEmail = user?.email || "guest@structura.dev";
  const avatarColor = stringToColor(displayName);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out successfully");
      router.push(ROUTES.LOGIN);
    } catch {
      toast.error("Failed to sign out");
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      {/* Avatar Circle Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: compact ? 30 : 34,
          height: compact ? 30 : 34,
          borderRadius: "50%",
          background: avatarColor,
          color: "#ffffff",
          fontSize: "0.75rem",
          fontWeight: 700,
          border: isOpen ? "2px solid var(--accent)" : "2px solid transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transition: "all 0.15s ease",
          outline: "none",
        }}
        id="user-avatar-trigger"
        aria-label="Open user profile menu"
        aria-expanded={isOpen}
      >
        {getInitials(displayName)}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            ...(placement === "top"
              ? { bottom: "calc(100% + 8px)", right: 0, minWidth: 230 }
              : { top: "calc(100% + 8px)", right: 0, minWidth: 230 }),
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xl)",
            padding: "6px",
            zIndex: 999,
            animation: "fadeInScale 0.15s ease both",
          }}
          id="user-profile-menu-popover"
        >
          {/* User Details Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px 10px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: avatarColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#ffffff",
                flexShrink: 0,
              }}
            >
              {getInitials(displayName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                {displayEmail}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ padding: "6px 0 2px" }}>
            <Link
              href={ROUTES.DASHBOARD}
              onClick={() => setIsOpen(false)}
              style={menuItemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LayoutDashboard size={14} style={{ color: "var(--text-secondary)" }} />
              <span style={{ flex: 1 }}>Dashboard</span>
            </Link>

            <Link
              href={ROUTES.SETTINGS}
              onClick={() => setIsOpen(false)}
              style={menuItemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Settings size={14} style={{ color: "var(--text-secondary)" }} />
              <span style={{ flex: 1 }}>Account Settings</span>
            </Link>
          </div>

          <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 2px" }} />

          {/* Sign Out / Logout Button */}
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            style={{
              ...menuItemStyle,
              width: "100%",
              color: "var(--danger)",
              fontWeight: 500,
              background: "transparent",
              border: "none",
              cursor: isLoggingOut ? "not-allowed" : "pointer",
              opacity: isLoggingOut ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoggingOut) {
                e.currentTarget.style.background = "var(--danger-muted)";
                e.currentTarget.style.color = "var(--danger)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--danger)";
            }}
            id="profile-signout-btn"
          >
            {isLoggingOut ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Signing out…</span>
              </>
            ) : (
              <>
                <LogOut size={14} />
                <span>Log out</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: "var(--radius-sm)",
  textDecoration: "none",
  color: "var(--text-primary)",
  fontSize: "0.8125rem",
  transition: "all 0.15s ease",
  cursor: "pointer",
  boxSizing: "border-box",
};
