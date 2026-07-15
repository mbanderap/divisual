<script setup lang="ts">
import { computed, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { eur } from "../lib/format";
import { ICONS } from "../lib/icons";
import { DEAL_STAGES, OPEN_STAGES } from "../lib/types";
import DealModal from "../components/deals/DealModal.vue";
import RevenueForecastChart from "../components/panel/RevenueForecastChart.vue";

const catalogs = useCatalogStore();
const showDealModal = ref(false);

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
const hotelsClientPct = computed(() => (catalogs.counts.hotels ? ((catalogs.counts.hotelsClient / catalogs.counts.hotels) * 100).toFixed(1) : "0"));

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
const forecastTotal = computed(() => forecastMonths.value.reduce((s, m) => s + m.total, 0));

const updatedAgo = computed(() => {
  if (!catalogs.lastLoadedAt) return null;
  const mins = Math.max(0, Math.round((Date.now() - catalogs.lastLoadedAt.getTime()) / 60000));
  if (mins < 1) return "justo ahora";
  return `hace ${mins} min`;
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
        Resumen a {{ new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) }}<template v-if="updatedAgo"> · actualizado {{ updatedAgo }}</template>
      </div>
    </div>
    <div style="display: flex; gap: 9px; align-items: center">
      <select class="filter-select"><option>Este mes</option></select>
      <button class="btn btn-primary" @click="showDealModal = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nuevo negocio
      </button>
    </div>
  </div>

  <div class="section-label">Ingresos</div>
  <div class="kpis kpis-icon">
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <span class="kpi-icon accent" v-html="ICONS.chart"></span>
      <div class="k-label">Pipeline abierto</div>
      <div class="k-value">{{ eur(pipeline) }}</div>
      <div class="k-delta">{{ open.length }} negocios activos</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <span class="kpi-icon ok" v-html="ICONS.up"></span>
      <div class="k-label">Ingresos mes actual</div>
      <div class="k-value">{{ eur(activeThisMonth) }}</div>
      <div class="k-delta">negocios ganados con servicio activo</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <span class="kpi-icon accent" v-html="ICONS.clock"></span>
      <div class="k-label">Ingresos estimados este mes</div>
      <div class="k-value">{{ eur(estimatedThisMonth) }}</div>
      <div class="k-delta">negocios abiertos con cierre este mes</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <span class="kpi-icon accent" v-html="ICONS.sigma"></span>
      <div class="k-label">Ingresos a futuro</div>
      <div class="k-value">{{ eur(futureRevenue) }}</div>
      <div class="k-delta">ganados que empiezan más adelante</div>
    </router-link>
  </div>

  <div class="section-label">Cartera</div>
  <div class="kpis kpis-icon" style="margin-top: 8px">
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <span class="kpi-icon warn" v-html="ICONS.calendar"></span>
      <div class="k-label">Cierre movido</div>
      <div class="k-value">{{ closingDateChanges }}</div>
      <div class="k-delta">negocios con cierre movido este mes</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'hoteles' }">
      <span class="kpi-icon accent" v-html="ICONS.building"></span>
      <div class="k-label">Hoteles cliente</div>
      <div class="k-value">
        {{ catalogs.counts.hotelsClient.toLocaleString("es-ES") }}<span style="font-size: 15px; color: var(--faint)">/{{ catalogs.counts.hotels.toLocaleString("es-ES") }}</span>
      </div>
      <div class="k-delta">{{ hotelsClientPct }}% del universo de hoteles</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'contactos' }">
      <span class="kpi-icon accent" v-html="ICONS.user"></span>
      <div class="k-label">Contactos</div>
      <div class="k-value">{{ catalogs.counts.contacts.toLocaleString("es-ES") }}</div>
      <div class="k-delta">{{ catalogs.counts.contactsCliente.toLocaleString("es-ES") }} son clientes activos</div>
    </router-link>
    <router-link class="card kpi kpi-link" :to="{ name: 'negocios' }">
      <span class="kpi-icon ok" v-html="ICONS.trophy"></span>
      <div class="k-label">Ingresos ganados</div>
      <div class="k-value">{{ eur(revenue) }}</div>
      <div class="k-delta">{{ won.length }} negocios cerrados en el año</div>
    </router-link>
  </div>

  <div class="card panel" style="margin-top: 14px; margin-bottom: 14px">
    <div class="panel-title">
      <span>Forecast de ingresos <span class="hint">negocios ganados · próximos 12 meses</span></span>
      <span style="text-align: right"><span style="font-family: var(--display); font-size: 20px; font-weight: 700">{{ eur(forecastTotal) }}</span></span>
    </div>
    <RevenueForecastChart :months="forecastMonths" />
  </div>

  <div class="dash-grid">
    <div class="card panel">
      <div class="panel-title">Pipeline por etapa <span class="hint">valor y número de negocios</span></div>
      <div v-for="s in byStage" :key="s.name" class="funnel-row">
        <span class="f-name">{{ s.name }} <span class="tab-count">{{ s.count }}</span></span>
        <div class="funnel-track"><div class="funnel-fill" :style="{ width: Math.round((s.total / maxStage) * 100) + '%' }"></div></div>
        <span class="f-val">{{ eur(s.total) }}</span>
      </div>
    </div>
    <div class="card panel">
      <div class="panel-title">Décimas <span class="hint">movimientos de década</span></div>
      <div class="myday-stats" style="margin-bottom: 14px">
        <div class="myday-stat" style="flex: 1; background: var(--ok-soft); border-color: transparent">
          <div class="ms-v pos">↑ —</div><div class="ms-l">Suben de década</div>
        </div>
        <div class="myday-stat" style="flex: 1; background: var(--danger-soft); border-color: transparent">
          <div class="ms-v neg">↓ —</div><div class="ms-l">Bajan de década</div>
        </div>
      </div>
      <p style="font-size: 12.5px; color: var(--faint)">Próximamente — necesita traer las reputaciones diarias de Jaippy.</p>
    </div>
  </div>

  <DealModal v-if="showDealModal" @close="showDealModal = false" @saved="onDealSaved" />
</template>
