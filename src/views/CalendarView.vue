<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import MonthCalendar from "../components/calendar/MonthCalendar.vue";
import DayDetailModal from "../components/calendar/DayDetailModal.vue";
import EventModal from "../components/calendar/EventModal.vue";
import type { CalendarEvent } from "../lib/types";

const catalogs = useCatalogStore();

const tab = ref<"tecnica" | "eventos" | "vacaciones">("tecnica");
const TAB_CATEGORIES: Record<string, string[]> = {
  tecnica: ["Despliegue"],
  eventos: ["Reunión"],
  vacaciones: ["Vacaciones", "Teletrabajo"],
};

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

const visibleEvents = computed(() =>
  catalogs.events.filter((e) => {
    if (!TAB_CATEGORIES[tab.value].includes(e.category)) return false;
    if (filterIds.value.length && !(e.events_personnel || []).some((l) => l.personnel && filterIds.value.includes(l.personnel.id))) return false;
    return true;
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
          <div v-if="!catalogs.personnel.length" class="combo-empty">Sin personal todavía</div>
          <div v-for="p in catalogs.personnel" :key="p.id" class="combo-opt" @click="toggleFilter(p.id)">
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

  <div class="card" style="padding: 16px">
    <MonthCalendar :events="visibleEvents" @day-click="onDayClick" />
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
    @close="showEventModal = false"
    @saved="onSaved"
  />
</template>
