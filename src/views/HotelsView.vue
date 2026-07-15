<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { usePagedEntity } from "../composables/usePagedEntity";
import { useSearchStore } from "../stores/search";
import { useColumnStore } from "../stores/columns";
import { useCatalogStore } from "../stores/catalogs";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import { supabase } from "../lib/supabase";
import { num, initials } from "../lib/format";
import { fetchAllFiltered } from "../lib/fetchAll";
import { downloadCsv } from "../lib/csvExport";
import { useDeepLinkFetch } from "../composables/useDeepLinkOpen";
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

const HOTELS_SELECT = "*, hotels_personnel(role, area, personnel(id, name, email)), deals_hotels(id, deals(id, name, value, status))";

const { rows, pager, fetchPage, setSearch, setFilters, setSort, setPage, setPageSize } = usePagedEntity<Hotel>(
  { table: "hotels", select: HOTELS_SELECT, searchCols: ["name"] },
  "name",
);

const clientTab = ref<"todos" | "cliente" | "no-cliente">("todos");
function setClientTab(tab: "todos" | "cliente" | "no-cliente") {
  clientTab.value = tab;
  setFilters(tab === "todos" ? [] : [{ col: "is_client", op: "eq", value: tab === "cliente" }]);
}
function hotelInitial(name: string): string {
  return (name || "?").replace(/^[^\p{L}\p{N}]+/u, "").charAt(0).toUpperCase() || "?";
}

const exporting = ref(false);
async function exportCsv() {
  exporting.value = true;
  try {
    const all = await fetchAllFiltered<Hotel>("hotels", "*, hotels_personnel(role, area, personnel(id, name))", "name", pager.search, ["name"], pager.filters);
    const visibleCols = columns.hoteles.filter((c) => c.visible);
    const csvRows = all.map((h) => {
      const row: Record<string, unknown> = {};
      for (const c of visibleCols) {
        if (c.key === "equipo") row[c.label] = (h.hotels_personnel || []).length;
        else if (c.key === "is_client") row[c.label] = h.is_client ? "Sí" : "No";
        else if (c.key === "is_chain") row[c.label] = h.is_chain ? "Sí" : "No";
        else row[c.label] = (h as unknown as Record<string, unknown>)[c.dbCol ?? c.key];
      }
      return row;
    });
    downloadCsv(`hoteles-${Date.now()}.csv`, csvRows);
    toast.show(`${csvRows.length.toLocaleString("es-ES")} hoteles exportados`);
  } catch (e) { toast.error(e, "exportar el CSV"); }
  finally { exporting.value = false; }
}

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
useDeepLinkFetch<Hotel>("hotels", HOTELS_SELECT, openEdit);
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
</script>

<template>
  <div class="view-head">
    <div>
      <h1>Hoteles</h1>
      <div class="view-sub">
        {{ pager.total.toLocaleString("es-ES") }} hoteles en total · {{ catalogs.counts.hotelsClient.toLocaleString("es-ES") }} clientes{{ pager.search || pager.filters.length ? " · resultados filtrados" : "" }}
      </div>
    </div>
    <div style="display: flex; gap: 9px; align-items: center">
      <ViewControls v-model:mode="viewMode" @columns="showColEditor = true" />
      <button class="btn btn-ghost" :disabled="exporting" @click="exportCsv">{{ exporting ? "Exportando..." : "Exportar CSV" }}</button>
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nuevo hotel
      </button>
    </div>
  </div>

  <div class="tabs">
    <button class="tab-btn" :class="{ active: clientTab === 'todos' }" @click="setClientTab('todos')">
      Todos <span class="tab-count">{{ catalogs.counts.hotels.toLocaleString("es-ES") }}</span>
    </button>
    <button class="tab-btn" :class="{ active: clientTab === 'cliente' }" @click="setClientTab('cliente')">
      Con cliente <span class="tab-count">{{ catalogs.counts.hotelsClient.toLocaleString("es-ES") }}</span>
    </button>
    <button class="tab-btn" :class="{ active: clientTab === 'no-cliente' }" @click="setClientTab('no-cliente')">
      Sin cliente <span class="tab-count">{{ (catalogs.counts.hotels - catalogs.counts.hotelsClient).toLocaleString("es-ES") }}</span>
    </button>
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
          <div class="cell-person">
            <span class="hc-avatar hc-avatar-sm" :class="{ client: row.is_client }">{{ hotelInitial(row.name) }}</span>
            <div><div class="p-name">{{ row.name }}</div><div class="p-sub">ID {{ row.jaippy_id ?? row.id }}</div></div>
          </div>
        </template>
        <template #cell-current_ij="{ row }">
          <span v-if="row.current_ij != null" class="hc-ij" :class="row.current_ij >= 8 ? 'good' : 'bad'">{{ num(row.current_ij, 2) }}</span>
          <span v-else>—</span>
        </template>
        <template #cell-stars="{ row }">
          <span v-if="row.stars" class="hc-stars"><span v-for="i in 5" :key="i" :class="{ on: i <= row.stars! }">★</span></span>
          <span v-else>—</span>
        </template>
        <template #cell-booking_url="{ row }">
          <a v-if="row.booking_url" class="mini-btn" :href="row.booking_url" target="_blank" rel="noopener" title="Ver en Booking" @click.stop>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M6 5H4v15h15v-2"/></svg>
          </a>
          <span v-else>—</span>
        </template>
        <template #cell-is_client="{ row }">
          <div style="display: flex; align-items: center; gap: 8px">
            <template v-if="row.is_client">
              <span class="hc-client-chip"><span class="hc-client-dot"></span><span class="hc-client-label">Cliente</span></span>
              <div class="hc-team">
                <span v-for="a in (row.hotels_personnel || []).slice(0, 3)" :key="a.personnel?.id" class="hc-team-chip" :title="a.personnel?.name">{{ initials(a.personnel?.name) }}</span>
              </div>
            </template>
            <span v-else class="badge off">Sin cliente</span>
          </div>
        </template>
        <template #cell-is_chain="{ row }">{{ row.is_chain ? "Sí" : "No" }}</template>
        <template #cell-equipo="{ row }">{{ (row.hotels_personnel || []).length }}</template>
      </DataTable>
      <Pager :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
    </template>
    <div v-else class="card empty"><div class="e-title">Sin hoteles</div><p>Crea el primer hotel para empezar.</p></div>
  </template>

  <template v-else>
    <div class="co-grid">
      <div v-for="h in rows" :key="h.id" class="card co-card hotel-card" :class="{ 'is-client': h.is_client }" @click="openEdit(h)">
        <div class="row-actions">
          <button class="mini-btn" title="Editar" @click.stop="openEdit(h)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/></svg>
          </button>
          <button class="mini-btn del" title="Eliminar" @click.stop="onDelete(h)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></svg>
          </button>
        </div>
        <div class="hc-top">
          <div class="hc-avatar" :class="{ client: h.is_client }">{{ hotelInitial(h.name) }}</div>
          <span v-if="h.current_ij != null" class="hc-ij" :class="h.current_ij >= 8 ? 'good' : 'bad'">{{ num(h.current_ij, 2) }}</span>
        </div>
        <div class="hc-name">{{ h.name }}</div>
        <div class="hc-meta">
          <span v-if="h.stars" class="hc-stars">
            <span v-for="i in 5" :key="i" :class="{ on: i <= h.stars! }">★</span>
          </span>
          <span v-if="h.city">{{ h.city }}, ES</span>
        </div>
        <div class="hc-foot">
          <template v-if="h.is_client">
            <span class="hc-client-chip"><span class="hc-client-dot"></span><span class="hc-client-label">Cliente</span></span>
            <div class="hc-team">
              <span v-for="a in (h.hotels_personnel || []).slice(0, 3)" :key="a.personnel?.id" class="hc-team-chip" :title="a.personnel?.name">{{ initials(a.personnel?.name) }}</span>
            </div>
          </template>
          <span v-else class="badge off">Sin cliente</span>
        </div>
      </div>
      <div v-if="!rows.length" class="card empty" style="grid-column: 1 / -1"><div class="e-title">Sin hoteles</div><p>Crea el primer hotel para empezar.</p></div>
    </div>
    <Pager v-if="rows.length" :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
  </template>

  <ColumnEditor v-if="showColEditor" :columns="columns.hoteles" @update:columns="columns.setHotelColumns" @close="showColEditor = false" />
  <HotelModal v-if="showModal" :hotel="editing" @close="showModal = false" @saved="onSaved" />
</template>
