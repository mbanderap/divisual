<script setup lang="ts">
import { onMounted } from "vue";
import Sidebar from "./Sidebar.vue";
import Topbar from "./Topbar.vue";
import { useCatalogStore } from "../../stores/catalogs";

const catalogs = useCatalogStore();
onMounted(async () => {
  await Promise.all([catalogs.loadCounts(), catalogs.loadCatalogs()]);
});
</script>

<template>
  <div class="app-shell">
    <Sidebar />
    <div class="main">
      <Topbar />
      <div class="content"><div class="view"><router-view /></div></div>
    </div>
  </div>
</template>
