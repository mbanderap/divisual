<script setup lang="ts">
import Modal from "../ui/Modal.vue";
import { fdate } from "../../lib/format";
import type { CalendarEvent } from "../../lib/types";

const props = defineProps<{ dateKey: string; events: CalendarEvent[] }>();
const emit = defineEmits<{ close: []; edit: [CalendarEvent]; new: [] }>();

function categoryTag(category: string): string {
  if (category === "Despliegue") return "oportunidad";
  if (category === "Reunión") return "cliente";
  if (category === "Vacaciones") return "lead";
  return "inactivo";
}
function people(e: CalendarEvent): string {
  return (e.events_personnel || []).map((l) => l.personnel?.name).filter(Boolean).join(", ") || "Sin personas asociadas";
}
</script>

<template>
  <Modal width="480px" @close="emit('close')">
    <h2>{{ fdate(props.dateKey) }}</h2>
    <p v-if="!events.length" style="font-size: 12.5px; color: var(--faint); margin-bottom: 14px">Sin nada programado este día.</p>
    <div v-for="e in events" :key="e.id" class="hist-item" style="cursor: pointer" @click="emit('edit', e)">
      <span class="h-date"><span class="tag" :class="categoryTag(e.category)">{{ e.category }}</span></span>
      <span class="h-note"><strong>{{ e.title }}</strong><br />{{ people(e) }}</span>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cerrar</button>
      <button class="btn btn-primary" @click="emit('new')">Nuevo evento este día</button>
    </div>
  </Modal>
</template>
