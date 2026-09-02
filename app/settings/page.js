"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Mail, Lock, Bell, Palette, Globe, Shield,
  Trash2, LogOut, ChevronRight, Camera, Check, Moon, Sun, Loader2
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import useThemeStore from "@/store/useThemeStore";
import useAuthStore from "@/store/useAuthStore";
import { getInitials, stringToColor } from "@/lib/utils";
import { THEMES, ROUTES } from "@/lib/constants";
import toast from "react-hot-toast";

const SECTIONS = [
  { id: "profile",       icon: User,    label: "Profile" },
  { id: "appearance",    icon: Palette, label: "Appearance" },
  { id: "notifications", icon: Bell,    label: "Notifications" },
  { id: "security",      icon: Shield,  label: "Security" },
  { id: "danger",        icon: Trash2,  label: "Danger Zone" },
];

function SectionTitle({ icon: Icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid var(--border-color)" }}>
      <div style={{ width: 34, height: 34, background: "var(--accent-muted)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--accent-border)" }}>
        <Icon size={16} style={{ color: "var(--accent)" }} />
      </div>
      <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, padding: "16px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 2 }}>{label}</div>
        {description && <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>{description}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, id }) {
  return (
    <label style={{ position: "relative", display: "inline-block", width: 40, height: 22, cursor: "pointer" }} id={id}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: checked ? "var(--accent)" : "var(--bg-tertiary)",
          borderRadius: 22,
          transition: "all var(--transition-base)",
          border: "1px solid var(--border-color)",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: checked ? 20 : 3,
          top: 3,
          width: 14,
          height: 14,
          background: "white",
          borderRadius: "50%",
          transition: "all var(--transition-base)",
        }}
      />
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const displayName = user?.name || "Guest User";
  const displayEmail = user?.email || "guest@structura.dev";
  const isDark = theme === THEMES.DARK;

  const [activeSection, setActiveSection] = useState("profile");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    collab: true,
    updates: false,
    digest: true,
  });
  const [nameInput, setNameInput] = useState(displayName);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success("Settings saved!");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
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
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 240, display: "flex", minHeight: "100vh" }}>
        {/* Settings sidebar */}
        <div
          style={{
            width: 200,
            borderRight: "1px solid var(--border-color)",
            padding: "20px 12px",
            background: "var(--bg-secondary)",
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
          }}
          id="settings-nav"
        >
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10, padding: "0 8px" }}>
            Settings
          </div>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                id={`settings-nav-${s.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: isActive ? "var(--accent-muted)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: isActive ? 500 : 400,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: 2,
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Main settings content */}
        <main style={{ flex: 1, padding: "32px 40px", maxWidth: 680 }} id="settings-content">
          {/* ── Profile ── */}
          {activeSection === "profile" && (
            <div className="animate-fade-in">
              <SectionTitle icon={User} title="Profile" />

              {/* Avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: stringToColor(displayName),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "white",
                    }}
                    id="settings-avatar"
                  >
                    {getInitials(displayName)}
                  </div>
                  <button
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      border: "2px solid var(--bg-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                    id="change-avatar-btn"
                    aria-label="Change avatar"
                  >
                    <Camera size={11} style={{ color: "white" }} />
                  </button>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{displayName}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{displayEmail}</div>
                  <span className="badge badge-accent" style={{ marginTop: 4, fontSize: "0.7rem" }}>Free plan</span>
                </div>
              </div>

              <SettingRow label="Display name" description="Your name visible to collaborators">
                <input
                  className="input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{ width: 220 }}
                  id="settings-name-input"
                  aria-label="Display name"
                />
              </SettingRow>
              <SettingRow label="Email address" description="Used for login and notifications">
                <input
                  className="input"
                  defaultValue={displayEmail}
                  type="email"
                  style={{ width: 220 }}
                  id="settings-email-input"
                  aria-label="Email address"
                />
              </SettingRow>
              <SettingRow label="Bio" description="Short description shown on your profile">
                <textarea
                  className="input"
                  placeholder="Tell us about yourself…"
                  rows={2}
                  style={{ width: 220, resize: "vertical" }}
                  id="settings-bio-input"
                  aria-label="Bio"
                />
              </SettingRow>

              <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                  style={{ gap: 6 }}
                  id="settings-save-profile"
                >
                  {saved ? <><Check size={14} /> Saved!</> : "Save changes"}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="btn btn-secondary"
                  style={{ gap: 6, color: "var(--danger)" }}
                  id="settings-profile-logout"
                >
                  {isLoggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  Log out
                </button>
              </div>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeSection === "appearance" && (
            <div className="animate-fade-in">
              <SectionTitle icon={Palette} title="Appearance" />

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 12 }}>Theme</div>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { value: THEMES.DARK, label: "Dark", icon: Moon, desc: "Easy on the eyes" },
                    { value: THEMES.LIGHT, label: "Light", icon: Sun, desc: "High contrast" },
                  ].map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      id={`theme-${value}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                        padding: "20px 28px",
                        border: `2px solid ${theme === value ? "var(--accent)" : "var(--border-color)"}`,
                        borderRadius: "var(--radius-lg)",
                        background: theme === value ? "var(--accent-muted)" : "var(--bg-secondary)",
                        cursor: "pointer",
                        transition: "all var(--transition-base)",
                        minWidth: 130,
                      }}
                    >
                      <Icon size={24} style={{ color: theme === value ? "var(--accent)" : "var(--text-secondary)" }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: theme === value ? "var(--accent)" : "var(--text-primary)" }}>{label}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{desc}</div>
                      </div>
                      {theme === value && <Check size={14} style={{ color: "var(--accent)" }} />}
                    </button>
                  ))}
                </div>
              </div>

              <SettingRow label="Compact mode" description="Reduce spacing in the dashboard">
                <Toggle checked={false} onChange={() => {}} id="toggle-compact" />
              </SettingRow>
              <SettingRow label="Show grid by default" description="Display grid on new boards">
                <Toggle checked={true} onChange={() => {}} id="toggle-grid-default" />
              </SettingRow>
              <SettingRow label="Snap to grid" description="Elements snap to nearest grid position">
                <Toggle checked={true} onChange={() => {}} id="toggle-snap" />
              </SettingRow>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeSection === "notifications" && (
            <div className="animate-fade-in">
              <SectionTitle icon={Bell} title="Notifications" />
              <SettingRow label="Email notifications" description="Receive important updates via email">
                <Toggle checked={notifications.email} onChange={(v) => setNotifications({ ...notifications, email: v })} id="notif-email" />
              </SettingRow>
              <SettingRow label="Collaboration alerts" description="When someone joins or edits your board">
                <Toggle checked={notifications.collab} onChange={(v) => setNotifications({ ...notifications, collab: v })} id="notif-collab" />
              </SettingRow>
              <SettingRow label="Product updates" description="New features and improvements">
                <Toggle checked={notifications.updates} onChange={(v) => setNotifications({ ...notifications, updates: v })} id="notif-updates" />
              </SettingRow>
              <SettingRow label="Weekly digest" description="Summary of your activity each week">
                <Toggle checked={notifications.digest} onChange={(v) => setNotifications({ ...notifications, digest: v })} id="notif-digest" />
              </SettingRow>
            </div>
          )}

          {/* ── Security ── */}
          {activeSection === "security" && (
            <div className="animate-fade-in">
              <SectionTitle icon={Shield} title="Security" />
              <SettingRow label="Current password" description="Enter your current password to change it">
                <input className="input" type="password" placeholder="Current password" style={{ width: 200 }} id="current-password" />
              </SettingRow>
              <SettingRow label="New password" description="Must be at least 8 characters">
                <input className="input" type="password" placeholder="New password" style={{ width: 200 }} id="new-password" />
              </SettingRow>
              <div style={{ marginTop: 20 }}>
                <button className="btn btn-primary" id="save-password">Update password</button>
              </div>
              <hr className="divider" style={{ margin: "28px 0" }} />
              <div>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 16 }}>Active sessions</h3>
                {["Chrome on macOS — Current", "Safari on iPhone"].map((session, i) => (
                  <div key={session} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)" }}>{session}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{i === 0 ? "Active now" : "2 days ago"}</div>
                    </div>
                    {i !== 0 && <button className="btn btn-danger btn-sm" id={`revoke-session-${i}`}>Revoke</button>}
                    {i === 0 && <span className="badge badge-success">Current</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Danger Zone ── */}
          {activeSection === "danger" && (
            <div className="animate-fade-in">
              <SectionTitle icon={Trash2} title="Danger Zone" />
              <div style={{ border: "1px solid var(--danger-muted)", borderRadius: "var(--radius-lg)", padding: "24px", background: "var(--danger-muted)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 4 }}>Delete all boards</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Permanently delete all your boards. This cannot be undone.</div>
                  </div>
                  <button className="btn btn-danger btn-sm" id="delete-all-boards">Delete all</button>
                </div>
                <hr className="divider" style={{ margin: "0 0 20px" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--danger)", marginBottom: 4 }}>Delete account</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Permanently delete your account and all associated data.</div>
                  </div>
                  <button className="btn btn-danger btn-sm" id="delete-account">Delete account</button>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="btn btn-secondary"
                  style={{ gap: 6, color: "var(--danger)" }}
                  id="settings-logout"
                >
                  {isLoggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  Sign out of all devices
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
