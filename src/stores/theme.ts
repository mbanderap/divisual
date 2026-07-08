import { defineStore } from "pinia";

const STORAGE_KEY = "divisual-theme";

function detectInitial(): "light" | "dark" {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: detectInitial() as "light" | "dark",
  }),
  actions: {
    apply() {
      document.documentElement.dataset.theme = this.mode;
    },
    toggle() {
      this.mode = this.mode === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, this.mode);
      this.apply();
    },
  },
});
