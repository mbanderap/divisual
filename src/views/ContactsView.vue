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
import { ICONS } from "../lib/icons";
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
import type { Contact, ColumnDef, ContactList } from "../lib/types";

const CONTACTS_SELECT = "*, contacts_companies(id, role, companies(id, name)), tags_contacts(id, tags(id, name)), hotels_contacts(id, hotels(id, name))";

const search = useSearchStore();
const columns = useColumnStore();
const catalogs = useCatalogStore();
const toast = useToastStore();
const confirm = useConfirmStore();

const { rows, pager, fetchPage, setSearch, setFilters, setSort, setPage, setPageSize } = usePagedEntity<Contact>(
  { table: "contacts", select: CONTACTS_SELECT, searchCols: ["name", "last_name", "email", "phone", "mobile_phone"] },
  "creation_date",
);

const statusFilter = ref("");
const tagFilter = ref("");
const listFilter = ref("");

async function applyFilters() {
  const filters: import("../lib/types").FilterDef[] = [];
  if (statusFilter.value) filters.push({ col: "lead_status", op: "eq", value: statusFilter.value });
  if (tagFilter.value) {
    const { data, error } = await supabase.from("tags_contacts").select("contact_id").eq("tags", parseInt(tagFilter.value));
    if (error) { toast.error(error, "filtrar por etiqueta"); return; }
    filters.push({ col: "id", op: "in", value: (data ?? []).map((r) => r.contact_id as number).length ? (data ?? []).map((r) => r.contact_id as number) : [-1] });
  }
  if (listFilter.value) {
    const { data, error } = await supabase.from("contact_lists_contacts").select("contact_id").eq("list_id", parseInt(listFilter.value));
    if (error) { toast.error(error, "filtrar por lista"); return; }
    filters.push({ col: "id", op: "in", value: (data ?? []).map((r) => r.contact_id as number).length ? (data ?? []).map((r) => r.contact_id as number) : [-1] });
  }
  setFilters(filters);
}

const exporting = ref(false);
async function exportCsv() {
  exporting.value = true;
  try {
    const all = await fetchAllFiltered<Contact>("contacts", CONTACTS_SELECT, "creation_date", pager.search, ["name", "last_name", "email", "phone", "mobile_phone"], pager.filters);
    const visibleCols = columns.contactos.filter((c) => c.visible);
    const csvRows = all.map((c) => {
      const row: Record<string, unknown> = {};
      for (const col of visibleCols) {
        if (col.key === "empresa") row[col.label] = c.contacts_companies?.[0]?.companies?.name ?? "";
        else if (col.key === "hotel") row[col.label] = c.hotels_contacts?.[0]?.hotels?.name ?? "";
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

const lists = ref<ContactList[]>([]);
async function loadLists() {
  const { data, error } = await supabase.from("contact_lists").select("*, contact_lists_contacts(id)").order("name");
  if (error) { toast.error(error, "cargar las listas"); return; }
  lists.value = (data ?? []) as ContactList[];
}

onMounted(() => {
  search.register(setSearch, pager.search, "Buscar contactos por nombre, correo o teléfono");
  fetchPage();
  loadLists();
});
onUnmounted(() => search.unregister());

const showColEditor = ref(false);
const editing = ref<Contact | null>(null);
const showModal = ref(false);
const showTagModal = ref(false);
const newTagName = ref("");
const selectedIds = ref<number[]>([]);
const showListsModal = ref(false);
const showAddToListModal = ref(false);
const addToListChoice = ref("");
const newListName = ref("");
const savingList = ref(false);

async function addSelectedToList() {
  if (!selectedIds.value.length) return;
  savingList.value = true;
  try {
    let listId: number;
    if (addToListChoice.value === "__new__") {
      const n = newListName.value.trim();
      if (!n) { toast.show("Ponle un nombre a la lista."); savingList.value = false; return; }
      const { data, error } = await supabase.from("contact_lists").insert({ name: n }).select("id");
      if (error) throw error;
      listId = data[0].id;
    } else {
      listId = parseInt(addToListChoice.value);
    }
    if (!listId) { toast.show("Elige o crea una lista."); savingList.value = false; return; }
    const rows = selectedIds.value.map((contact_id) => ({ list_id: listId, contact_id }));
    const { error } = await supabase.from("contact_lists_contacts").upsert(rows, { onConflict: "list_id,contact_id", ignoreDuplicates: true });
    if (error) throw error;
    toast.show(`${selectedIds.value.length} contactos añadidos a la lista`);
    showAddToListModal.value = false;
    addToListChoice.value = "";
    newListName.value = "";
    selectedIds.value = [];
    await loadLists();
  } catch (e) { toast.error(e, "añadir a la lista"); }
  finally { savingList.value = false; }
}
async function deleteList(l: ContactList) {
  const ok = await confirm.ask(`Se eliminará la lista "${l.name}" (los contactos no se borran, solo dejan de estar en esta lista).`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("contact_lists").delete().eq("id", l.id);
    if (error) throw error;
    toast.show("Lista eliminada");
    if (listFilter.value === String(l.id)) { listFilter.value = ""; applyFilters(); }
    await loadLists();
  } catch (e) { toast.error(e, "eliminar la lista"); }
}

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
    <div style="display: flex; gap: 9px; align-items: center; flex-wrap: wrap">
      <select v-model="statusFilter" class="filter-select" @change="applyFilters">
        <option value="">Todos los estados</option>
        <option v-for="s in LEAD_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="tagFilter" class="filter-select" @change="applyFilters">
        <option value="">Todas las etiquetas</option>
        <option v-for="t in catalogs.tags" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
      </select>
      <select v-model="listFilter" class="filter-select" @change="applyFilters">
        <option value="">Todas las listas</option>
        <option v-for="l in lists" :key="l.id" :value="String(l.id)">{{ l.name }} ({{ l.contact_lists_contacts?.length ?? 0 }})</option>
      </select>
      <ViewControls :show-toggle="false" @columns="showColEditor = true" />
      <button class="btn btn-ghost" :disabled="exporting" @click="exportCsv">{{ exporting ? "Exportando..." : "Exportar CSV" }}</button>
      <button class="btn btn-ghost" @click="showTagModal = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Etiqueta
      </button>
      <button class="btn btn-ghost" @click="showListsModal = true">Listas</button>
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nuevo contacto
      </button>
    </div>
  </div>

  <div v-if="selectedIds.length" class="card" style="padding: 10px 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px">
    <span style="font-size: 13px">{{ selectedIds.length }} contacto{{ selectedIds.length === 1 ? "" : "s" }} seleccionado{{ selectedIds.length === 1 ? "" : "s" }}</span>
    <button class="btn btn-ghost btn-sm" @click="showAddToListModal = true">Añadir a lista</button>
    <button class="btn btn-ghost btn-sm" style="margin-left: auto" @click="selectedIds = []">Quitar selección</button>
  </div>

  <template v-if="rows.length">
    <DataTable
      :columns="columns.contactos"
      :rows="rows"
      :active-sort-key="pager.sortKey"
      :active-sort-dir="pager.sortDir"
      selectable
      :selected="selectedIds"
      @update:selected="selectedIds = $event"
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
      <template #cell-hotel="{ row }">{{ row.hotels_contacts?.[0]?.hotels?.name || "—" }}</template>
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
  <Modal v-if="showAddToListModal" width="420px" @close="showAddToListModal = false">
    <h2>Añadir {{ selectedIds.length }} contacto{{ selectedIds.length === 1 ? "" : "s" }} a una lista</h2>
    <div class="field">
      <label>Lista</label>
      <select v-model="addToListChoice">
        <option value="">Elige una lista...</option>
        <option v-for="l in lists" :key="l.id" :value="String(l.id)">{{ l.name }}</option>
        <option value="__new__">+ Crear lista nueva</option>
      </select>
    </div>
    <div class="field" v-if="addToListChoice === '__new__'">
      <label>Nombre de la lista nueva</label>
      <input v-model="newListName" type="text" placeholder="Invitados evento Sevilla..." />
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="showAddToListModal = false">Cancelar</button>
      <button class="btn btn-primary" :disabled="savingList" @click="addSelectedToList">{{ savingList ? "Guardando..." : "Añadir" }}</button>
    </div>
  </Modal>
  <Modal v-if="showListsModal" width="480px" @close="showListsModal = false">
    <h2>Listas de contactos</h2>
    <div class="multi-list">
      <div v-for="l in lists" :key="l.id" class="multi-chip">
        <span>{{ l.name }} ({{ l.contact_lists_contacts?.length ?? 0 }})</span>
        <button type="button" title="Eliminar" @click="deleteList(l)" v-html="ICONS.trash"></button>
      </div>
      <p v-if="!lists.length" style="font-size: 12.5px; color: var(--faint)">Sin listas todavía. Selecciona contactos en la tabla y usa "Añadir a lista" para crear la primera.</p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="showListsModal = false">Cerrar</button>
    </div>
  </Modal>
</template>
