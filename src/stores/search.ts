import { defineStore } from "pinia";

type SearchHandler = (term: string) => void;

export const useSearchStore = defineStore("search", {
  state: () => ({
    query: "",
    placeholder: "Buscar en el módulo actual",
    handler: null as SearchHandler | null,
  }),
  actions: {
    /** Cada vista registra cómo quiere reaccionar a la búsqueda (servidor o filtro local) */
    register(handler: SearchHandler, initialValue = "", placeholder = "Buscar en el módulo actual") {
      this.handler = handler;
      this.query = initialValue;
      this.placeholder = placeholder;
    },
    unregister() {
      this.handler = null;
    },
    onInput(value: string) {
      this.query = value;
      this.handler?.(value);
    },
  },
});
