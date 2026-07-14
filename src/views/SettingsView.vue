<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useCatalogStore } from "../stores/catalogs";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import { useSearchStore } from "../stores/search";
import { supabase } from "../lib/supabase";
import { ICONS } from "../lib/icons";
import CsvImporter from "../components/settings/CsvImporter.vue";
import MergeDuplicatesModal from "../components/settings/MergeDuplicatesModal.vue";
import type { BillingModel } from "../lib/types";

const auth = useAuthStore();
const catalogs = useCatalogStore();
const toast = useToastStore();
const confirm = useConfirmStore();
const search = useSearchStore();
search.register(() => {}, "", "Buscar en el módulo actual");
onUnmounted(() => search.unregister());

const newUserEmail = ref("");
const newUserName = ref("");
const invitingUser = ref(false);
async function inviteUser() {
  const email = newUserEmail.value.trim();
  if (!email) return;
  invitingUser.value = true;
  try {
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: { email, name: newUserName.value.trim() || undefined },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    toast.show(`Invitación enviada a ${email}`);
    newUserEmail.value = "";
    newUserName.value = "";
  } catch (e) { toast.error(e, "invitar al usuario"); }
  finally { invitingUser.value = false; }
}

const BILLING_COLORS = ["#6366f1", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
const newBillingName = ref("");
async function addBillingModel() {
  const n = newBillingName.value.trim();
  if (!n) return;
  try {
    const color = BILLING_COLORS[catalogs.billing.length % BILLING_COLORS.length];
    const { error } = await supabase.from("billing_models").insert({ name: n, color });
    if (error) throw error;
    toast.show("Modelo añadido");
    newBillingName.value = "";
    await catalogs.loadCatalogs();
  } catch (e) { toast.error(e, "añadir el modelo"); }
}

async function removeBillingModel(b: BillingModel) {
  const ok = await confirm.ask(`Se eliminará el modelo de facturación "${b.name}".`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("billing_models").delete().eq("id", b.id);
    if (error) throw error;
    toast.show("Modelo eliminado");
    await catalogs.loadCatalogs();
  } catch (e) { toast.error(e, "eliminar el modelo"); }
}

interface DupItem { id: number; name: string; [key: string]: unknown }
const dupContacts = ref<{ key: string; items: DupItem[] }[]>([]);
const dupCompanies = ref<{ key: string; items: DupItem[] }[]>([]);
const checkingDup = ref(false);
const dupChecked = ref(false);
const merging = ref<{ kind: "contacts" | "companies"; items: DupItem[] } | null>(null);

function normalize(s: string): string {
  return s.trim().toLowerCase();
}
function groupDuplicates<T>(items: T[], keyFn: (item: T) => string): { key: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }
  return [...groups.entries()].filter(([, list]) => list.length > 1).map(([key, list]) => ({ key, items: list }));
}
async function findDuplicates() {
  checkingDup.value = true;
  try {
    const [contactsRes, companiesRes] = await Promise.all([
      supabase.from("contacts").select("id, name, email, phone, lead_status"),
      supabase.from("companies").select("id, name, phone, category, client"),
    ]);
    if (contactsRes.error) throw contactsRes.error;
    if (companiesRes.error) throw companiesRes.error;
    dupContacts.value = groupDuplicates(
      contactsRes.data ?? [],
      (c: { email: string | null; name: string }) => normalize(c.email || c.name),
    );
    dupCompanies.value = groupDuplicates(companiesRes.data ?? [], (c: { name: string }) => normalize(c.name));
    dupChecked.value = true;
  } catch (e) { toast.error(e, "buscar duplicados"); }
  finally { checkingDup.value = false; }
}
async function onMerged() {
  merging.value = null;
  await findDuplicates();
  await catalogs.refreshCatalogsAndCounts();
}

function exportJson() {
  const blob = new Blob(
    [JSON.stringify({ deals: catalogs.deals, personnel: catalogs.personnel, tags: catalogs.tags, billing_models: catalogs.billing }, null, 2)],
    { type: "application/json" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "divisual-catalogos.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast.show("Exportación descargada");
}
</script>

<template>
  <div class="view-head"><div><h1>Ajustes</h1><div class="view-sub">Conexión, catálogos y utilidades</div></div></div>

  <div class="card setting-block">
    <h3>Conexión con Supabase</h3>
    <p class="s-desc">
      La aplicación está conectada a tu proyecto de Supabase y toda la información se lee y escribe en tu base de datos
      PostgreSQL en tiempo real. Los listados grandes (contactos, empresas, hoteles) se paginan en el servidor.
      La sesión pertenece a <b>{{ auth.userEmail }}</b>.
    </p>
    <div class="endpoint-list">
      Tablas en uso: contacts, companies, contacts_companies, contacts_historial, tags,<br />
      tags_contacts, deals, billing_models, deals_hotels, hotels, personnel,<br />
      hotels_personnel, personnel_historial
    </div>
  </div>

  <div class="card setting-block">
    <h3>Usuarios del equipo</h3>
    <p class="s-desc">
      Invita a alguien nuevo por correo: le llega un enlace para poner su contraseña y ya puede entrar al CRM.
      Requiere la Edge Function <code>invite-user</code> desplegada en Supabase (ver <code>supabase/functions/invite-user</code>).
    </p>
    <div class="field-row" style="max-width: 480px">
      <div class="field"><label>Correo</label><input v-model="newUserEmail" type="email" placeholder="nombre@empresa.com" @keyup.enter="inviteUser" /></div>
      <div class="field"><label>Nombre (opcional)</label><input v-model="newUserName" type="text" placeholder="Cómo se llama" @keyup.enter="inviteUser" /></div>
    </div>
    <button class="btn btn-ghost" :disabled="invitingUser" @click="inviteUser">{{ invitingUser ? "Invitando..." : "Invitar" }}</button>
  </div>

  <div class="card setting-block">
    <h3>Importar datos desde CSV</h3>
    <p class="s-desc">
      Carga masiva de contactos o empresas desde un archivo CSV (por ejemplo, una exportación de HubSpot).
      Escoge el archivo, une cada columna con su campo correspondiente y confirma.
    </p>
    <CsvImporter />
  </div>

  <div class="card setting-block">
    <h3>Modelos de facturación</h3>
    <p class="s-desc">Catálogo que se asigna a cada negocio. Añade aquí los modelos con los que trabajas.</p>
    <div class="multi-list" style="margin-bottom: 14px">
      <div v-for="b in catalogs.billing" :key="b.id" class="multi-chip">
        <span style="display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: var(--dot-color); margin-right: 6px" :style="{ '--dot-color': b.color || 'var(--faint)' }"></span>
        <span>{{ b.name }}</span>
        <button type="button" title="Eliminar" @click="removeBillingModel(b)" v-html="ICONS.trash"></button>
      </div>
      <p v-if="!catalogs.billing.length" style="font-size: 12.5px; color: var(--faint)">Sin modelos todavía.</p>
    </div>
    <div style="display: flex; gap: 8px; max-width: 420px">
      <input v-model="newBillingName" placeholder="Nuevo modelo, p. ej. Por décimas" style="flex: 1; padding: 9px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); font-size: 13.5px; outline: none" @keyup.enter="addBillingModel" />
      <button class="btn btn-ghost" @click="addBillingModel">Añadir</button>
    </div>
  </div>

  <div class="card setting-block">
    <h3>Detectar duplicados</h3>
    <p class="s-desc">Busca contactos con el mismo correo y empresas con el mismo nombre, para revisarlos y fusionarlos a mano.</p>
    <button class="btn btn-ghost" :disabled="checkingDup" @click="findDuplicates">{{ checkingDup ? "Buscando..." : "Buscar duplicados" }}</button>
    <template v-if="dupChecked">
      <p v-if="!dupContacts.length && !dupCompanies.length" style="margin-top: 14px; font-size: 12.5px; color: var(--faint)">No se encontraron duplicados.</p>
      <template v-else>
        <template v-if="dupContacts.length">
          <div class="panel-title" style="margin: 16px 0 8px">Contactos <span class="hint">{{ dupContacts.length }} grupos</span></div>
          <div v-for="g in dupContacts" :key="g.key" style="border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap">
            <div style="display: flex; flex-wrap: wrap; gap: 6px">
              <router-link v-for="c in g.items" :key="c.id" class="chip-btn" :to="{ name: 'contactos', query: { open: c.id } }">{{ c.name }}</router-link>
            </div>
            <button class="btn btn-ghost" style="flex: none" @click="merging = { kind: 'contacts', items: g.items }">Fusionar</button>
          </div>
        </template>
        <template v-if="dupCompanies.length">
          <div class="panel-title" style="margin: 16px 0 8px">Empresas <span class="hint">{{ dupCompanies.length }} grupos</span></div>
          <div v-for="g in dupCompanies" :key="g.key" style="border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap">
            <div style="display: flex; flex-wrap: wrap; gap: 6px">
              <router-link v-for="c in g.items" :key="c.id" class="chip-btn" :to="{ name: 'empresas', query: { open: c.id } }">{{ c.name }}</router-link>
            </div>
            <button class="btn btn-ghost" style="flex: none" @click="merging = { kind: 'companies', items: g.items }">Fusionar</button>
          </div>
        </template>
      </template>
    </template>
  </div>

  <div class="card setting-block">
    <h3>Exportar catálogos</h3>
    <p class="s-desc">Descarga en JSON los negocios, el personal, las etiquetas y los modelos de facturación cargados.</p>
    <button class="btn btn-ghost" @click="exportJson">Descargar JSON</button>
  </div>

  <MergeDuplicatesModal v-if="merging" :kind="merging.kind" :items="merging.items" @close="merging = null" @merged="onMerged" />
</template>
