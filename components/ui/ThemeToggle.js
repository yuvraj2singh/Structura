"use client";
import { Sun, Moon } from "lucide-react";
import useThemeStore from "@/store/useThemeStore";
import { THEMES } from "@/lib/constants";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === THEMES.DARK;

  return (
    <button
      onClick={toggleTheme}
      className={`btn btn-icon btn-ghost tooltip ${className}`}
      data-tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      id="theme-toggle"
    >
      {isDark ? (
        <Sun size={16} style={{ color: "var(--text-secondary)" }} />
      ) : (
        <Moon size={16} style={{ color: "var(--text-secondary)" }} />
      )}
    </button>
  );
}
