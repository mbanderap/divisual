import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { public: true } },
    {
      path: "/",
      component: () => import("../components/layout/AppShell.vue"),
      children: [
        { path: "", name: "panel", component: () => import("../views/PanelView.vue") },
        { path: "contactos", name: "contactos", component: () => import("../views/ContactsView.vue") },
        { path: "empresas", name: "empresas", component: () => import("../views/CompaniesView.vue") },
        { path: "negocios", name: "negocios", component: () => import("../views/DealsView.vue") },
        { path: "hoteles", name: "hoteles", component: () => import("../views/HotelsView.vue") },
        { path: "personal", name: "personal", component: () => import("../views/PersonnelView.vue") },
        { path: "ajustes", name: "ajustes", component: () => import("../views/SettingsView.vue") },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) await auth.init();
  if (!auth.configured) return true; // la pantalla de setup vive dentro de LoginView
  if (!auth.isAuthenticated && !to.meta.public) return { name: "login" };
  if (auth.isAuthenticated && to.name === "login") return { name: "panel" };
  return true;
});

export default router;
