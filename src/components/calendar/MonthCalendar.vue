<script setup lang="ts">
import { computed, ref } from "vue";
import { ICONS } from "../../lib/icons";
import type { CalendarEvent } from "../../lib/types";
import { categoryColor, eventOccursOn } from "../../lib/calendarCategory";

const props = defineProps<{ events: CalendarEvent[] }>();
const emit = defineEmits<{ dayClick: [string, CalendarEvent[]] }>();

const current = ref(new Date());
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function pad(n: number): string { return String(n).padStart(2, "0"); }
function dateKey(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

const monthLabel = computed(() => {
  const s = current.value.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s[0].toUpperCase() + s.slice(1);
});
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
  return props.events.filter((e) => eventOccursOn(e, key));
}
function isCurrentMonth(d: Date): boolean {
  return d.getMonth() === current.value.getMonth();
}
const monthEventCount = computed(() => {
  const ids = new Set<number>();
  for (const d of gridDays.value) {
    if (!isCurrentMonth(d)) continue;
    for (const e of eventsOnDay(dateKey(d))) ids.add(e.id);
  }
  return ids.size;
});
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
    <div class="cal-month">{{ monthLabel }} <span class="cal-count">· {{ monthEventCount }} evento{{ monthEventCount === 1 ? "" : "s" }}</span></div>
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
  <div class="cal-grid cal-days">
    <div
      v-for="d in gridDays"
      :key="dateKey(d)"
      class="cal-day"
      :class="{ outside: !isCurrentMonth(d), today: dateKey(d) === todayKey }"
      @click="onDayClick(d)"
    >
      <div class="cal-daynum">{{ d.getDate() }}</div>
      <div class="cal-pills">
        <span v-for="e in eventsOnDay(dateKey(d)).slice(0, 4)" :key="e.id" class="cal-pill" :class="['cal-c-' + categoryColor(e.category), { 'cal-pill-done': e.completed }]"><span v-if="e.recurrence" class="icon-inline" v-html="ICONS.repeat"></span><span v-if="e.start_time" class="cal-pill-time">{{ e.start_time.slice(0, 5) }}</span>{{ e.title }}</span>
        <span v-if="eventsOnDay(dateKey(d)).length > 4" class="cal-more">+{{ eventsOnDay(dateKey(d)).length - 4 }} más</span>
      </div>
    </div>
  </div>

  <div class="cal-legend">
    <span class="cal-legend-item"><span class="cal-dot cal-c-blue"></span>Producción</span>
    <span class="cal-legend-item"><span class="cal-dot cal-c-violet"></span>Reunión</span>
    <span class="cal-legend-item"><span class="cal-dot cal-c-green"></span>Vacaciones</span>
    <span class="cal-legend-item"><span class="cal-dot cal-c-orange"></span>Teletrabajo</span>
  </div>
</template>
