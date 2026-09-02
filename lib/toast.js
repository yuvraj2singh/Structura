"use client";
/**
 * Toast notification system
 * Usage: import { toast } from "@/lib/toast";
 *        toast.success("Saved!") / toast.error("Failed") / toast.info("...")
 *
 * Mount <Toaster /> once in the root layout.
 */
import { create } from "zustand";

const useToastStore = create((set, get) => ({
  toasts: [],
  add: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry = { id, ...toast };
    set((s) => ({ toasts: [...s.toasts, entry] }));
    setTimeout(() => get().remove(id), toast.duration || 3500);
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg, opts = {}) => useToastStore.getState().add({ type: "success", msg, ...opts }),
  error:   (msg, opts = {}) => useToastStore.getState().add({ type: "error",   msg, ...opts }),
  info:    (msg, opts = {}) => useToastStore.getState().add({ type: "info",    msg, ...opts }),
  warning: (msg, opts = {}) => useToastStore.getState().add({ type: "warning", msg, ...opts }),
};

export default useToastStore;
