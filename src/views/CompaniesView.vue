<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { usePagedEntity } from "../composables/usePagedEntity";
import { useSearchStore } from "../stores/search";
import { useColumnStore } from "../stores/columns";
import { useCatalogStore } from "../stores/catalogs";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import { supabase } from "../lib/supabase";
import { initials } from "../lib/format";
import { fetchAllFiltered } from "../lib/fetchAll";
import { downloadCsv } from "../lib/csvExport";
import { useDeepLinkFetch } from "../composables/useDeepLinkOpen";
import DataTable from "../components/ui/DataTable.vue";
import Pager from "../components/ui/Pager.vue";
import ViewControls from "../components/ui/ViewControls.vue";
import ColumnEditor from "../components/ui/ColumnEditor.vue";
import CompanyModal from "../components/companies/CompanyModal.vue";
import type { Company, ColumnDef } from "../lib/types";

const COMPANIES_SELECT = "*, contacts_companies(id, role, contacts(id, name))";

const search = useSearchStore();
const columns = useColumnStore();
const catalogs = useCatalogStore();
const toast = useToastStore();
const confirm = useConfirmStore();

const { rows, pager, fetchPage, setSearch, setFilters, setSort, setPage, setPageSize } = usePagedEntity<Company>(
  { table: "companies", select: COMPANIES_SELECT, searchCols: ["name", "category"] },
  "name",
);

const clientTab = ref<"todos" | "cliente" | "no-cliente">("todos");
function setClientTab(tab: "todos" | "cliente" | "no-cliente") {
  clientTab.value = tab;
  setFilters(tab === "todos" ? [] : [{ col: "client", op: "eq", value: tab === "cliente" }]);
}
function companyInitial(name: string): string {
  return (name || "?").replace(/^[^\p{L}\p{N}]+/u, "").charAt(0).toUpperCase() || "?";
}

const exporting = ref(false);
async function exportCsv() {
  exporting.value = true;
  try {
    const all = await fetchAllFiltered<Company>("companies", COMPANIES_SELECT, "name", pager.search, ["name", "category"], pager.filters);
    const visibleCols = columns.empresas.filter((c) => c.visible);
    const csvRows = all.map((c) => {
      const row: Record<string, unknown> = {};
      for (const col of visibleCols) {
        if (col.key === "contactos") row[col.label] = (c.contacts_companies || []).length;
        else if (col.key === "client") row[col.label] = c.client ? "Cliente" : "No cliente";
        else row[col.label] = (c as unknown as Record<string, unknown>)[col.dbCol ?? col.key];
      }
      return row;
    });
    downloadCsv(`empresas-${Date.now()}.csv`, csvRows);
    toast.show(`${csvRows.length.toLocaleString("es-ES")} empresas exportadas`);
  } catch (e) { toast.error(e, "exportar el CSV"); }
  finally { exporting.value = false; }
}

onMounted(() => {
  search.register(setSearch, pager.search, "Buscar empresas por nombre o categoría");
  fetchPage();
  if (!catalogs.counts.companies) catalogs.loadCounts();
});
onUnmounted(() => search.unregister());

const viewMode = ref<"cards" | "list">("cards");
const showColEditor = ref(false);
const editing = ref<Company | null>(null);
const showModal = ref(false);

function openNew() { editing.value = null; showModal.value = true; }
function openEdit(c: Company) { editing.value = c; showModal.value = true; }
useDeepLinkFetch<Company>("companies", COMPANIES_SELECT, openEdit);
function onSaved() { showModal.value = false; fetchPage(); catalogs.loadCounts(); }
async function onDelete(c: Company) {
  const ok = await confirm.ask(`Se eliminará la empresa ${c.name} y sus vínculos con contactos.`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("companies").delete().eq("id", c.id);
    if (error) throw error;
    toast.show("Empresa eliminada");
    fetchPage(); catalogs.loadCounts();
  } catch (e) { toast.error(e, "eliminar la empresa"); }
}
function onSort(c: ColumnDef<Company>) { if (c.dbCol) setSort(c.dbCol); }
</script>

<template>
  <div class="view-head">
    <div>
      <h1>Empresas</h1>
      <div class="view-sub">{{ pager.total.toLocaleString("es-ES") }} cuentas registradas · {{ catalogs.counts.companiesClient.toLocaleString("es-ES") }} clientes{{ pager.search || pager.filters.length ? " · resultados filtrados" : "" }}</div>
    </div>
    <div style="display: flex; gap: 9px; align-items: center">
      <ViewControls v-model:mode="viewMode" @columns="showColEditor = true" />
      <button class="btn btn-ghost" :disabled="exporting" @click="exportCsv">{{ exporting ? "Exportando..." : "Exportar CSV" }}</button>
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nueva empresa
      </button>
    </div>
  </div>

  <div class="tabs">
    <button class="tab-btn" :class="{ active: clientTab === 'todos' }" @click="setClientTab('todos')">
      Todos <span class="tab-count">{{ catalogs.counts.companies.toLocaleString("es-ES") }}</span>
    </button>
    <button class="tab-btn" :class="{ active: clientTab === 'cliente' }" @click="setClientTab('cliente')">
      Con cliente <span class="tab-count">{{ catalogs.counts.companiesClient.toLocaleString("es-ES") }}</span>
    </button>
    <button class="tab-btn" :class="{ active: clientTab === 'no-cliente' }" @click="setClientTab('no-cliente')">
      Sin cliente <span class="tab-count">{{ (catalogs.counts.companies - catalogs.counts.companiesClient).toLocaleString("es-ES") }}</span>
    </button>
  </div>

  <template v-if="viewMode === 'list'">
    <template v-if="rows.length">
      <DataTable
        :columns="columns.empresas"
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
            <span class="hc-avatar hc-avatar-sm" :class="{ client: row.client }">{{ companyInitial(row.name) }}</span>
            <span class="p-name">{{ row.name }}</span>
          </div>
        </template>
        <template #cell-client="{ row }">
          <div style="display: flex; align-items: center; gap: 8px">
            <template v-if="row.client">
              <span class="hc-client-chip"><span class="hc-client-dot"></span><span class="hc-client-label">Cliente</span></span>
              <div class="hc-team">
                <span v-for="cc in (row.contacts_companies || []).slice(0, 3)" :key="cc.id" class="hc-team-chip" :title="cc.contacts?.name">{{ initials(cc.contacts?.name) }}</span>
              </div>
            </template>
            <span v-else class="badge off">Sin cliente</span>
          </div>
        </template>
        <template #cell-contactos="{ row }">{{ (row.contacts_companies || []).length }}</template>
      </DataTable>
      <Pager :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
    </template>
    <div v-else class="card empty"><div class="e-title">Sin resultados</div><p>Ajusta la búsqueda o crea una empresa nueva.</p></div>
  </template>

  <template v-else>
    <div class="co-grid">
      <div v-for="c in rows" :key="c.id" class="card co-card entity-card" :class="{ 'is-client': c.client }" @click="openEdit(c)">
        <div class="row-actions">
          <button class="mini-btn" title="Editar" @click.stop="openEdit(c)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/></svg>
          </button>
          <button class="mini-btn del" title="Eliminar" @click.stop="onDelete(c)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></svg>
          </button>
        </div>
        <div class="hc-top">
          <div class="hc-avatar" :class="{ client: c.client }">{{ companyInitial(c.name) }}</div>
        </div>
        <div class="hc-name">{{ c.name }}</div>
        <div class="hc-meta">
          <span>{{ c.category || "Sin categoría" }}</span>
          <span v-if="c.city">· {{ c.city }}</span>
        </div>
        <div class="hc-foot">
          <template v-if="c.client">
            <span class="hc-client-chip"><span class="hc-client-dot"></span><span class="hc-client-label">Cliente</span></span>
            <div class="hc-team">
              <span v-for="cc in (c.contacts_companies || []).slice(0, 3)" :key="cc.id" class="hc-team-chip" :title="cc.contacts?.name">{{ initials(cc.contacts?.name) }}</span>
            </div>
          </template>
          <span v-else class="badge off">Sin cliente</span>
        </div>
      </div>
      <div v-if="!rows.length" class="card empty" style="grid-column: 1 / -1"><div class="e-title">Sin resultados</div><p>Ajusta la búsqueda o crea una empresa nueva.</p></div>
    </div>
    <Pager v-if="rows.length" :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
  </template>

  <ColumnEditor v-if="showColEditor" :columns="columns.empresas" @update:columns="columns.setCompanyColumns" @close="showColEditor = false" />
  <CompanyModal v-if="showModal" :company="editing" @close="showModal = false" @saved="onSaved" />
</template>
