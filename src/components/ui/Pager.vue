<script setup lang="ts">
const props = defineProps<{ page: number; pageSize: number; total: number }>();
const emit = defineEmits<{ "update:page": [number]; "update:pageSize": [number] }>();

function totalPages() { return Math.max(1, Math.ceil(props.total / props.pageSize)); }
function goTo(p: number) { if (p >= 1 && p <= totalPages()) emit("update:page", p); }
</script>

<template>
  <div class="card pager">
    <span class="pager-info">
      Mostrando {{ total === 0 ? 0 : (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }}
      de {{ total.toLocaleString("es-ES") }}
    </span>
    <div class="pager-controls">
      <select :value="pageSize" @change="emit('update:pageSize', parseInt(($event.target as HTMLSelectElement).value))">
        <option v-for="n in [25, 50, 100, 200]" :key="n" :value="n">{{ n }} por página</option>
      </select>
      <button class="pg-btn" :disabled="page <= 1" title="Primera página" @click="goTo(1)">&laquo;</button>
      <button class="pg-btn" :disabled="page <= 1" title="Página anterior" @click="goTo(page - 1)">&lsaquo;</button>
      <span class="pg-num">{{ page }} / {{ totalPages() }}</span>
      <button class="pg-btn" :disabled="page >= totalPages()" title="Página siguiente" @click="goTo(page + 1)">&rsaquo;</button>
      <button class="pg-btn" :disabled="page >= totalPages()" title="Última página" @click="goTo(totalPages())">&raquo;</button>
    </div>
  </div>
</template>
