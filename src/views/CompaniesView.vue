<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { usePagedEntity } from "../composables/usePagedEntity";
import { useSearchStore } from "../stores/search";
import { useColumnStore } from "../stores/columns";
import { useCatalogStore } from "../stores/catalogs";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import { supabase } from "../lib/supabase";
import { useDeepLinkFetch } from "../composables/useDeepLinkOpen";
import DataTable from "../components/ui/DataTable.vue";
import Pager from "../components/ui/Pager.vue";
import ViewControls from "../components/ui/ViewControls.vue";
import ColumnEditor from "../components/ui/ColumnEditor.vue";
import CompanyModal from "../components/companies/CompanyModal.vue";
import type { Company, ColumnDef } from "../lib/types";

const search = useSearchStore();
const columns = useColumnStore();
const catalogs = useCatalogStore();
const toast = useToastStore();
const confirm = useConfirmStore();

const { rows, pager, fetchPage, setSearch, setSort, setPage, setPageSize } = usePagedEntity<Company>(
  { table: "companies", select: "*, contacts_companies(id, contacts(id, name))", searchCols: ["name", "category"] },
  "name",
);

onMounted(() => {
  search.register(setSearch, pager.search, "Buscar empresas por nombre o categoría");
  fetchPage();
});
onUnmounted(() => search.unregister());

const viewMode = ref<"cards" | "list">("cards");
const showColEditor = ref(false);
const editing = ref<Company | null>(null);
const showModal = ref(false);

function openNew() { editing.value = null; showModal.value = true; }
function openEdit(c: Company) { editing.value = c; showModal.value = true; }
useDeepLinkFetch<Company>("companies", "*, contacts_companies(id, contacts(id, name))", openEdit);
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
      <div class="view-sub">{{ pager.total.toLocaleString("es-ES") }} cuentas registradas{{ pager.search ? " · resultados filtrados" : "" }}</div>
    </div>
    <div style="display: flex; gap: 9px; align-items: center">
      <ViewControls v-model:mode="viewMode" @columns="showColEditor = true" />
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nueva empresa
      </button>
    </div>
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
            <span class="avatar">{{ row.name.slice(0, 2).toUpperCase() }}</span>
            <span class="p-name">{{ row.name }}</span>
          </div>
        </template>
        <template #cell-client="{ row }"><span class="badge" :class="row.client ? 'on' : 'off'">{{ row.client ? "Cliente" : "No cliente" }}</span></template>
        <template #cell-contactos="{ row }">{{ (row.contacts_companies || []).length }}</template>
      </DataTable>
      <Pager :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
    </template>
    <div v-else class="card empty"><div class="e-title">Sin resultados</div><p>Ajusta la búsqueda o crea una empresa nueva.</p></div>
  </template>

  <template v-else>
    <div class="co-grid">
      <div v-for="c in rows" :key="c.id" class="card co-card" @click="openEdit(c)">
        <div class="row-actions">
          <button class="mini-btn" title="Editar" @click.stop="openEdit(c)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/></svg>
          </button>
          <button class="mini-btn del" title="Eliminar" @click.stop="onDelete(c)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></svg>
          </button>
        </div>
        <div class="co-name">{{ c.name }}<span class="badge" :class="c.client ? 'on' : 'off'">{{ c.client ? "Cliente" : "No cliente" }}</span></div>
        <div class="co-sector">{{ c.category || "Sin categoría" }}{{ c.phone ? " · " + c.phone : "" }}</div>
        <div class="co-stats">
          <div class="co-stat"><div class="cs-v">{{ (c.contacts_companies || []).length }}</div><div class="cs-l">Contactos</div></div>
        </div>
      </div>
      <div v-if="!rows.length" class="card empty" style="grid-column: 1 / -1"><div class="e-title">Sin resultados</div><p>Ajusta la búsqueda o crea una empresa nueva.</p></div>
    </div>
    <Pager v-if="rows.length" :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
  </template>

  <ColumnEditor v-if="showColEditor" :columns="columns.empresas" @update:columns="columns.setCompanyColumns" @close="showColEditor = false" />
  <CompanyModal v-if="showModal" :company="editing" @close="showModal = false" @saved="onSaved" />
</template>
