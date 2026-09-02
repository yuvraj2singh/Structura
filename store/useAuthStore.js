import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,

      setUser: (user) => set({ user, error: null }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      /** Register a new account */
      register: async ({ name, email, password }) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Registration failed");
          set({ user: data.user, loading: false });
          return { ok: true };
        } catch (err) {
          set({ error: err.message, loading: false });
          return { ok: false, error: err.message };
        }
      },

      /** Sign in */
      login: async ({ email, password }) => {
        set({ loading: true, error: null });
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Login failed");
          set({ user: data.user, loading: false });
          return { ok: true };
        } catch (err) {
          set({ error: err.message, loading: false });
          return { ok: false, error: err.message };
        }
      },

      /** Sign out */
      logout: async () => {
        set({ loading: true });
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          set({ user: null, loading: false, error: null });
        }
      },

      /** Restore session on page load */
      restoreSession: async () => {
        if (get().user) return; // already have user
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            set({ user: data.user });
          }
        } catch {
          // No session — that's OK
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "structura-auth",
      partialize: (s) => ({ user: s.user }), // only persist user object
    }
  )
);

export default useAuthStore;
