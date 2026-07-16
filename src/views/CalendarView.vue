<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import MonthCalendar from "../components/calendar/MonthCalendar.vue";
import DayDetailModal from "../components/calendar/DayDetailModal.vue";
import EventModal from "../components/calendar/EventModal.vue";
import { categoryColor, eventOccursOn, timeRangeLabel } from "../lib/calendarCategory";
import type { CalendarEvent } from "../lib/types";

const catalogs = useCatalogStore();

const tab = ref<"tecnica" | "eventos" | "vacaciones">("tecnica");
const TAB_CATEGORIES: Record<string, string[]> = {
  tecnica: ["Despliegue"],
  eventos: ["Reunión", "Formación", "Visita a hotel"],
  vacaciones: ["Vacaciones", "Teletrabajo"],
};
const TAB_LABELS: Record<string, string> = { tecnica: "Producción", eventos: "Reuniones", vacaciones: "Vacaciones / teletrabajo" };

const filterOpen = ref(false);
const filterIds = ref<number[]>([]);
const filterWrapEl = ref<HTMLElement | null>(null);
function toggleFilter(id: number) {
  filterIds.value = filterIds.value.includes(id) ? filterIds.value.filter((x) => x !== id) : [...filterIds.value, id];
}
function onFilterDocClick(e: MouseEvent) {
  if (filterWrapEl.value && !filterWrapEl.value.contains(e.target as Node)) filterOpen.value = false;
}
onMounted(() => document.addEventListener("click", onFilterDocClick));
onUnmounted(() => document.removeEventListener("click", onFilterDocClick));

function matchesFilter(e: CalendarEvent): boolean {
  return !filterIds.value.length || (e.events_personnel || []).some((l) => l.personnel && filterIds.value.includes(l.personnel.id));
}

const visibleEvents = computed(() =>
  catalogs.events.filter((e) => TAB_CATEGORIES[tab.value].includes(e.category) && matchesFilter(e)),
);

function pad(n: number): string { return String(n).padStart(2, "0"); }
function dateKey(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const today = new Date();
const todayKey = dateKey(today);
const todayLabel = (() => {
  const s = today.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return s[0].toUpperCase() + s.slice(1);
})();

const todaysEvents = computed(() =>
  catalogs.events
    .filter((e) => matchesFilter(e) && eventOccursOn(e, todayKey))
    .sort((a, b) => (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99")),
);

const weekStart = new Date(today);
weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const weekDays = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + i);
  return dateKey(d);
});
const weekStats = computed(() =>
  (Object.keys(TAB_CATEGORIES) as (keyof typeof TAB_CATEGORIES)[]).map((key) => {
    const ids = new Set<number>();
    for (const day of weekDays) {
      for (const e of catalogs.events) {
        if (matchesFilter(e) && TAB_CATEGORIES[key].includes(e.category) && eventOccursOn(e, day)) ids.add(e.id);
      }
    }
    return { key, label: TAB_LABELS[key], count: ids.size, color: categoryColor(TAB_CATEGORIES[key][0]) };
  }),
);

const showDayModal = ref(false);
const activeDay = ref("");
const activeDayEvents = ref<CalendarEvent[]>([]);
function onDayClick(key: string, events: CalendarEvent[]) {
  activeDay.value = key;
  activeDayEvents.value = events;
  showDayModal.value = true;
}

const showEventModal = ref(false);
const editingEvent = ref<CalendarEvent | null>(null);
function openNew() { editingEvent.value = null; showEventModal.value = true; }
function openNewFromDay() { showDayModal.value = false; editingEvent.value = null; showEventModal.value = true; }
function openEdit(e: CalendarEvent) { showDayModal.value = false; editingEvent.value = e; showEventModal.value = true; }
function onSaved() { showEventModal.value = false; catalogs.loadCatalogs(); }
</script>

<template>
  <div class="view-head">
    <div><h1>Calendario</h1><div class="view-sub">Producción, reuniones, vacaciones y teletrabajo del equipo</div></div>
    <div style="display: flex; gap: 10px">
      <div class="combo" ref="filterWrapEl">
        <button class="btn btn-ghost" @click="filterOpen = !filterOpen">
          Filtrar por persona{{ filterIds.length ? ` (${filterIds.length})` : "" }}
        </button>
        <div class="combo-drop" :class="{ open: filterOpen }">
          <div v-if="!catalogs.loggedInPersonnel.length" class="combo-empty">Sin usuarios todavía</div>
          <div v-for="p in catalogs.loggedInPersonnel" :key="p.id" class="combo-opt" @click="toggleFilter(p.id)">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
              <input type="checkbox" :checked="filterIds.includes(p.id)" @click.stop="toggleFilter(p.id)" />
              {{ p.name }}
            </label>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nuevo evento
      </button>
    </div>
  </div>

  <div class="tabs">
    <button class="tab-btn" :class="{ active: tab === 'tecnica' }" @click="tab = 'tecnica'">Vista técnica</button>
    <button class="tab-btn" :class="{ active: tab === 'eventos' }" @click="tab = 'eventos'">Eventos</button>
    <button class="tab-btn" :class="{ active: tab === 'vacaciones' }" @click="tab = 'vacaciones'">Vacaciones y teletrabajo</button>
  </div>

  <div class="cal-layout">
    <div class="card cal-wrap">
      <MonthCalendar :events="visibleEvents" @day-click="onDayClick" />
    </div>

    <div class="cal-side">
      <div class="card panel">
        <div class="cal-side-label">Hoy</div>
        <div class="cal-side-date">{{ todayLabel }}</div>
        <div class="cal-side-sub">{{ todaysEvents.length }} evento{{ todaysEvents.length === 1 ? "" : "s" }} programado{{ todaysEvents.length === 1 ? "" : "s" }}</div>
        <p v-if="!todaysEvents.length" style="font-size: 12.5px; color: var(--faint)">Nada programado para hoy.</p>
        <div v-for="e in todaysEvents" :key="e.id" class="cal-today-row" @click="openEdit(e)">
          <span class="cal-today-time">{{ e.start_time ? e.start_time.slice(0, 5) : "Todo el día" }}</span>
          <div>
            <div class="cal-today-title">{{ e.title }}</div>
            <div class="cal-today-cat"><span class="cal-dot" :class="'cal-c-' + categoryColor(e.category)" style="margin-right: 5px"></span>{{ e.category }}<template v-if="e.start_time && e.end_time"> · hasta {{ timeRangeLabel(e.start_time, e.end_time).split("–")[1] }}</template></div>
          </div>
        </div>
      </div>

      <div class="card panel">
        <div class="panel-title">Esta semana</div>
        <div v-for="s in weekStats" :key="s.key" class="cal-week-row">
          <span class="cal-legend-item"><span class="cal-dot" :class="'cal-c-' + s.color"></span>{{ s.label }}</span>
          <span class="cal-count">{{ s.count }}</span>
        </div>
      </div>
    </div>
  </div>

  <DayDetailModal
    v-if="showDayModal"
    :date-key="activeDay"
    :events="activeDayEvents"
    @close="showDayModal = false"
    @edit="openEdit"
    @new="openNewFromDay"
  />
  <EventModal
    v-if="showEventModal"
    :event="editingEvent"
    :default-date="activeDay"
    :default-category="TAB_CATEGORIES[tab][0]"
    :allowed-categories="TAB_CATEGORIES[tab]"
    @close="showEventModal = false"
    @saved="onSaved"
  />
</template>
