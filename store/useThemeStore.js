import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEMES } from "@/lib/constants";
import { isBrowser } from "@/lib/utils";

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: THEMES.DARK,

      toggleTheme: () => {
        const newTheme = get().theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        set({ theme: newTheme });
        if (isBrowser) {
          document.documentElement.setAttribute("data-theme", newTheme);
        }
      },

      setTheme: (theme) => {
        set({ theme });
        if (isBrowser) {
          document.documentElement.setAttribute("data-theme", theme);
        }
      },

      applyTheme: () => {
        const { theme } = get();
        if (isBrowser) {
          document.documentElement.setAttribute("data-theme", theme);
        }
      },
    }),
    {
      name: "structura-theme",
    }
  )
);

export default useThemeStore;
