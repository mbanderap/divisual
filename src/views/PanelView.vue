<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useToastStore } from "../stores/toast";
import { eur, num } from "../lib/format";
import { DEAL_STAGES, OPEN_STAGES } from "../lib/types";
import DealModal from "../components/deals/DealModal.vue";
import RevenueForecastChart from "../components/panel/RevenueForecastChart.vue";

const catalogs = useCatalogStore();
const toast = useToastStore();
const showDealModal = ref(false);
const loadingStats = ref(true);

onMounted(async () => {
  try {
    if (!catalogs.panelStats) await catalogs.loadPanelStats();
  } catch (e) {
    toast.error(e, "cargar las estadísticas del panel");
  } finally {
    loadingStats.value = false;
  }
});

const open = computed(() => catalogs.deals.filter((d) => d.status && OPEN_STAGES.includes(d.status as never)));
const won = computed(() => catalogs.deals.filter((d) => d.status === "Ganado"));
const pipeline = computed(() => open.value.reduce((s, d) => s + (d.value || 0), 0));
const revenue = computed(() => won.value.reduce((s, d) => s + (d.value || 0), 0));
const byStage = computed(() =>
  DEAL_STAGES.filter((s) => s !== "Perdido").map((s) => {
    const ds = catalogs.deals.filter((d) => d.status === s);
    return { name: s, total: ds.reduce((a, d) => a + (d.value || 0), 0), count: ds.length };
  }),
);
const maxStage = computed(() => Math.max(...byStage.value.map((s) => s.total), 1));
const devHotels = computed(() => catalogs.panelStats?.devHotels ?? []);

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
const startOfMonth = computed(() => toKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
const endOfMonth = computed(() => toKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));

const closingDateChanges = computed(() =>
  catalogs.deals.filter((d) => d.closing_date_changed_at && d.closing_date_changed_at.slice(0, 10) >= startOfMonth.value).length,
);
const estimatedThisMonth = computed(() =>
  catalogs.deals
    .filter((d) => d.status && OPEN_STAGES.includes(d.status as never) && d.closing_date && d.closing_date >= startOfMonth.value && d.closing_date <= endOfMonth.value)
    .reduce((s, d) => s + (d.value || 0), 0),
);
const activeThisMonth = computed(() =>
  catalogs.deals
    .filter((d) => d.status === "Ganado" && d.start_date && d.start_date <= endOfMonth.value && (!d.end_date || d.end_date >= startOfMonth.value))
    .reduce((s, d) => s + (d.value || 0), 0),
);
const futureRevenue = computed(() =>
  catalogs.deals
    .filter((d) => d.status === "Ganado" && d.start_date && d.start_date > endOfMonth.value)
    .reduce((s, d) => s + (d.value || 0), 0),
);

const forecastMonths = computed(() => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStart = toKey(new Date(d.getFullYear(), d.getMonth(), 1));
    const monthEnd = toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const total = catalogs.deals
      .filter((deal) => deal.status === "Ganado" && deal.start_date && deal.start_date <= monthEnd && (!deal.end_date || deal.end_date >= monthStart))
      .reduce((s, deal) => s + (deal.value || 0), 0);
    return { key: monthStart, label: d.toLocaleDateString("es-ES", { month: "short" }).replace(".", ""), total };
  });
});

function onDealSaved() {
  showDealModal.value = false;
  catalogs.loadCatalogs();
}
</script>

<template>
  <div class="view-head">
    <div>
      <h1>Panel</h1>
      <div class="view-sub">
        Resumen a {{ new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) }}
      </div>
    </div>
    <button class="btn btn-primary" @click="showDealModal = true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      Nuevo negocio
    </button>
  </div>

  <div class="kpis">
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <div class="k-label">Pipeline abierto</div>
      <div class="k-value">{{ eur(pipeline) }}</div>
      <div class="k-delta">{{ open.length }} negocios activos</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <div class="k-label">Ingresos mes actual</div>
      <div class="k-value">{{ eur(activeThisMonth) }}</div>
      <div class="k-delta">negocios ganados con servicio activo</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <div class="k-label">Ingresos estimados este mes</div>
      <div class="k-value">{{ eur(estimatedThisMonth) }}</div>
      <div class="k-delta">negocios abiertos con cierre este mes</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <div class="k-label">Ingresos mes a futuro</div>
      <div class="k-value">{{ eur(futureRevenue) }}</div>
      <div class="k-delta">negocios ganados que empiezan más adelante</div>
    </router-link>
  </div>

  <div class="kpis" style="margin-top: 14px">
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <div class="k-label">Cambios en la fecha</div>
      <div class="k-value">{{ closingDateChanges }}</div>
      <div class="k-delta">negocios con cierre movido este mes</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'hoteles' }">
      <div class="k-label">Hoteles con plan</div>
      <div class="k-value">
        {{ catalogs.counts.hotelsPlan.toLocaleString("es-ES") }}<span style="font-size: 15px; color: var(--faint)">/{{ catalogs.counts.hotels.toLocaleString("es-ES") }}</span>
      </div>
      <div class="k-delta">planes de gestión activos</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'contactos' }">
      <div class="k-label">Contactos</div>
      <div class="k-value">{{ catalogs.counts.contacts.toLocaleString("es-ES") }}</div>
      <div class="k-delta">{{ catalogs.counts.contactsCliente.toLocaleString("es-ES") }} son clientes</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <div class="k-label">Ingresos ganados</div>
      <div class="k-value">{{ eur(revenue) }}</div>
      <div class="k-delta">{{ won.length }} negocios cerrados</div>
    </router-link>
  </div>

  <div class="card panel" style="margin-bottom: 14px">
    <div class="panel-title">Forecast de ingresos <span class="hint">negocios ganados, próximos 12 meses</span></div>
    <RevenueForecastChart :months="forecastMonths" />
  </div>

  <div class="dash-grid">
    <div class="card panel">
      <div class="panel-title">Pipeline por etapa <span class="hint">valor y número de negocios</span></div>
      <div v-for="s in byStage" :key="s.name" class="funnel-row">
        <span class="f-name">{{ s.name }} <span style="color: var(--faint); font-family: var(--mono); font-size: 11px">{{ s.count }}</span></span>
        <div class="funnel-track"><div class="funnel-fill" :style="{ width: Math.round((s.total / maxStage) * 100) + '%' }"></div></div>
        <span class="f-val">{{ eur(s.total) }}</span>
      </div>
    </div>
    <div class="card panel">
      <div class="panel-title">Desviación de planes <span class="hint">hoteles con mayor desvío</span></div>
      <div v-if="loadingStats" class="loading">Calculando...</div>
      <template v-else-if="devHotels.length">
        <div v-for="h in devHotels" :key="h.id" class="dev-item">
          <div class="dv-name">{{ h.name }}<div class="dv-days">{{ h.deviation_days != null ? h.deviation_days + " días" : "" }}</div></div>
          <span class="dv-pct" :class="(h.deviation_pct ?? 0) >= 0 ? 'pos' : 'neg'">{{ (h.deviation_pct ?? 0) >= 0 ? "+" : "" }}{{ num(h.deviation_pct) }}%</span>
        </div>
      </template>
      <div v-else class="empty" style="padding: 24px"><p>Ningún hotel con plan y desviación registrada.</p></div>
    </div>
  </div>

  <DealModal v-if="showDealModal" @close="showDealModal = false" @saved="onDealSaved" />
</template>
