"use client";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function Logo({ size = "md", showText = true, href = "/" }) {
  const sizes = {
    sm: { box: 28, font: "0.875rem" },
    md: { box: 34, font: "1rem" },
    lg: { box: 44, font: "1.25rem" },
  };
  const { box, font } = sizes[size] || sizes.md;

  return (
    <Link
      href={href}
      style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
      aria-label={`${APP_NAME} home`}
      id="logo-link"
    >
      {/* Logo mark */}
      <div
        style={{
          width: box,
          height: box,
          background: "linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-glow)",
          flexShrink: 0,
        }}
      >
        <svg
          width={box * 0.55}
          height={box * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stylized "S" / node-graph */}
          <circle cx="5" cy="5" r="2" fill="white" stroke="none" />
          <circle cx="19" cy="5" r="2" fill="white" stroke="none" />
          <circle cx="12" cy="12" r="2.5" fill="white" stroke="none" />
          <circle cx="5" cy="19" r="2" fill="white" stroke="none" />
          <circle cx="19" cy="19" r="2" fill="white" stroke="none" />
          <line x1="7" y1="5" x2="10" y2="11" strokeWidth="1.5" />
          <line x1="17" y1="5" x2="14" y2="11" strokeWidth="1.5" />
          <line x1="10" y1="13" x2="7" y2="18" strokeWidth="1.5" />
          <line x1="14" y1="13" x2="17" y2="18" strokeWidth="1.5" />
        </svg>
      </div>
      {showText && (
        <span
          style={{
            fontWeight: 700,
            fontSize: font,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            fontFamily: "var(--font-sans)",
          }}
        >
          {APP_NAME}
        </span>
      )}
    </Link>
  );
}
