import { defineStore } from "pinia";

interface ToastItem {
  id: number;
  message: string;
}

let nextId = 1;

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
      const message = err instanceof Error ? err.message : String(err);
      this.show(`Error al ${action}: ${message}`, 4000);
    },
  },
});
