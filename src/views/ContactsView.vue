<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { usePagedEntity } from "../composables/usePagedEntity";
import { useSearchStore } from "../stores/search";
import { useColumnStore } from "../stores/columns";
import { useCatalogStore } from "../stores/catalogs";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import { supabase } from "../lib/supabase";
import { fdate, statusClass } from "../lib/format";
import { fetchAllFiltered } from "../lib/fetchAll";
import { downloadCsv } from "../lib/csvExport";
import { useDeepLinkFetch } from "../composables/useDeepLinkOpen";
import DataTable from "../components/ui/DataTable.vue";
import Pager from "../components/ui/Pager.vue";
import ViewControls from "../components/ui/ViewControls.vue";
import ColumnEditor from "../components/ui/ColumnEditor.vue";
import Avatar from "../components/ui/Avatar.vue";
import ContactModal from "../components/contacts/ContactModal.vue";
import Modal from "../components/ui/Modal.vue";
import { LEAD_STATUSES } from "../lib/types";
import type { Contact, ColumnDef } from "../lib/types";

const CONTACTS_SELECT = "*, contacts_companies(id, role, companies(id, name)), tags_contacts(id, tags(id, name))";

const search = useSearchStore();
const columns = useColumnStore();
const catalogs = useCatalogStore();
const toast = useToastStore();
const confirm = useConfirmStore();

const { rows, pager, fetchPage, setSearch, setFilters, setSort, setPage, setPageSize } = usePagedEntity<Contact>(
  { table: "contacts", select: CONTACTS_SELECT, searchCols: ["name", "email", "phone"] },
  "creation_date",
);

const statusFilter = ref("");
function applyStatusFilter() {
  setFilters(statusFilter.value === "" ? [] : [{ col: "lead_status", op: "eq", value: statusFilter.value }]);
}

const exporting = ref(false);
async function exportCsv() {
  exporting.value = true;
  try {
    const all = await fetchAllFiltered<Contact>("contacts", CONTACTS_SELECT, "creation_date", pager.search, ["name", "email", "phone"], pager.filters);
    const visibleCols = columns.contactos.filter((c) => c.visible);
    const csvRows = all.map((c) => {
      const row: Record<string, unknown> = {};
      for (const col of visibleCols) {
        if (col.key === "empresa") row[col.label] = c.contacts_companies?.[0]?.companies?.name ?? "";
        else if (col.key === "etiquetas") row[col.label] = (c.tags_contacts || []).map((t) => t.tags?.name).filter(Boolean).join(", ");
        else if (col.key === "creation_date" || col.key === "last_update") row[col.label] = fdate((c as unknown as Record<string, string | null>)[col.dbCol ?? col.key]);
        else row[col.label] = (c as unknown as Record<string, unknown>)[col.dbCol ?? col.key];
      }
      return row;
    });
    downloadCsv(`contactos-${Date.now()}.csv`, csvRows);
    toast.show(`${csvRows.length.toLocaleString("es-ES")} contactos exportados`);
  } catch (e) { toast.error(e, "exportar el CSV"); }
  finally { exporting.value = false; }
}

onMounted(() => {
  search.register(setSearch, pager.search, "Buscar contactos por nombre, correo o teléfono");
  fetchPage();
});
onUnmounted(() => search.unregister());

const showColEditor = ref(false);
const editing = ref<Contact | null>(null);
const showModal = ref(false);
const showTagModal = ref(false);
const newTagName = ref("");

function openNew() { editing.value = null; showModal.value = true; }
function openEdit(c: Contact) { editing.value = c; showModal.value = true; }
useDeepLinkFetch<Contact>("contacts", CONTACTS_SELECT, openEdit);
function onSaved() {
  showModal.value = false;
  fetchPage();
  catalogs.loadCounts();
}
async function onDelete(c: Contact) {
  const ok = await confirm.ask(`Se eliminará el contacto ${c.name} junto con su historial y vínculos.`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("contacts").delete().eq("id", c.id);
    if (error) throw error;
    toast.show("Contacto eliminado");
    fetchPage();
    catalogs.loadCounts();
  } catch (e) { toast.error(e, "eliminar el contacto"); }
}
function onSort(c: ColumnDef<Contact>) {
  if (c.dbCol) setSort(c.dbCol);
}
async function createTag() {
  const n = newTagName.value.trim();
  if (!n) return;
  try {
    const { error } = await supabase.from("tags").insert({ name: n });
    if (error) throw error;
    toast.show("Etiqueta creada");
    showTagModal.value = false;
    newTagName.value = "";
    await catalogs.loadCatalogs();
  } catch (e) { toast.error(e, "crear la etiqueta"); }
}
</script>

<template>
  <div class="view-head">
    <div>
      <h1>Contactos</h1>
      <div class="view-sub">{{ pager.total.toLocaleString("es-ES") }} contactos en total{{ pager.search || pager.filters.length ? " · resultados filtrados" : "" }}</div>
    </div>
    <div style="display: flex; gap: 9px; align-items: center">
      <select v-model="statusFilter" class="filter-select" @change="applyStatusFilter">
        <option value="">Todos los estados</option>
        <option v-for="s in LEAD_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
      <ViewControls :show-toggle="false" @columns="showColEditor = true" />
      <button class="btn btn-ghost" :disabled="exporting" @click="exportCsv">{{ exporting ? "Exportando..." : "Exportar CSV" }}</button>
      <button class="btn btn-ghost" @click="showTagModal = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Etiqueta
      </button>
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nuevo contacto
      </button>
    </div>
  </div>

  <template v-if="rows.length">
    <DataTable
      :columns="columns.contactos"
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
          <Avatar :name="row.name" />
          <div><div class="p-name">{{ row.name }}</div><div class="p-sub">{{ row.email || row.phone || "" }}</div></div>
        </div>
      </template>
      <template #cell-empresa="{ row }">
        <template v-if="row.contacts_companies?.[0]">
          <div class="p-name" style="font-weight: 500">{{ row.contacts_companies[0].companies?.name }}</div>
          <div class="p-sub">{{ row.contacts_companies[0].role }}</div>
        </template>
        <span v-else style="color: var(--faint)">—</span>
      </template>
      <template #cell-etiquetas="{ row }">
        <template v-if="row.tags_contacts?.length">
          <span v-for="t in row.tags_contacts" :key="t.id" class="tag chip">{{ t.tags?.name }}</span>
        </template>
        <span v-else style="color: var(--faint)">—</span>
      </template>
      <template #cell-lead_status="{ row }"><span class="tag" :class="statusClass(row.lead_status)">{{ row.lead_status || "—" }}</span></template>
      <template #cell-creation_date="{ row }">{{ fdate(row.creation_date) }}</template>
      <template #cell-last_update="{ row }">{{ fdate(row.last_update) }}</template>
    </DataTable>
    <Pager :page="pager.page" :page-size="pager.pageSize" :total="pager.total" @update:page="setPage" @update:page-size="setPageSize" />
  </template>
  <div v-else class="card empty">
    <div class="e-title">Sin resultados</div>
    <p>Ajusta la búsqueda o crea un contacto nuevo.</p>
  </div>

  <ColumnEditor v-if="showColEditor" :columns="columns.contactos" @update:columns="columns.setContactColumns" @close="showColEditor = false" />
  <ContactModal v-if="showModal" :contact="editing" @close="showModal = false" @saved="onSaved" />
  <Modal v-if="showTagModal" width="380px" @close="showTagModal = false">
    <h2>Nueva etiqueta</h2>
    <div class="field"><label>Nombre de la etiqueta</label><input v-model="newTagName" type="text" placeholder="VIP, Cadena, Renovación..." /></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="showTagModal = false">Cancelar</button>
      <button class="btn btn-primary" @click="createTag">Guardar</button>
    </div>
  </Modal>
</template>
