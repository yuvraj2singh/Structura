"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight, GitFork, Globe } from "lucide-react";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { ROUTES } from "@/lib/constants";
import { useSearchParams, useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [localError, setLocalError] = useState(urlError || "");
  const { login, loading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    const res = await login(form);
    if (res.ok) {
      router.push(ROUTES.DASHBOARD);
    } else {
      setLocalError(res.error || "Login failed");
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
      {/* Background glow */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(ellipse, var(--accent-muted) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "-20%",
          left: "-10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(ellipse, rgba(167,139,250,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Left panel — branding (desktop only) */}
      <div
        className="dot-grid"
        style={{
          flex: "0 0 480px",
          display: "none",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px",
          borderRight: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          position: "relative",
          overflow: "hidden",
        }}
        id="login-branding-panel"
      >
        <style>{`@media(min-width:900px){#login-branding-panel{display:flex!important}}`}</style>

        <Logo />

        {/* Feature highlights */}
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>
            Visualize.&nbsp;
            <span className="gradient-text">Collaborate.</span>
            <br />Ship faster.
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 40, lineHeight: 1.7 }}>
            The AI-powered canvas where developers turn ideas into interactive diagrams in seconds.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { icon: "🧠", title: "AI-powered canvas", desc: "Generate DSA structures and diagrams from plain English" },
              { icon: "⚡", title: "Instant dry runs", desc: "Step through algorithms visually, node by node" },
              { icon: "👥", title: "Real-time collab", desc: "Share boards and see live cursors from your team" },
            ].map((f) => (
              <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          © 2025 Structura AI. Trusted by 5,000+ developers.
        </p>
      </div>

      {/* Right panel — form */}
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
        {/* Top-right controls (mobile logo + theme) */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ThemeToggle />
        </div>

        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Mobile logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <Logo />
          </div>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>Welcome back</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Sign in to your Structura workspace
            </p>
          </div>

          {(localError || urlError) && (
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
              {localError || urlError}
            </div>
          )}

          {/* OAuth buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, gap: 8, justifyContent: "center" }}
              id="login-google"
              type="button"
              onClick={() => { window.location.href = "/api/auth/google"; }}
            >
              <Globe size={16} />
              Google
            </button>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, gap: 8, justifyContent: "center" }}
              id="login-github"
              type="button"
            >
              <GitFork size={16} />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
              color: "var(--text-tertiary)",
              fontSize: "0.8125rem",
            }}
          >
            <div className="divider" style={{ flex: 1 }} />
            or continue with email
            <div className="divider" style={{ flex: 1 }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="input-label" htmlFor="login-email">Email address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-tertiary)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="login-email"
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

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="input-label" htmlFor="login-password" style={{ margin: 0 }}>Password</label>
                <Link
                  href="#"
                  style={{ fontSize: "0.8125rem", color: "var(--accent)", textDecoration: "none" }}
                  id="forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <Lock
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-tertiary)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  id="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="login-submit"
              style={{ marginTop: 8, height: 44, fontSize: "0.9375rem", gap: 8 }}
            >
              {loading ? (
                <span className="animate-spin-slow" style={{ display: "inline-block" }}>⟳</span>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p
            style={{
              textAlign: "center",
              marginTop: 28,
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href={ROUTES.REGISTER}
              style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}
              id="goto-register"
            >
              Create one free
            </Link>
          </p>

          {/* Security note */}
          <div
            style={{
              marginTop: 32,
              padding: "12px 16px",
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sparkles size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: 0, lineHeight: 1.5 }}>
              Secured with HTTP-only cookies and bcrypt hashing. Your boards are end-to-end encrypted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} />}>
      <LoginForm />
    </Suspense>
  );
}
