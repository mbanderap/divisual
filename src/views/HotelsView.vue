<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { usePagedEntity } from "../composables/usePagedEntity";
import { useSearchStore } from "../stores/search";
import { useColumnStore } from "../stores/columns";
import { useCatalogStore } from "../stores/catalogs";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import { supabase } from "../lib/supabase";
import { fdate, num } from "../lib/format";
import DataTable from "../components/ui/DataTable.vue";
import Pager from "../components/ui/Pager.vue";
import ViewControls from "../components/ui/ViewControls.vue";
import ColumnEditor from "../components/ui/ColumnEditor.vue";
import HotelModal from "../components/hotels/HotelModal.vue";
import type { Hotel, ColumnDef } from "../lib/types";

const search = useSearchStore();
const columns = useColumnStore();
const catalogs = useCatalogStore();
const toast = useToastStore();
const confirm = useConfirmStore();

const { rows, pager, fetchPage, setSearch, setSort, setPage, setPageSize } = usePagedEntity<Hotel>(
  {
    table: "hotels",
    select: "*, hotels_personnel(role, area, personnel(id, name, email)), deals_hotels(id, deals(id, name, value, status))",
    searchCols: ["name"],
  },
  "name",
);

onMounted(() => {
  search.register(setSearch, pager.search, "Buscar hoteles por nombre");
  fetchPage();
  if (!catalogs.counts.hotels) catalogs.loadCounts();
});
onUnmounted(() => search.unregister());

const viewMode = ref<"cards" | "list">("cards");
const showColEditor = ref(false);
const editing = ref<Hotel | null>(null);
const showModal = ref(false);

function openNew() { editing.value = null; showModal.value = true; }
function openEdit(h: Hotel) { editing.value = h; showModal.value = true; }
function onSaved() { showModal.value = false; fetchPage(); catalogs.loadCounts(); }
async function onDelete(h: Hotel) {
  const ok = await confirm.ask(`Se eliminará el hotel ${h.name} y sus vínculos con negocios y personal.`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("hotels").delete().eq("id", h.id);
    if (error) throw error;
    toast.show("Hotel eliminado");
    fetchPage(); catalogs.loadCounts();
  } catch (e) { toast.error(e, "eliminar el hotel"); }
}
function onSort(c: ColumnDef<Hotel>) { if (c.dbCol) setSort(c.dbCol); }
function progress(h: Hotel) {
  if (!h.objective || h.current_ij == null) return null;
  return Math.min(100, Math.max(0, (h.current_ij / h.objective) * 100));
}
</script>

<template>
  <div class="view-head">
    <div>
      <h1>Hoteles</h1>
      <div class="view-sub">
        {{ pager.total.toLocaleString("es-ES") }} hoteles en total · {{ catalogs.counts.hotelsPlan.toLocaleString("es-ES") }} con plan activo{{ pager.search ? " · resultados filtrados" : "" }}
      </div>
    </div>
    <div style="display: flex; gap: 9px; align-items: center">
      <ViewControls v-model:mode="viewMode" @columns="showColEditor = true" />
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nuevo hotel
      </button>
    </div>
  </div>

  <template v-if="viewMode === 'list'">
    <template v-if="rows.length">
      <DataTable
        :columns="columns.hoteles"
        :rows="rows"
        :active-sort-key="pager.sortKey"
        :active-sort-dir="pager.sortDir"
        @sort="onSort"
        @row-click="openEdit"
        @edit="openEdit"
        @delete="onDelete"
      >
        <template #cell-name="{ row }">
          <div class="cell-person"><span class="avatar">{{ row.name.slice(0, 2).toUpperCase() }}</span><span class="p-name">{{ row.name }}</span></div>
        </template>
        <template #cell-has_plan="{ row }"><span class="badge" :class="row.has_plan ? 'on' : 'off'">{{ row.has_plan ? "Plan activo" : "Sin plan" }}</span></template>
        <template #cell-deviation_days="{ row }">
          <span v-if="row.deviation_days == null">—</span>
          <span v-else :class="row.deviation_days > 0 ? 'neg' : 'pos'">{{ row.deviation_days }}</span>
        </template>
        <template #cell-deviation_pct="{ row }">
          <span v-if="row.deviation_pct == null">—</span>
          <span v-else :class="row.deviation_pct >= 0 ? 'pos' : 'neg'">{{ row.deviation_pct >= 0 ? "+" : "" }}{{ num(row.deviation_pct) }}</span>
        </template>
        <template #cell-plan_end_date="{ row }">{{ fdate(row.plan_end_date) }}</template>
        <template #cell-equipo="{ row }">{{ (row.hotels_personnel || []).length }}</template>
      </DataTable>
      <Pager :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
    </template>
    <div v-else class="card empty"><div class="e-title">Sin hoteles</div><p>Crea el primer hotel para empezar a seguir sus planes.</p></div>
  </template>

  <template v-else>
    <div class="co-grid">
      <div v-for="h in rows" :key="h.id" class="card co-card" @click="openEdit(h)">
        <div class="row-actions">
          <button class="mini-btn" title="Editar" @click.stop="openEdit(h)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/></svg>
          </button>
          <button class="mini-btn del" title="Eliminar" @click.stop="onDelete(h)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></svg>
          </button>
        </div>
        <div class="co-name">{{ h.name }}<span class="badge" :class="h.has_plan ? 'on' : 'off'">{{ h.has_plan ? "Plan activo" : "Sin plan" }}</span></div>
        <div class="co-sector">{{ (h.hotels_personnel || []).length }} personas asignadas{{ h.plan_end_date ? " · plan hasta " + fdate(h.plan_end_date) : "" }}</div>
        <template v-if="progress(h) != null">
          <div class="plan-bar"><i :style="{ width: Math.round(progress(h)!) + '%' }"></i></div>
          <div class="plan-meta"><span>IJ {{ num(h.current_ij) }}</span><span>objetivo {{ num(h.objective) }}</span></div>
        </template>
        <div class="co-stats">
          <div class="co-stat"><div class="cs-v">{{ num(h.tau) }}</div><div class="cs-l">TAU</div></div>
          <div class="co-stat"><div class="cs-v">{{ num(h.current_tenth) }}<span style="color: var(--faint)">/{{ num(h.contracted_tenths) }}</span></div><div class="cs-l">Décimas</div></div>
          <div class="co-stat">
            <div class="cs-v" :class="h.deviation_pct == null ? '' : h.deviation_pct >= 0 ? 'pos' : 'neg'">
              {{ h.deviation_pct == null ? "—" : (h.deviation_pct >= 0 ? "+" : "") + num(h.deviation_pct) + "%" }}
            </div>
            <div class="cs-l">Desviación</div>
          </div>
        </div>
      </div>
      <div v-if="!rows.length" class="card empty" style="grid-column: 1 / -1"><div class="e-title">Sin hoteles</div><p>Crea el primer hotel para empezar a seguir sus planes.</p></div>
    </div>
    <Pager v-if="rows.length" :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
  </template>

  <ColumnEditor v-if="showColEditor" :columns="columns.hoteles" @update:columns="columns.setHotelColumns" @close="showColEditor = false" />
  <HotelModal v-if="showModal" :hotel="editing" @close="showModal = false" @saved="onSaved" />
</template>
