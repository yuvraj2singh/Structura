"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  ArrowRight, Sparkles, GitBranch, Zap, Users, Shield,
  Network, Binary, Layers, Brain, BarChart3, Command,
  Play, Star, ChevronRight, LayoutDashboard, Plus
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import useAuthStore from "@/store/useAuthStore";
import { ROUTES } from "@/lib/constants";

/* ── Mini Canvas Preview ─────────────────────── */
function CanvasPreview() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let t = 0;

    // DSA nodes positions for animated BST
    const nodes = [
      { id: 0, val: 50, x: 300, y: 80, parent: null },
      { id: 1, val: 30, x: 180, y: 170, parent: 0 },
      { id: 2, val: 70, x: 420, y: 170, parent: 0 },
      { id: 3, val: 20, x: 110, y: 260, parent: 1 },
      { id: 4, val: 40, x: 250, y: 260, parent: 1 },
      { id: 5, val: 60, x: 350, y: 260, parent: 2 },
      { id: 6, val: 80, x: 490, y: 260, parent: 2 },
    ];

    const IS_DARK = document.documentElement.getAttribute("data-theme") === "dark";
    const palette = IS_DARK
      ? { bg: "#0e0e11", grid: "#1a1a20", node: "#1c1c1f", border: "#27272a", accent: "#818cf8", text: "#fafafa", edge: "#27272a", glow: "rgba(129,140,248,0.4)" }
      : { bg: "#f8f9ff", grid: "#e5e7f0", node: "#ffffff", border: "#e9ecef", accent: "#6366f1", text: "#0f0f10", edge: "#d1d5db", glow: "rgba(99,102,241,0.3)" };

    function draw() {
      t += 0.015;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, w, h);

      // Dot grid
      ctx.fillStyle = palette.grid;
      for (let gx = 0; gx < w; gx += 24) {
        for (let gy = 0; gy < h; gy += 24) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Edges
      nodes.forEach((n) => {
        if (n.parent === null) return;
        const p = nodes[n.parent];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(n.x, n.y);
        ctx.strokeStyle = palette.edge;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Highlight traversal pulse
      const highlighted = Math.floor(((Math.sin(t) + 1) / 2) * nodes.length);

      // Nodes
      nodes.forEach((n, i) => {
        const isHighlighted = i === highlighted;
        const r = 30;
        // Glow
        if (isHighlighted) {
          const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
          grad.addColorStop(0, palette.glow);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHighlighted ? palette.accent : palette.node;
        ctx.fill();
        ctx.strokeStyle = isHighlighted ? palette.accent : palette.border;
        ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
        ctx.stroke();
        // Text
        ctx.fillStyle = isHighlighted ? "#fff" : palette.text;
        ctx.font = "bold 14px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.val, n.x, n.y);
      });

      // Floating label
      ctx.fillStyle = palette.accent;
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const stepMsg = `Step ${highlighted + 1}/7 — Inorder traversal`;
      const lx = 20, ly = h - 30;
      ctx.fillStyle = IS_DARK ? "rgba(129,140,248,0.15)" : "rgba(99,102,241,0.1)";
      ctx.roundRect(lx - 8, ly - 14, ctx.measureText(stepMsg).width + 20, 28, 6);
      ctx.fill();
      ctx.fillStyle = palette.accent;
      ctx.fillText(stepMsg, lx, ly);

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={340}
      style={{ width: "100%", height: "340px", borderRadius: "var(--radius-xl)", display: "block" }}
      aria-label="Structura canvas preview showing BST traversal"
    />
  );
}

/* ── Feature Card ─────────────────────────────── */
function FeatureCard({ icon: Icon, title, description, badge, delay = 0 }) {
  return (
    <div
      className="card animate-fade-in"
      style={{
        padding: "24px",
        animationDelay: `${delay}ms`,
        cursor: "default",
        transition: "transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "var(--shadow-lg)";
        e.currentTarget.style.borderColor = "var(--accent-border)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = "";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            background: "var(--accent-muted)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid var(--accent-border)",
          }}
        >
          <Icon size={20} style={{ color: "var(--accent)" }} />
        </div>
        {badge && <span className="badge badge-accent" style={{ marginLeft: "auto" }}>{badge}</span>}
      </div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>{title}</h3>
      <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>{description}</p>
    </div>
  );
}

/* ── Stat ─────────────────────────────────────── */
function Stat({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: 6 }}>{label}</div>
    </div>
  );
}

/* ── Testimonial ──────────────────────────────── */
function Testimonial({ text, name, role, avatar }) {
  return (
    <div className="card" style={{ padding: "24px" }}>
      <div style={{ display: "flex", marginBottom: 14, gap: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={14} fill="var(--warning)" style={{ color: "var(--warning)" }} />
        ))}
      </div>
      <p style={{ fontSize: "0.9rem", lineHeight: 1.7, marginBottom: 16, color: "var(--text-secondary)", fontStyle: "italic" }}>
        &ldquo;{text}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: avatar,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "white",
          }}
        >
          {name[0]}
        </div>
        <div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────── */
export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = Boolean(user);

  const features = [
    { icon: Binary, title: "DSA Visualizer", description: "Visualize arrays, linked lists, trees, graphs and more. Interactive step-by-step algorithm dry runs built in.", badge: "10+ structures" },
    { icon: Brain, title: "AI Canvas Generation", description: "Describe a diagram in plain English and watch it appear on canvas. Modify existing structures with AI prompts.", badge: "Gemini" },
    { icon: Users, title: "Real-time Collaboration", description: "Work together with your team in real time. See live cursors, instant updates and collaborative editing.", badge: "Socket.IO" },
    { icon: Play, title: "Algorithm Dry Runs", description: "Step through BFS, DFS, sorting, searching algorithms. Highlight each affected element with explanations.", badge: "Interactive" },
    { icon: GitBranch, title: "Version History", description: "Every board change is tracked. Branch, restore and compare versions — like Git for your diagrams.", badge: "Auto-saved" },
    { icon: Network, title: "System Design", description: "Design microservices, auth flows, data pipelines and more. Export as PNG, SVG or JSON.", badge: "Export" },
    { icon: Layers, title: "Infinite Canvas", description: "Pan, zoom and explore an infinite workspace. Snap to grid, align elements, and layer objects.", badge: "Infinite" },
    { icon: Shield, title: "Secure Sharing", description: "Control who can view or edit your boards. Shareable links with viewer/editor permissions.", badge: "RBAC" },
  ];

  const testimonials = [
    { text: "Finally a tool that lets me visualize BSTs while explaining them to students. The dry-run feature is incredible.", name: "Priya Sharma", role: "CS Educator", avatar: "#8b5cf6" },
    { text: "Used this for system design interviews. Being able to generate architecture diagrams from plain text is a game changer.", name: "Alex Chen", role: "Senior SWE @ Meta", avatar: "#6366f1" },
    { text: "The real-time collaboration made our DSA study sessions so much more productive. We can all see the same canvas.", name: "Rahul Verma", role: "CP Enthusiast", avatar: "#ec4899" },
  ];

  return (
    <>
      <Navbar />

      <main style={{ minHeight: "100vh", overflowX: "hidden" }}>
        {/* ── Hero ── */}
        <section
          style={{
            paddingTop: "140px",
            paddingBottom: "100px",
            paddingLeft: "24px",
            paddingRight: "24px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
          id="hero"
        >
          {/* Background glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -60%)",
              width: "800px",
              height: "600px",
              background: "radial-gradient(ellipse at center, var(--accent-muted) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />

          <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto" }}>
            {/* Badge */}
            <div className="animate-fade-in" style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <span
                className="badge badge-accent"
                style={{ padding: "6px 14px", fontSize: "0.8125rem", gap: 6 }}
              >
                <Zap size={12} />
                v1.0 — AI-Powered Canvas
              </span>
            </div>

            {/* Headline */}
            <h1
              className="animate-fade-in animate-delay-100"
              style={{ marginBottom: 24, fontWeight: 800 }}
            >
              The intelligent canvas
              <br />
              <span className="gradient-text">for developers.</span>
            </h1>

            {/* Subhead */}
            <p
              className="animate-fade-in animate-delay-200"
              style={{
                fontSize: "clamp(1rem, 2vw, 1.25rem)",
                maxWidth: "640px",
                margin: "0 auto 40px",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              Visualize data structures, architect systems, and collaborate with AI in real-time.
              Replace chaotic whiteboards with surgical precision.
            </p>

            {/* CTA */}
            <div
              className="animate-fade-in animate-delay-300"
              style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}
            >
              {isAuthenticated ? (
                <Link
                  href={ROUTES.DASHBOARD}
                  className="btn btn-primary btn-lg"
                  id="hero-cta-dashboard"
                  style={{ gap: 8 }}
                >
                  <LayoutDashboard size={18} />
                  Go to Dashboard
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link
                    href={ROUTES.REGISTER}
                    className="btn btn-primary btn-lg"
                    id="hero-cta-primary"
                    style={{ gap: 8 }}
                  >
                    Start drawing free
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    href={ROUTES.LOGIN}
                    className="btn btn-secondary btn-lg"
                    id="hero-cta-secondary"
                    style={{ gap: 8 }}
                  >
                    <Play size={16} />
                    Sign in
                  </Link>
                </>
              )}
            </div>

            {/* Social proof */}
            <div
              className="animate-fade-in animate-delay-400"
              style={{ marginTop: 40, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}
            >
              {[
                { label: "5,000+ developers" },
                { label: "10+ DSA structures" },
                { label: "Real-time collaboration" },
              ].map(({ label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Canvas Preview ── */}
        <section
          style={{ padding: "0 24px 100px", maxWidth: "860px", margin: "0 auto" }}
          id="preview"
        >
          <div
            className="animate-scale-in animate-delay-300"
            style={{
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-2xl)",
              overflow: "hidden",
              boxShadow: "var(--shadow-xl), 0 0 60px var(--accent-muted)",
              background: "var(--canvas-bg)",
              position: "relative",
            }}
          >
            {/* Fake toolbar */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-elevated)",
              }}
            >
              <div style={{ display: "flex", gap: 5 }}>
                {["#f87171", "#fbbf24", "#34d399"].map((c) => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                ))}
              </div>
              <div
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                DSA Practice — Binary Search Tree
              </div>
              <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
                Live
              </span>
            </div>
            <CanvasPreview />
          </div>
          <p style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.8125rem", marginTop: 16 }}>
            Live canvas preview — AI-generated BST with interactive inorder traversal
          </p>
        </section>

        {/* ── Stats ── */}
        <section
          style={{
            padding: "60px 24px",
            background: "var(--bg-secondary)",
            borderTop: "1px solid var(--border-color)",
            borderBottom: "1px solid var(--border-color)",
          }}
          id="stats"
        >
          <div
            style={{
              maxWidth: "860px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 40,
              textAlign: "center",
            }}
          >
            <Stat value="10+" label="DSA structures" />
            <Stat value="∞" label="Canvas size" />
            <Stat value="5ms" label="Sync latency" />
            <Stat value="100%" label="Deterministic AI" />
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ padding: "100px 24px", maxWidth: "1100px", margin: "0 auto" }} id="features">
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="badge badge-accent" style={{ marginBottom: 16, padding: "5px 12px" }}>
              <Sparkles size={11} />
              Core Capabilities
            </span>
            <h2 style={{ marginBottom: 16 }}>
              Everything you need to
              <br />
              <span className="gradient-text">visualize and collaborate.</span>
            </h2>
            <p style={{ maxWidth: "560px", margin: "0 auto", color: "var(--text-secondary)" }}>
              Built for DSA learners, system designers, and developer teams who want a workspace that thinks with them.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 60} />
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          style={{
            padding: "100px 24px",
            background: "var(--bg-secondary)",
            borderTop: "1px solid var(--border-color)",
            borderBottom: "1px solid var(--border-color)",
          }}
          id="how-it-works"
        >
          <div style={{ maxWidth: "860px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <span className="badge badge-accent" style={{ marginBottom: 16 }}>
                <Command size={11} />
                How It Works
              </span>
              <h2 style={{ marginBottom: 16 }}>
                Type a prompt.
                <br />
                <span className="gradient-text">Watch it appear.</span>
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {[
                {
                  step: "01",
                  title: "Describe your structure",
                  body: "Type a natural language prompt: \"Create a BST from 50, 30, 70, 20, 40\". Structura parses and validates it.",
                  code: `AI: "Create a BST from 50,30,70,20,40"`,
                },
                {
                  step: "02",
                  title: "AI generates structured commands",
                  body: "The AI interprets your intent and returns validated JSON commands. Hallucinations are blocked by Zod schema validation.",
                  code: `{ action: "CREATE_DSA", structure: "BST", values: [50,30,70,20,40] }`,
                },
                {
                  step: "03",
                  title: "Canvas renders instantly",
                  body: "The deterministic DSA engine builds the correct structure and renders it to the canvas with proper layout.",
                  code: `Canvas: BST rendered with 5 nodes, auto-positioned`,
                },
                {
                  step: "04",
                  title: "Dry run step-by-step",
                  body: "Run inorder traversal, BFS, or any algorithm. Each step highlights the relevant node with an explanation.",
                  code: `Step 3/7: Visit node 30 → left child of 50`,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="card"
                  style={{ padding: "28px 32px", display: "flex", gap: 28, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "var(--radius-md)",
                      background: "var(--accent-muted)",
                      border: "1px solid var(--accent-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      color: "var(--accent)",
                      fontFamily: "var(--font-mono)",
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ marginBottom: 8 }}>{item.title}</h4>
                    <p style={{ marginBottom: 16, fontSize: "0.9rem" }}>{item.body}</p>
                    <code
                      style={{
                        display: "block",
                        padding: "10px 14px",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.8rem",
                        color: "var(--accent)",
                        fontFamily: "var(--font-mono)",
                        overflowX: "auto",
                      }}
                    >
                      {item.code}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section style={{ padding: "100px 24px", maxWidth: "1000px", margin: "0 auto" }} id="testimonials">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ marginBottom: 12 }}>
              Loved by developers
              <br />
              <span className="gradient-text">and learners.</span>
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {testimonials.map((t) => (
              <Testimonial key={t.name} {...t} />
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section
          style={{
            padding: "100px 24px",
            textAlign: "center",
            background: "var(--bg-secondary)",
            borderTop: "1px solid var(--border-color)",
          }}
          id="cta"
        >
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: 20 }}>
              Ready to visualize
              <br />
              <span className="gradient-text">everything?</span>
            </h2>
            <p style={{ marginBottom: 40, fontSize: "1.05rem" }}>
              Join thousands of developers who use Structura for DSA practice, system design, and team collaboration.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              {isAuthenticated ? (
                <Link href={ROUTES.DASHBOARD} className="btn btn-primary btn-lg" id="footer-cta" style={{ gap: 8 }}>
                  <LayoutDashboard size={18} />
                  Go to Dashboard
                  <ChevronRight size={18} />
                </Link>
              ) : (
                <>
                  <Link href={ROUTES.REGISTER} className="btn btn-primary btn-lg" id="footer-cta" style={{ gap: 8 }}>
                    Create your free board
                    <ChevronRight size={18} />
                  </Link>
                  <Link href={ROUTES.LOGIN} className="btn btn-secondary btn-lg" id="footer-login">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          style={{
            padding: "32px 24px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            color: "var(--text-tertiary)",
            fontSize: "0.8125rem",
          }}
          id="footer"
        >
          <span>© 2025 Structura AI. Built with ❤️ for developers.</span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Documentation", "Privacy", "Terms", "GitHub"].map((item) => (
              <Link
                key={item}
                href="#"
                style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
                onMouseEnter={(e) => (e.target.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--text-tertiary)")}
              >
                {item}
              </Link>
            ))}
          </div>
        </footer>
      </main>
    </>
  );
}
