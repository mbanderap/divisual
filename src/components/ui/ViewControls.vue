<script setup lang="ts">
import { ICONS } from "../../lib/icons";

withDefaults(defineProps<{ mode?: "cards" | "list"; showToggle?: boolean }>(), { showToggle: true });
const emit = defineEmits<{ "update:mode": ["cards" | "list"]; columns: [] }>();
</script>

<template>
  <div style="display: flex; gap: 9px; align-items: center">
    <div v-if="showToggle" class="seg" role="group" aria-label="Modo de vista">
      <button :class="{ active: mode === 'cards' }" title="Vista de tarjetas" @click="emit('update:mode', 'cards')" v-html="ICONS.grid"></button>
      <button :class="{ active: mode === 'list' }" title="Vista de lista" @click="emit('update:mode', 'list')" v-html="ICONS.list"></button>
    </div>
    <button class="btn btn-ghost" @click="emit('columns')">
      <span v-html="ICONS.cols"></span> Columnas
    </button>
  </div>
</template>
