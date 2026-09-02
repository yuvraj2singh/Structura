"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, Sparkles, ArrowRight, CheckCircle2, Globe, GitFork } from "lucide-react";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import useAuthStore from "@/store/useAuthStore";
import { ROUTES } from "@/lib/constants";

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["var(--danger)", "var(--warning)", "var(--warning)", "var(--success)", "var(--success)"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={`strength-bar-${i}`}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < score ? colors[score] : "var(--border-color)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {checks.map((c) => (
            <span
              key={c.label}
              style={{
                fontSize: "0.7rem",
                color: c.ok ? "var(--success)" : "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
                gap: 3,
                transition: "color 0.2s",
              }}
            >
              <CheckCircle2 size={10} />
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: colors[score] }}>
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}


export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const { register, loading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return;
    setError("");
    const res = await register(form);
    if (res.ok) {
      router.push(ROUTES.DASHBOARD);
    } else {
      setError(res.error || "Registration failed");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-10%",
          left: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(ellipse, rgba(167,139,250,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(ellipse, var(--accent-muted) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Form panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
        </div>

        <div style={{ width: "100%", maxWidth: "420px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <Logo />
          </div>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>Create your account</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Start building and visualizing in minutes. Free forever.
            </p>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: "10px 14px",
                background: "var(--danger-muted)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-md)",
                color: "var(--danger)",
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          )}

          {/* OAuth */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, gap: 8, justifyContent: "center" }}
              id="register-google"
              type="button"
              onClick={() => { window.location.href = "/api/auth/google"; }}
            >
              <Globe size={16} /> Google
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, gap: 8, justifyContent: "center" }} id="register-github" type="button">
              <GitFork size={16} /> GitHub
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
            <div className="divider" style={{ flex: 1 }} />
            or continue with email
            <div className="divider" style={{ flex: 1 }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name */}
            <div>
              <label className="input-label" htmlFor="reg-name">Full name</label>
              <div style={{ position: "relative" }}>
                <User size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
                <input
                  id="reg-name"
                  type="text"
                  className="input"
                  placeholder="Yuvraj Singh"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ paddingLeft: 36 }}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="input-label" htmlFor="reg-email">Email address</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
                <input
                  id="reg-email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ paddingLeft: 36 }}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="input-label" htmlFor="reg-password">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  className="input"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4, display: "flex" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  id="reg-toggle-password"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Terms */}
            <label
              style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
              id="terms-label"
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                id="agree-terms"
                style={{ marginTop: 2, accentColor: "var(--accent)", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                I agree to the{" "}
                <Link href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Terms of Service</Link>
                {" "}and{" "}
                <Link href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !agreed}
              id="register-submit"
              style={{ height: 44, fontSize: "0.9375rem", gap: 8, marginTop: 4 }}
            >
              {loading ? (
                <span>Creating account…</span>
              ) : (
                <>
                  Create free account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <Link href={ROUTES.LOGIN} style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }} id="goto-login">
              Sign in
            </Link>
          </p>

          <div style={{ marginTop: 28, padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Sparkles size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: 0, lineHeight: 1.5 }}>
              No credit card required. Free plan includes unlimited public boards and 5 private boards.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — visual */}
      <div
        className="dot-grid"
        id="register-visual-panel"
        style={{
          flex: "0 0 420px",
          display: "none",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          borderLeft: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          position: "relative",
          overflow: "hidden",
          gap: 24,
        }}
      >
        <style>{`@media(min-width:900px){#register-visual-panel{display:flex!important}}`}</style>
        {[
          { icon: "🎯", label: "DSA Visualizer", sub: "Trees, graphs, arrays and more" },
          { icon: "🤖", label: "AI Canvas", sub: "Describe and generate diagrams" },
          { icon: "⚡", label: "Step-by-step dry runs", sub: "Watch algorithms execute live" },
          { icon: "🌐", label: "Real-time collaboration", sub: "Invite teammates instantly" },
          { icon: "📦", label: "Cloud persistence", sub: "Auto-saved to MongoDB Atlas" },
          { icon: "🔒", label: "Secure & private", sub: "RBAC permission system" },
        ].map((item) => (
          <div
            key={item.label}
            className="card"
            style={{ width: "100%", padding: "16px 20px", display: "flex", gap: 14, alignItems: "center" }}
          >
            <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>{item.label}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{item.sub}</div>
            </div>
            <CheckCircle2 size={16} style={{ color: "var(--success)", marginLeft: "auto", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
