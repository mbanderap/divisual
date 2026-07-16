<script setup lang="ts">
import Modal from "../ui/Modal.vue";
import { fdate } from "../../lib/format";
import { WEEKDAYS } from "../../lib/recurrence";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import type { CalendarEvent } from "../../lib/types";
import { categoryColor, timeRangeLabel } from "../../lib/calendarCategory";

const props = defineProps<{ dateKey: string; events: CalendarEvent[] }>();
const emit = defineEmits<{ close: []; edit: [CalendarEvent]; new: [] }>();
const toast = useToastStore();

function people(e: CalendarEvent): string {
  return (e.events_personnel || []).map((l) => l.personnel?.name).filter(Boolean).join(", ") || "Sin personas asociadas";
}
function recurrenceLabel(e: CalendarEvent): string {
  if (!e.recurrence || e.recurrence_day == null) return "";
  if (e.recurrence === "weekly") return `Se repite cada ${WEEKDAYS.find((w) => w.value === e.recurrence_day)?.label ?? ""}`;
  return `Se repite el día ${e.recurrence_day} de cada mes`;
}
async function toggleDone(e: CalendarEvent) {
  const next = !e.completed;
  e.completed = next;
  const { error } = await supabase.from("events").update({ completed: next }).eq("id", e.id);
  if (error) { e.completed = !next; toast.error(error, "actualizar el evento"); }
}
</script>

<template>
  <Modal width="480px" @close="emit('close')">
    <h2>{{ fdate(props.dateKey) }}</h2>
    <p v-if="!events.length" style="font-size: 12.5px; color: var(--faint); margin-bottom: 14px">Sin nada programado este día.</p>
    <div v-for="e in events" :key="e.id" class="hist-item cal-day-row" :class="{ done: e.completed }">
      <button class="cal-check" :class="{ checked: e.completed }" type="button" :title="e.completed ? 'Marcar como pendiente' : 'Marcar como finalizado'" @click.stop="toggleDone(e)">
        <svg v-if="e.completed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
      </button>
      <div class="cal-day-row-body" @click="emit('edit', e)">
        <span class="h-date"><span class="cal-dot" :class="'cal-c-' + categoryColor(e.category)"></span>{{ timeRangeLabel(e.start_time, e.end_time) }}</span>
        <span class="h-note"><strong>{{ e.title }}</strong> · {{ e.category }}<br />{{ people(e) }}<template v-if="recurrenceLabel(e)"><br /><em>{{ recurrenceLabel(e) }}</em></template></span>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cerrar</button>
      <button class="btn btn-primary" @click="emit('new')">Nuevo evento este día</button>
    </div>
  </Modal>
</template>
