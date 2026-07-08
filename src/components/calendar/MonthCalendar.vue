<script setup lang="ts">
import { computed, ref } from "vue";
import type { CalendarEvent } from "../../lib/types";

const props = defineProps<{ events: CalendarEvent[] }>();
const emit = defineEmits<{ dayClick: [string, CalendarEvent[]] }>();

const current = ref(new Date());
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function pad(n: number): string { return String(n).padStart(2, "0"); }
function dateKey(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function categoryTag(category: string): string {
  if (category === "Despliegue") return "oportunidad";
  if (category === "Reunión") return "cliente";
  if (category === "Vacaciones") return "lead";
  return "inactivo"; // Teletrabajo
}

const monthLabel = computed(() => current.value.toLocaleDateString("es-ES", { month: "long", year: "numeric" }));
const todayKey = dateKey(new Date());

const gridDays = computed(() => {
  const year = current.value.getFullYear();
  const month = current.value.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = lunes
  const start = new Date(year, month, 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
});

function eventsOnDay(key: string): CalendarEvent[] {
  return props.events.filter((e) => key >= e.start_date && key <= (e.end_date || e.start_date));
}
function isCurrentMonth(d: Date): boolean {
  return d.getMonth() === current.value.getMonth();
}
function onDayClick(d: Date) {
  const key = dateKey(d);
  emit("dayClick", key, eventsOnDay(key));
}
function prevMonth() { current.value = new Date(current.value.getFullYear(), current.value.getMonth() - 1, 1); }
function nextMonth() { current.value = new Date(current.value.getFullYear(), current.value.getMonth() + 1, 1); }
function goToday() { current.value = new Date(); }
</script>

<template>
  <div class="cal-head">
    <div class="cal-month">{{ monthLabel }}</div>
    <div style="display: flex; gap: 6px">
      <button class="icon-btn" title="Mes anterior" @click="prevMonth">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button class="btn btn-ghost" @click="goToday">Hoy</button>
      <button class="icon-btn" title="Mes siguiente" @click="nextMonth">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
      </button>
    </div>
  </div>

  <div class="cal-grid cal-weekdays">
    <div v-for="w in WEEKDAYS" :key="w" class="cal-weekday">{{ w }}</div>
  </div>
  <div class="cal-grid">
    <div
      v-for="d in gridDays"
      :key="dateKey(d)"
      class="cal-day"
      :class="{ outside: !isCurrentMonth(d), today: dateKey(d) === todayKey }"
      @click="onDayClick(d)"
    >
      <div class="cal-daynum">{{ d.getDate() }}</div>
      <div class="cal-pills">
        <span v-for="e in eventsOnDay(dateKey(d)).slice(0, 3)" :key="e.id" class="tag cal-pill" :class="categoryTag(e.category)">{{ e.title }}</span>
        <span v-if="eventsOnDay(dateKey(d)).length > 3" class="cal-more">+{{ eventsOnDay(dateKey(d)).length - 3 }} más</span>
      </div>
    </div>
  </div>
</template>
