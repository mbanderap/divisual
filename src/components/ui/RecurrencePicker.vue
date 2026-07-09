<script setup lang="ts">
import { WEEKDAYS } from "../../lib/recurrence";
import type { Recurrence } from "../../lib/recurrence";

defineProps<{ recurrence: Recurrence | null; day: number | null }>();
const emit = defineEmits<{ "update:recurrence": [Recurrence | null]; "update:day": [number | null] }>();

function setRecurrence(v: string) {
  emit("update:recurrence", (v || null) as Recurrence | null);
  emit("update:day", null);
}
</script>

<template>
  <div class="field">
    <label>Repetir</label>
    <select :value="recurrence ?? ''" @change="setRecurrence(($event.target as HTMLSelectElement).value)">
      <option value="">Sin repetición</option>
      <option value="weekly">Cada semana</option>
      <option value="monthly">Cada mes</option>
    </select>
  </div>
  <div v-if="recurrence === 'weekly'" class="field">
    <label>Día de la semana</label>
    <div class="chips">
      <button
        v-for="w in WEEKDAYS"
        :key="w.value"
        type="button"
        class="chip-btn"
        :class="{ selected: day === w.value }"
        @click="emit('update:day', w.value)"
      >{{ w.label }}</button>
    </div>
  </div>
  <div v-else-if="recurrence === 'monthly'" class="field">
    <label>Día del mes</label>
    <input
      type="number"
      min="1"
      max="31"
      placeholder="Ej. 21"
      :value="day ?? ''"
      @input="emit('update:day', Number(($event.target as HTMLInputElement).value) || null)"
    />
  </div>
</template>
