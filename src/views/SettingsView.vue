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
import type { BillingModel } from "../lib/types";

const auth = useAuthStore();
const catalogs = useCatalogStore();
const toast = useToastStore();
const confirm = useConfirmStore();
const search = useSearchStore();
search.register(() => {}, "", "Buscar en el módulo actual");
onUnmounted(() => search.unregister());

const newBillingName = ref("");
async function addBillingModel() {
  const n = newBillingName.value.trim();
  if (!n) return;
  try {
    const { error } = await supabase.from("billing_models").insert({ name: n });
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
    <h3>Exportar catálogos</h3>
    <p class="s-desc">Descarga en JSON los negocios, el personal, las etiquetas y los modelos de facturación cargados.</p>
    <button class="btn btn-ghost" @click="exportJson">Descargar JSON</button>
  </div>
</template>
