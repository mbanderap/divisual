import { defineStore } from "pinia";

export const useConfirmStore = defineStore("confirm", {
  state: () => ({
    open: false,
    message: "",
    resolver: null as ((v: boolean) => void) | null,
  }),
  actions: {
    ask(message: string): Promise<boolean> {
      this.message = message;
      this.open = true;
      return new Promise((resolve) => { this.resolver = resolve; });
    },
    resolve(value: boolean) {
      this.open = false;
      this.resolver?.(value);
      this.resolver = null;
    },
  },
});
