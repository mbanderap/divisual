import { defineStore } from "pinia";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    session: null as Session | null,
    ready: false, // true una vez que sabemos si hay sesión o no (evita parpadeos)
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.session),
    userEmail: (state) => state.session?.user.email ?? "",
    configured: () => supabaseConfigured,
  },
  actions: {
    async init() {
      if (!supabaseConfigured) { this.ready = true; return; }
      const { data } = await supabase.auth.getSession();
      this.session = data.session;
      this.ready = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session;
      });
    },
    async signIn(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  },
});
