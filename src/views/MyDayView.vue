<script setup lang="ts">
import { computed } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useAuthStore } from "../stores/auth";
import { fdate, eur } from "../lib/format";
import { todayKey, recurrenceMatchesDay } from "../lib/recurrence";
import type { Recurrence } from "../lib/recurrence";
import { OPEN_STAGES, OPEN_TICKET_STAGES } from "../lib/types";

const catalogs = useCatalogStore();
const auth = useAuthStore();

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const myPersonnelId = computed(
  () => catalogs.personnel.find((p) => p.email && p.email.toLowerCase() === auth.userEmail.toLowerCase())?.id ?? null,
);

const myTasks = computed(() => {
  if (myPersonnelId.value == null) return [];
  return catalogs.tasks
    .filter((t) => t.status !== "Listo en prod" && (t.tasks_personnel || []).some((tp) => tp.personnel?.id === myPersonnelId.value))
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
});

const todaysEvents = computed(() => {
  const key = todayKey();
  return catalogs.events.filter((e) => {
    if (e.recurrence) return recurrenceMatchesDay(key, e.recurrence as Recurrence, e.recurrence_day, e.start_date, e.end_date);
    return key >= e.start_date && key <= (e.end_date || e.start_date);
  });
});

const urgentTickets = computed(() => {
  const limit = addDays(15);
  return catalogs.tickets
    .filter((t) => t.status && OPEN_TICKET_STAGES.includes(t.status as never) && t.plan_end_date && t.plan_end_date <= limit)
    .sort((a, b) => (a.plan_end_date ?? "").localeCompare(b.plan_end_date ?? ""));
});

const closingSoonDeals = computed(() => {
  const today = todayKey();
  const limit = addDays(7);
  return catalogs.deals
    .filter((d) => d.status && OPEN_STAGES.includes(d.status as never) && d.closing_date && d.closing_date >= today && d.closing_date <= limit)
    .sort((a, b) => (a.closing_date ?? "").localeCompare(b.closing_date ?? ""));
});
</script>

<template>
  <div class="view-head">
    <div>
      <h1>Mi día</h1>
      <div class="view-sub">{{ new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) }}</div>
    </div>
  </div>

  <div class="myday-grid">
    <div class="card panel">
      <div class="panel-title">Mis tareas <span class="hint">{{ myTasks.length }} abiertas</span></div>
      <p v-if="myPersonnelId == null" style="font-size: 12.5px; color: var(--faint)">
        No hay ninguna persona en Personal con tu correo ({{ auth.userEmail }}), así que no se pueden filtrar tareas por ti.
      </p>
      <template v-else>
        <p v-if="!myTasks.length" style="font-size: 12.5px; color: var(--faint)">Sin tareas abiertas asignadas a ti.</p>
        <div v-for="t in myTasks" :key="t.id" class="hist-item">
          <span class="h-date">{{ t.due_date ? fdate(t.due_date) : "—" }}</span>
          <span class="h-note"><strong>{{ t.title }}</strong><br />{{ t.status }}</span>
        </div>
      </template>
      <router-link class="hint" style="display: block; margin-top: 10px" :to="{ name: 'tablero' }">Ver el Tablero →</router-link>
    </div>

    <div class="card panel">
      <div class="panel-title">Hoy en el calendario <span class="hint">{{ todaysEvents.length }} eventos</span></div>
      <p v-if="!todaysEvents.length" style="font-size: 12.5px; color: var(--faint)">Nada programado para hoy.</p>
      <div v-for="e in todaysEvents" :key="e.id" class="hist-item">
        <span class="h-date">{{ e.category }}</span>
        <span class="h-note"><strong>{{ e.recurrence ? "↻ " : "" }}{{ e.title }}</strong></span>
      </div>
      <router-link class="hint" style="display: block; margin-top: 10px" :to="{ name: 'calendario' }">Ver el Calendario →</router-link>
    </div>

    <div class="card panel">
      <div class="panel-title">Tickets urgentes <span class="hint">{{ urgentTickets.length }} en los próximos 15 días</span></div>
      <p v-if="!urgentTickets.length" style="font-size: 12.5px; color: var(--faint)">Ningún ticket abierto vence pronto.</p>
      <div v-for="t in urgentTickets" :key="t.id" class="hist-item">
        <span class="h-date">{{ fdate(t.plan_end_date) }}</span>
        <span class="h-note"><strong>{{ t.title }}</strong><br />{{ t.hotels?.name || t.companies?.name || "" }}</span>
      </div>
      <router-link class="hint" style="display: block; margin-top: 10px" :to="{ name: 'tickets' }">Ver Tickets →</router-link>
    </div>

    <div class="card panel">
      <div class="panel-title">Negocios por cerrar <span class="hint">{{ closingSoonDeals.length }} en los próximos 7 días</span></div>
      <p v-if="!closingSoonDeals.length" style="font-size: 12.5px; color: var(--faint)">Nada con cierre previsto esta semana.</p>
      <div v-for="d in closingSoonDeals" :key="d.id" class="hist-item">
        <span class="h-date">{{ fdate(d.closing_date) }}</span>
        <span class="h-note"><strong>{{ d.name }}</strong><br />{{ eur(d.value) }} · {{ d.status }}</span>
      </div>
      <router-link class="hint" style="display: block; margin-top: 10px" :to="{ name: 'negocios' }">Ver Negocios →</router-link>
    </div>
  </div>
</template>
