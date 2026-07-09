<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";
import { useCatalogStore } from "../../stores/catalogs";

const WIDE_VIEWS = ["negocios", "tickets", "tablero", "cartera", "chat", "calendario", "hoteles", "contactos", "empresas", "personal"];

const catalogs = useCatalogStore();
const route = useRoute();
onMounted(async () => {
  await Promise.all([catalogs.loadCounts(), catalogs.loadCatalogs()]);
});
</script>

<template>
  <div class="app-shell">
    <Sidebar />
    <div class="main">
      <Topbar />
      <div class="content"><div class="view" :class="{ 'view-wide': WIDE_VIEWS.includes(String(route.name)) }"><router-view /></div></div>
    </div>
  </div>
</template>
