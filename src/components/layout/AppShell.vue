<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";
import { useCatalogStore } from "../../stores/catalogs";
import { useToastStore } from "../../stores/toast";

const WIDE_VIEWS = ["negocios", "tickets", "tablero", "cartera", "chat", "calendario", "hoteles", "contactos", "empresas", "personal"];
const DEVIATION_THRESHOLD = 15;

const catalogs = useCatalogStore();
const toast = useToastStore();
const route = useRoute();
onMounted(async () => {
  await Promise.all([catalogs.loadCounts(), catalogs.loadCatalogs()]);
  try {
    const count = await catalogs.countDeviationAlerts(DEVIATION_THRESHOLD);
    if (count > 0) {
      toast.show(
        count === 1
          ? `1 hotel se ha desviado más de ${DEVIATION_THRESHOLD}% de su plan`
          : `${count} hoteles se han desviado más de ${DEVIATION_THRESHOLD}% de su plan`,
        6000,
      );
    }
  } catch {
    // silencioso: no bloquea el arranque de la app si falla la comprobación
  }
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
