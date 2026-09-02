"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import useToastStore from "@/lib/toast";

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
};

const COLORS = {
  success: { bg: "var(--success-muted)", border: "var(--success)", color: "var(--success)" },
  error:   { bg: "var(--danger-muted)",  border: "var(--danger)",  color: "var(--danger)" },
  info:    { bg: "var(--accent-muted)",  border: "var(--accent)",  color: "var(--accent)" },
  warning: { bg: "var(--warning-muted)", border: "var(--warning)", color: "var(--warning)" },
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div
      id="toaster"
      style={{
        position: "fixed", bottom: 24, right: 24,
        zIndex: 9999, display: "flex", flexDirection: "column", gap: 8,
        alignItems: "flex-end", pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={() => remove(t.id)} />
      ))}
    </div>
  );
}

function Toast({ toast: t, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const Icon = ICONS[t.type] || Info;
  const colors = COLORS[t.type] || COLORS.info;

  useEffect(() => {
    // Slight delay for mount animation
    const tid = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(tid);
  }, []);

  return (
    <div
      id={`toast-${t.id}`}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        boxShadow: "var(--shadow-lg)",
        maxWidth: 360,
        minWidth: 220,
        pointerEvents: "auto",
        cursor: "default",
        transform: visible ? "translateX(0) scale(1)" : "translateX(40px) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "transform 250ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease",
        backdropFilter: "blur(8px)",
      }}
    >
      <Icon size={15} style={{ color: colors.color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>
        {t.msg}
      </span>
      <button
        onClick={onDismiss}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 2, borderRadius: 4, display: "flex", flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}
