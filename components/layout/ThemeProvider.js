"use client";
import { useEffect } from "react";
import useThemeStore from "@/store/useThemeStore";

/**
 * Applies the stored theme as a data-theme attribute on <html>
 * on first render and whenever the theme changes.
 */
export default function ThemeProvider({ children }) {
  const { applyTheme } = useThemeStore();

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  return children;
}
