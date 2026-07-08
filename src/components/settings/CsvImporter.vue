<script setup lang="ts">
import { ref } from "vue";
import Papa from "papaparse";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { useCatalogStore } from "../../stores/catalogs";

interface FieldDef { key: string; label: string; required?: boolean }
const IMPORT_FIELDS: Record<"contactos" | "empresas", FieldDef[]> = {
  contactos: [
    { key: "name", label: "Nombre", required: true },
    { key: "email", label: "Correo electrónico" },
    { key: "phone", label: "Teléfono" },
    { key: "lead_status", label: "Estado del lead" },
  ],
  empresas: [
    { key: "name", label: "Nombre", required: true },
    { key: "phone", label: "Teléfono" },
    { key: "category", label: "Categoría" },
    { key: "client", label: "Es cliente (sí/no)" },
  ],
};

const toast = useToastStore();
const catalogs = useCatalogStore();

const entity = ref<"contactos" | "empresas">("contactos");
const dragging = ref(false);
const rows = ref<Record<string, string>[] | null>(null);
const headers = ref<string[]>([]);
const mapping = ref<Record<string, string>>({});
const importing = ref(false);
const progress = ref(0);
const fileInput = ref<HTMLInputElement | null>(null);

function guessColumn(fieldKey: string): string {
  const needle = fieldKey.replace("_", " ");
  return headers.value.find((h) => h.toLowerCase().includes(needle)) ?? "";
}

function handleFile(file: File) {
  Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      if (!res.data.length) { toast.show("El archivo no tiene filas."); return; }
      rows.value = res.data;
      headers.value = res.meta.fields ?? [];
      mapping.value = {};
      for (const f of IMPORT_FIELDS[entity.value]) {
        const guess = guessColumn(f.key);
        if (guess) mapping.value[f.key] = guess;
      }
    },
    error: () => toast.show("No se pudo leer el archivo. Comprueba que sea un CSV válido."),
  });
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) handleFile(file);
}
function onDrop(e: DragEvent) {
  dragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
}
function cancelImport() {
  rows.value = null;
  if (fileInput.value) fileInput.value.value = "";
}

async function runImport() {
  if (!rows.value) return;
  const fields = IMPORT_FIELDS[entity.value];
  const reqField = fields.find((f) => f.required)!;
  if (!mapping.value[reqField.key]) { toast.show(`Asigna una columna al campo obligatorio "${reqField.label}".`); return; }

  const table = entity.value === "contactos" ? "contacts" : "companies";
  const toInsert = rows.value
    .map((r) => {
      const row: Record<string, unknown> = {};
      for (const f of fields) {
        const col = mapping.value[f.key];
        if (!col) continue;
        const raw = (r[col] ?? "").toString().trim();
        if (f.key === "client") { row[f.key] = /^(s[ií]|true|yes|1)$/i.test(raw); continue; }
        row[f.key] = raw === "" ? null : raw;
      }
      return row;
    })
    .filter((r) => r[reqField.key]);

  if (!toInsert.length) { toast.show("No hay filas válidas para importar."); return; }

  importing.value = true;
  progress.value = 0;
  const BATCH = 300;
  let done = 0;
  try {
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error } = await supabase.from(table).insert(batch);
      if (error) throw new Error(error.message);
      done += batch.length;
      progress.value = Math.round((done / toInsert.length) * 100);
    }
    toast.show(`${done.toLocaleString("es-ES")} filas importadas en ${entity.value}.`);
    cancelImport();
    await catalogs.refreshCatalogsAndCounts();
  } catch (e) {
    toast.error(e, "importar el CSV");
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="field" style="max-width: 280px">
    <label>Qué vas a importar</label>
    <select v-model="entity">
      <option value="contactos">Contactos</option>
      <option value="empresas">Empresas</option>
    </select>
  </div>

  <div
    class="import-drop"
    :class="{ drag: dragging }"
    @click="fileInput?.click()"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept=".csv" @change="onFileChange" />
    <p style="font-weight: 600; margin-bottom: 4px">Arrastra tu CSV aquí o haz clic para elegirlo</p>
    <p style="font-size: 12px; color: var(--faint)">Archivo .csv con cabecera en la primera fila</p>
  </div>

  <div v-if="rows" style="margin-top: 16px">
    <p style="font-size: 12.5px; color: var(--muted); margin-bottom: 8px">
      {{ rows.length.toLocaleString("es-ES") }} filas detectadas. Indica qué columna de tu archivo corresponde a cada campo:
    </p>
    <div v-for="f in IMPORT_FIELDS[entity]" :key="f.key" class="map-row">
      <span>{{ f.label }}{{ f.required ? " *" : "" }}</span>
      <span class="mr-arrow">&larr;</span>
      <select v-model="mapping[f.key]">
        <option value="">No importar</option>
        <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
      </select>
    </div>
    <div v-if="importing" class="progress-bar"><i :style="{ width: progress + '%' }"></i></div>
    <div style="display: flex; gap: 9px; margin-top: 14px">
      <button class="btn btn-ghost" :disabled="importing" @click="cancelImport">Cancelar</button>
      <button class="btn btn-primary" :disabled="importing" @click="runImport">{{ importing ? "Importando..." : "Importar" }}</button>
    </div>
  </div>
</template>
