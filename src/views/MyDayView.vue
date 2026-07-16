<script setup lang="ts">
import { computed } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useAuthStore } from "../stores/auth";
import { fdate, eur, initials, daysSince } from "../lib/format";
import { ICONS } from "../lib/icons";
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
function daysUntil(dateStr: string): number {
  return -(daysSince(dateStr) ?? 0);
}

const myPersonnel = computed(
  () => catalogs.personnel.find((p) => p.email && p.email.toLowerCase() === auth.userEmail.toLowerCase()) ?? null,
);
const firstName = computed(() => (myPersonnel.value?.name ?? auth.userEmail.split("@")[0]).split(" ")[0]);
const greeting = computed(() => {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
});
const todayLabel = computed(() => new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }).toUpperCase());

const myTasks = computed(() => {
  if (!myPersonnel.value) return [];
  return catalogs.tasks
    .filter((t) => t.status !== "Listo en prod" && (t.tasks_personnel || []).some((tp) => tp.personnel?.id === myPersonnel.value!.id))
    .sort((a, b) => (a.due_date ?? "9999-99-99").localeCompare(b.due_date ?? "9999-99-99"));
});
const tasksDueToday = computed(() => myTasks.value.filter((t) => t.due_date === todayKey()));

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

const summary = computed(() => {
  const parts: string[] = [];
  if (tasksDueToday.value.length) parts.push(`${tasksDueToday.value.length} tarea${tasksDueToday.value.length === 1 ? "" : "s"} para hoy`);
  if (todaysEvents.value.length) parts.push(`${todaysEvents.value.length} evento${todaysEvents.value.length === 1 ? "" : "s"} programado${todaysEvents.value.length === 1 ? "" : "s"}`);
  if (closingSoonDeals.value.length) parts.push(`${closingSoonDeals.value.length} negocio${closingSoonDeals.value.length === 1 ? "" : "s"} a punto de cerrarse`);
  if (!parts.length) return "Sin pendientes urgentes por ahora — buen momento para ponerte al día con calma.";
  return `Tienes ${parts.join(", ")}. Vamos a por ello.`;
});

type Focus = { text: string; to: { name: string; query?: Record<string, string> } };
const focus = computed<Focus | null>(() => {
  if (closingSoonDeals.value.length) {
    const d = closingSoonDeals.value[0];
    return { text: `Cerrar «${d.name}» — cierre previsto el ${fdate(d.closing_date)}, es tu negocio más próximo a cerrarse.`, to: { name: "negocios", query: { open: String(d.id) } } };
  }
  if (urgentTickets.value.length) {
    const t = urgentTickets.value[0];
    return { text: `Resolver el ticket «${t.title}» — vence en ${daysUntil(t.plan_end_date!)} días.`, to: { name: "tickets", query: { open: String(t.id) } } };
  }
  if (tasksDueToday.value.length) {
    const t = tasksDueToday.value[0];
    return { text: `Completar la tarea «${t.title}», prevista para hoy.`, to: { name: "tablero", query: { open: String(t.id) } } };
  }
  return null;
});

function dueLabel(dateStr: string | null): string {
  if (!dateStr) return "—";
  if (dateStr === todayKey()) return "Hoy";
  if (dateStr === addDays(1)) return "Mañana";
  return fdate(dateStr);
}
</script>

<template>
  <div class="card myday-hero">
    <div class="myday-hero-main">
      <div class="myday-date">{{ todayLabel }}</div>
      <h1>{{ greeting }}, <span class="accent">{{ firstName }}</span></h1>
      <p class="myday-summary">{{ summary }}</p>
    </div>
    <div class="myday-stats">
      <div class="myday-stat"><div class="ms-v">{{ myTasks.length }}</div><div class="ms-l">Tareas</div></div>
      <div class="myday-stat"><div class="ms-v">{{ todaysEvents.length }}</div><div class="ms-l">Eventos</div></div>
      <div class="myday-stat"><div class="ms-v neg">{{ urgentTickets.length }}</div><div class="ms-l">Tickets</div></div>
      <div class="myday-stat"><div class="ms-v pos">{{ closingSoonDeals.length }}</div><div class="ms-l">Negocios</div></div>
    </div>
  </div>

  <div v-if="focus" class="myday-focus">
    <span class="myday-focus-icon">⚡</span>
    <div class="myday-focus-body"><div class="myday-focus-label">Tu foco de hoy</div><div>{{ focus.text }}</div></div>
    <router-link class="btn btn-primary" :to="focus.to">Empezar →</router-link>
  </div>

  <div class="myday-grid">
    <div class="card panel myday-card">
      <div class="panel-title">
        <span><span class="myday-icon accent" v-html="ICONS.plus"></span>Mis tareas</span>
        <span class="myday-count">{{ myTasks.length }}</span>
      </div>
      <div class="myday-card-sub">{{ myTasks.length }} abiertas · {{ tasksDueToday.length }} para hoy</div>
      <p v-if="myPersonnel == null" style="font-size: 12.5px; color: var(--faint)">
        No hay ninguna persona en Personal con tu correo ({{ auth.userEmail }}), así que no se pueden filtrar tareas por ti.
      </p>
      <template v-else>
        <p v-if="!myTasks.length" style="font-size: 12.5px; color: var(--faint)">Sin tareas abiertas asignadas a ti.</p>
        <router-link v-for="t in myTasks" :key="t.id" class="myday-row" :to="{ name: 'tablero', query: { open: String(t.id) } }">
          <span class="myday-row-title">{{ t.title }}</span>
          <span class="badge" :class="t.due_date === todayKey() ? 'on' : 'off'">{{ dueLabel(t.due_date) }}</span>
        </router-link>
      </template>
      <router-link class="hint" style="display: block; margin-top: 10px" :to="{ name: 'tablero' }">Ver el Tablero →</router-link>
    </div>

    <div class="card panel myday-card">
      <div class="panel-title">
        <span><span class="myday-icon accent" v-html="ICONS.calendar"></span>Hoy en el calendario</span>
        <span class="myday-count">{{ todaysEvents.length }}</span>
      </div>
      <div class="myday-card-sub">{{ todaysEvents.length }} evento{{ todaysEvents.length === 1 ? "" : "s" }} programado{{ todaysEvents.length === 1 ? "" : "s" }}</div>
      <p v-if="!todaysEvents.length" style="font-size: 12.5px; color: var(--faint)">Nada programado para hoy.</p>
      <div v-for="e in todaysEvents" :key="e.id" class="myday-event">
        <span v-if="e.recurrence" class="icon-inline" v-html="ICONS.repeat"></span>
        <div><div class="myday-row-title">{{ e.title }}</div><div class="myday-card-sub" style="margin-top: 1px">{{ e.category }}</div></div>
      </div>
      <router-link class="hint" style="display: block; margin-top: 10px" :to="{ name: 'calendario' }">Ver el Calendario →</router-link>
    </div>

    <div class="card panel myday-card">
      <div class="panel-title">
        <span><span class="myday-icon warn" v-html="ICONS.mail"></span>Tickets urgentes</span>
        <span class="myday-count">{{ urgentTickets.length }}</span>
      </div>
      <div class="myday-card-sub">Vencen en los próximos 15 días</div>
      <p v-if="!urgentTickets.length" style="font-size: 12.5px; color: var(--faint)">Ningún ticket abierto vence pronto.</p>
      <router-link v-for="t in urgentTickets" :key="t.id" class="myday-row" :to="{ name: 'tickets', query: { open: String(t.id) } }">
        <span class="myday-dot"></span>
        <div style="flex: 1"><div class="myday-row-title">{{ t.title }}</div><div class="myday-card-sub" style="margin-top: 1px">{{ t.hotels?.name || t.companies?.name || "" }}</div></div>
        <span class="neg" style="font-size: 12px; font-weight: 600">Vence en {{ daysUntil(t.plan_end_date!) }} día{{ daysUntil(t.plan_end_date!) === 1 ? "" : "s" }}</span>
      </router-link>
      <router-link class="hint" style="display: block; margin-top: 10px" :to="{ name: 'tickets' }">Ver Tickets →</router-link>
    </div>

    <div class="card panel myday-card">
      <div class="panel-title">
        <span><span class="myday-icon ok" v-html="ICONS.up"></span>Negocios por cerrar</span>
        <span class="myday-count">{{ closingSoonDeals.length }}</span>
      </div>
      <div class="myday-card-sub">Cierre previsto esta semana</div>
      <p v-if="!closingSoonDeals.length" style="font-size: 12.5px; color: var(--faint)">Nada con cierre previsto esta semana.</p>
      <router-link v-for="d in closingSoonDeals" :key="d.id" class="myday-row" :to="{ name: 'negocios', query: { open: String(d.id) } }">
        <span class="hc-team-chip" style="margin-left: 0">{{ initials(d.deals_hotels?.[0]?.hotels?.name || d.name) }}</span>
        <div style="flex: 1"><div class="myday-row-title">{{ d.name }}</div><div class="myday-card-sub" style="margin-top: 1px">{{ d.status }}</div></div>
        <span style="font-weight: 600; font-size: 13px">{{ eur(d.value) }}</span>
      </router-link>
      <router-link class="hint" style="display: block; margin-top: 10px" :to="{ name: 'negocios' }">Ver Negocios →</router-link>
    </div>
  </div>
</template>
