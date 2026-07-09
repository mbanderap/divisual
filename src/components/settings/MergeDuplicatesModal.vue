<script setup lang="ts">
import { reactive, ref } from "vue";
import Modal from "../ui/Modal.vue";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { useConfirmStore } from "../../stores/confirm";
import { LEAD_STATUSES } from "../../lib/types";

type DupRecord = { id: number; [key: string]: unknown };

const props = defineProps<{ kind: "contacts" | "companies"; items: DupRecord[] }>();
const emit = defineEmits<{ close: []; merged: [] }>();

const toast = useToastStore();
const confirm = useConfirmStore();

const CONFIG = {
  contacts: {
    label: "contacto",
    fields: [
      { key: "name", label: "Nombre" },
      { key: "email", label: "Correo" },
      { key: "phone", label: "Teléfono" },
      { key: "lead_status", label: "Estado del lead", options: LEAD_STATUSES as readonly string[] },
    ],
    relations: [
      { table: "contacts_companies", col: "contact_id" },
      { table: "contacts_historial", col: "contact_id" },
      { table: "tags_contacts", col: "contact_id" },
      { table: "deals", col: "contact_id" },
      { table: "tickets_contacts", col: "contact_id" },
    ],
  },
  companies: {
    label: "empresa",
    fields: [
      { key: "name", label: "Nombre" },
      { key: "phone", label: "Teléfono" },
      { key: "category", label: "Categoría" },
      { key: "client", label: "Relación", options: ["true", "false"], optionLabels: { true: "Cliente", false: "No cliente" } as Record<string, string> },
    ],
    relations: [
      { table: "contacts_companies", col: "company_id" },
      { table: "tickets", col: "company_id" },
    ],
  },
} as const;

const config = CONFIG[props.kind];
const sortedIds = [...props.items].map((i) => i.id).sort((a, b) => a - b);
const keepId = sortedIds[0];
const deleteIds = sortedIds.slice(1);
const keepItem = props.items.find((i) => i.id === keepId)!;

// El valor final por campo, editable — arranca con los datos del registro más antiguo.
const values = reactive<Record<string, string>>({});
for (const f of config.fields) {
  const raw = keepItem[f.key];
  values[f.key] = raw == null ? "" : String(raw);
}

function candidateLabel(field: (typeof config.fields)[number], raw: unknown): string {
  if (raw == null || raw === "") return "—";
  if ("optionLabels" in field) return field.optionLabels[String(raw)] ?? String(raw);
  return String(raw);
}

const merging = ref(false);
async function merge() {
  const ok = await confirm.ask(
    `Se guardarán estos datos en un único ${config.label} y se eliminará${deleteIds.length > 1 ? "n" : ""} ${deleteIds.length} duplicado${deleteIds.length > 1 ? "s" : ""}. Esto no se puede deshacer.`,
  );
  if (!ok) return;
  merging.value = true;
  try {
    const patch: Record<string, unknown> = {};
    for (const f of config.fields) {
      const v = values[f.key];
      patch[f.key] = props.kind === "companies" && f.key === "client" ? v === "true" : v === "" ? null : v;
    }
    const { error: updateError } = await supabase.from(props.kind).update(patch).eq("id", keepId);
    if (updateError) throw updateError;

    for (const rel of config.relations) {
      for (const delId of deleteIds) {
        const { error: relError } = await supabase.from(rel.table).update({ [rel.col]: keepId }).eq(rel.col, delId);
        if (relError) throw relError;
      }
    }

    const { error: deleteError } = await supabase.from(props.kind).delete().in("id", deleteIds);
    if (deleteError) throw deleteError;

    toast.show(`${config.label === "contacto" ? "Contactos" : "Empresas"} fusionados`);
    emit("merged");
  } catch (e) {
    toast.error(e, "fusionar los duplicados");
  } finally {
    merging.value = false;
  }
}
</script>

<template>
  <Modal width="620px" @close="emit('close')">
    <h2>Fusionar {{ items.length }} {{ config.label }}s duplicados</h2>
    <p style="font-size: 12.5px; color: var(--muted); margin-bottom: 16px">
      Elige, para cada campo, qué valor quieres conservar (o escríbelo tú). Se guardará en un único registro y se eliminarán los demás, moviendo antes sus vínculos (empresas, negocios, tickets, etiquetas...) al que se conserva.
    </p>

    <div v-for="f in config.fields" :key="f.key" class="field">
      <label>{{ f.label }}</label>
      <select v-if="'options' in f" v-model="values[f.key]">
        <option v-for="o in f.options" :key="o" :value="o">{{ 'optionLabels' in f ? f.optionLabels[o] : o }}</option>
      </select>
      <input v-else v-model="values[f.key]" type="text" />
      <div class="chips" style="margin-top: 7px">
        <button
          v-for="it in items"
          :key="it.id"
          type="button"
          class="chip-btn"
          :class="{ selected: values[f.key] === String(it[f.key] ?? '') }"
          @click="values[f.key] = String(it[f.key] ?? '')"
        >
          #{{ it.id }}: {{ candidateLabel(f, it[f.key]) }}
        </button>
      </div>
    </div>

    <p style="font-size: 11.5px; color: var(--faint); margin-top: 4px">
      Se conservará el registro #{{ keepId }}. Se eliminarán: {{ deleteIds.map((id) => "#" + id).join(", ") }}.
    </p>

    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-danger" :disabled="merging" @click="merge">{{ merging ? "Fusionando..." : "Fusionar y eliminar duplicados" }}</button>
    </div>
  </Modal>
</template>
