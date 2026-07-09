import { defineStore } from "pinia";

interface ToastItem {
  id: number;
  message: string;
}

let nextId = 1;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.error_description === "string" && e.error_description) return e.error_description;
    if (typeof e.details === "string" && e.details) return e.details;
  }
  return "error desconocido";
}

export const useToastStore = defineStore("toast", {
  state: () => ({
    items: [] as ToastItem[],
  }),
  actions: {
    show(message: string, duration = 2800) {
      const id = nextId++;
      this.items.push({ id, message });
      setTimeout(() => {
        this.items = this.items.filter((t) => t.id !== id);
      }, duration);
    },
    error(err: unknown, action: string) {
      this.show(`Error al ${action}: ${errorMessage(err)}`, 4000);
    },
  },
});
