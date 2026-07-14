<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useSearchStore } from "../stores/search";
import { useToastStore } from "../stores/toast";
import { supabase } from "../lib/supabase";
import { eur, fdate, num } from "../lib/format";
import { TICKET_STAGES } from "../lib/types";
import type { Hotel } from "../lib/types";

const catalogs = useCatalogStore();
const search = useSearchStore();
const toast = useToastStore();

const localSearch = ref("");
onMounted(() => search.register((v) => (localSearch.value = v.toLowerCase()), "", "Buscar en la cartera por hotel"));
onUnmounted(() => search.unregister());

const rows = ref<Hotel[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from("hotels")
      .select("*, deals_hotels(id, deals(id, name, value, status)), tickets(id, status, created_at)");
    if (error) throw error;
    rows.value = (data ?? []) as Hotel[];
  } catch (e) { toast.error(e, "cargar la cartera"); }
  finally { loading.value = false; }
});

function etapa(h: Hotel): string {
  const list = h.tickets ?? [];
  if (!list.length) return "Mantenimiento";
  const latest = list.reduce((a, b) => (a.created_at > b.created_at ? a : b));
  return latest.status && latest.status !== "Cierre de ciclo" ? latest.status : "Mantenimiento";
}
function importe(h: Hotel): number {
  const links = h.deals_hotels ?? [];
  const won = links.find((l) => l.deals?.status === "Ganado");
  const deal = won?.deals ?? links[0]?.deals;
  return deal?.value ?? 0;
}
function diasRestantes(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}
function fdateShort(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("es-ES") : "—";
}
function openTicketsCount(h: Hotel): number {
  return catalogs.tickets.filter((t) => t.hotel_id === h.id && t.status !== "Cierre de ciclo").length;
}
function riskLevel(h: Hotel): "alto" | "medio" | "bajo" {
  const dev = Math.abs(h.deviation_days ?? 0);
  const openT = openTicketsCount(h);
  if (dev > 90 || openT >= 2) return "alto";
  if (dev > 60 || openT === 1) return "medio";
  return "bajo";
}
const RISK_LABEL: Record<string, string> = { alto: "Riesgo alto", medio: "Riesgo medio", bajo: "Riesgo bajo" };

const tab = ref<"resumen" | "tickets">("resumen");

// --- Resumen ---
const ticketsActivos = computed(() => catalogs.tickets.filter((t) => t.status !== "Cierre de ciclo").length);
const enConsolidacion = computed(() => catalogs.tickets.filter((t) => t.status === "Consolidación").length);
const enRiesgo = computed(() => rows.value.filter((h) => (h.deviation_days ?? 0) > 90).length);
const finPlanRows = computed(() =>
  rows.value
    .filter((h) => h.plan_end_date && diasRestantes(h.plan_end_date) <= 30)
    .sort((a, b) => diasRestantes(a.plan_end_date!) - diasRestantes(b.plan_end_date!)),
);
const sinImporte = computed(() => rows.value.filter((h) => importe(h) === 0).length);

const recentChanges = computed(() =>
  [...rows.value]
    .filter((h) => h.updated_at)
    .sort((a, b) => (b.updated_at! > a.updated_at! ? 1 : -1))
    .slice(0, 20),
);

// --- Tickets activos (tabla + filtros) ---
const filterStage = ref("");

const visible = computed(() => {
  const list = rows.value.filter((h) => {
    if (filterStage.value && etapa(h) !== filterStage.value) return false;
    if (localSearch.value && !h.name.toLowerCase().includes(localSearch.value)) return false;
    return true;
  });
  return [...list].sort((a, b) => importe(b) - importe(a));
});
</script>

<template>
  <div class="view-head">
    <div><h1>Cartera activa</h1><div class="view-sub">Resumen de los hoteles cliente: etapa y facturación</div></div>
  </div>

  <div class="tabs">
    <button class="tab-btn" :class="{ active: tab === 'resumen' }" @click="tab = 'resumen'">Resumen</button>
    <button class="tab-btn" :class="{ active: tab === 'tickets' }" @click="tab = 'tickets'">Tickets activos</button>
  </div>

  <div v-if="loading" class="loading" style="padding: 14px">Cargando cartera...</div>

  <template v-else-if="tab === 'resumen'">
    <div class="kpis-flow">
      <div class="card kpi"><div class="k-label">Tickets activos</div><div class="k-value">{{ ticketsActivos }}</div><div class="k-delta">en pipeline CS</div></div>
      <div class="card kpi"><div class="k-label">En consolidación</div><div class="k-value">{{ enConsolidacion }}</div><div class="k-delta">periodo activo</div></div>
      <div class="card kpi"><div class="k-label">En riesgo</div><div class="k-value">{{ enRiesgo }}</div><div class="k-delta">desviación &gt;3 meses</div></div>
      <div class="card kpi"><div class="k-label">Fin plan &lt;30 días</div><div class="k-value">{{ finPlanRows.length }}</div><div class="k-delta">hoteles urgentes</div></div>
      <div class="card kpi"><div class="k-label">Sin importe</div><div class="k-value">{{ sinImporte }}</div><div class="k-delta">tickets incompletos</div></div>
    </div>

    <div class="card panel">
      <div class="panel-title">Cambios de estado recientes<span class="hint">últimas actualizaciones de hoteles</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Hotel</th><th>Estado</th><th>IJ actual</th><th>Importe</th><th>Modificado</th></tr></thead>
          <tbody>
            <tr v-for="h in recentChanges" :key="h.id" :class="{ 'row-highlight': etapa(h) === 'Consolidación' }">
              <td>{{ h.name }}</td>
              <td><span class="tag" :class="etapa(h) === 'Mantenimiento' ? 'inactivo' : 'oportunidad'">{{ etapa(h) }}</span></td>
              <td class="num">{{ h.current_ij != null ? num(h.current_ij) : "—" }}</td>
              <td class="num">{{ eur(importe(h)) }}</td>
              <td class="num">{{ fdateShort(h.updated_at) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!recentChanges.length" class="empty" style="padding: 24px"><p>Todavía no hay cambios registrados.</p></div>
      </div>
    </div>

    <div class="card panel">
      <div class="panel-title">Fin de plan urgente<span class="hint">30 días o menos, o ya vencidos</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Hotel</th><th>Fin plan</th><th>Días</th><th>Estado</th></tr></thead>
          <tbody>
            <tr v-for="h in finPlanRows" :key="h.id">
              <td>{{ h.name }}</td>
              <td class="num">{{ fdateShort(h.plan_end_date) }}</td>
              <td class="num" :class="diasRestantes(h.plan_end_date!) < 0 ? 'neg' : 'pos'">{{ diasRestantes(h.plan_end_date!) }}</td>
              <td :class="diasRestantes(h.plan_end_date!) < 0 ? 'neg' : 'pos'">{{ diasRestantes(h.plan_end_date!) < 0 ? "Vencido" : "Próximo" }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!finPlanRows.length" class="empty" style="padding: 24px"><p>Ningún hotel con el fin de plan cerca.</p></div>
      </div>
    </div>
  </template>

  <template v-else>
    <div style="display: flex; gap: 10px; margin-bottom: 14px">
      <select v-model="filterStage" class="filter-select">
        <option value="">Todas las etapas</option>
        <option v-for="s in TICKET_STAGES" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Riesgo</th>
            <th>Hotel</th>
            <th>Etapa</th>
            <th>Importe</th>
            <th>Últ. mod.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in visible" :key="h.id">
            <td><span class="risk-dot" :class="'risk-' + riskLevel(h)" :title="RISK_LABEL[riskLevel(h)]"></span>{{ RISK_LABEL[riskLevel(h)] }}</td>
            <td>{{ h.name }}</td>
            <td><span class="tag" :class="etapa(h) === 'Mantenimiento' ? 'inactivo' : 'oportunidad'">{{ etapa(h) }}</span></td>
            <td class="num">{{ eur(importe(h)) }}</td>
            <td class="num">{{ fdate(h.updated_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!visible.length" class="card empty"><div class="e-title">Sin resultados</div><p>Ajusta los filtros o crea hoteles en el módulo de Hoteles.</p></div>
    </div>
  </template>
</template>
