<script setup lang="ts">
import { computed } from "vue";
import Modal from "../ui/Modal.vue";
import { useCatalogStore } from "../../stores/catalogs";
import { eur, fdate } from "../../lib/format";
import type { Deal } from "../../lib/types";

const emit = defineEmits<{ close: []; edit: [Deal] }>();
const catalogs = useCatalogStore();

const archived = computed(() =>
  catalogs.deals.filter((d) => d.status === "Perdido").sort((a, b) => b.id - a.id),
);
</script>

<template>
  <Modal width="560px" @close="emit('close')">
    <h2>Archivados</h2>
    <p style="font-size: 12.5px; color: var(--muted); margin-bottom: 14px">Negocios que se marcaron como Perdido. Ábrelos para reactivarlos o borrarlos.</p>
    <p v-if="!archived.length" style="font-size: 12.5px; color: var(--faint)">Sin negocios archivados.</p>
    <div v-for="d in archived" :key="d.id" class="hist-item" style="cursor: pointer" @click="emit('edit', d)">
      <span class="h-date">{{ fdate(d.closing_date) }}</span>
      <span class="h-note"><strong>{{ d.name }}</strong><br />{{ d.contacts?.name || "Sin contacto" }} · {{ eur(d.value) }}</span>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cerrar</button>
    </div>
  </Modal>
</template>
