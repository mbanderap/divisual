<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";
import CommandPalette from "./CommandPalette.vue";
import { useCatalogStore } from "../../stores/catalogs";
import { useToastStore } from "../../stores/toast";
import { useAuthStore } from "../../stores/auth";
import { supabase } from "../../lib/supabase";
import type { Message, Task } from "../../lib/types";

const WIDE_VIEWS = ["negocios", "tickets", "tablero", "cartera", "chat", "calendario", "hoteles", "contactos", "empresas", "personal"];

const catalogs = useCatalogStore();
const toast = useToastStore();
const auth = useAuthStore();
const route = useRoute();

let notificationsChannel: ReturnType<typeof supabase.channel> | null = null;

onMounted(async () => {
  await Promise.all([catalogs.loadCounts(), catalogs.loadCatalogs()]);

  const myPersonnel = catalogs.personnel.find((p) => p.email?.toLowerCase() === auth.userEmail.toLowerCase());
  notificationsChannel = supabase
    .channel("global-notifications")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const m = payload.new as Message;
      if (m.recipient_email === auth.userEmail && route.name !== "chat") {
        const sender = catalogs.personnel.find((p) => p.email === m.sender_email)?.name ?? m.sender_email;
        toast.show(`Nuevo mensaje de ${sender}`);
      }
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks_personnel" }, async (payload) => {
      const link = payload.new as { task_id: number; personnel_id: number };
      if (!myPersonnel || link.personnel_id !== myPersonnel.id) return;
      const { data } = await supabase.from("tasks").select("title").eq("id", link.task_id).single();
      toast.show(`Nueva tarea asignada: ${(data as Task | null)?.title ?? ""}`);
    })
    .subscribe();
});
onUnmounted(() => {
  if (notificationsChannel) supabase.removeChannel(notificationsChannel);
});
</script>

<template>
  <div class="app-shell">
    <Sidebar />
    <div class="main">
      <Topbar />
      <div class="content"><div class="view" :class="{ 'view-wide': WIDE_VIEWS.includes(String(route.name)) }"><router-view /></div></div>
    </div>
    <CommandPalette />
  </div>
</template>
