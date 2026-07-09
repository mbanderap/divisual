<script setup lang="ts">
import { ref, onMounted } from "vue";
import Modal from "../ui/Modal.vue";
import ComboSingle from "../ui/ComboSingle.vue";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/auth";
import { useToastStore } from "../../stores/toast";
import { useCatalogStore } from "../../stores/catalogs";
import { syncBridge } from "../../lib/syncBridge";
import { nn, fdate } from "../../lib/format";
import { LEAD_STATUSES } from "../../lib/types";
import type { Contact, ContactHistorial, Company } from "../../lib/types";

const props = defineProps<{ contact?: Contact | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const auth = useAuthStore();
const toast = useToastStore();
const catalogs = useCatalogStore();

const linked = props.contact?.contacts_companies?.[0] ?? null;

const name = ref(props.contact?.name ?? "");
const email = ref(props.contact?.email ?? "");
const phone = ref(props.contact?.phone ?? "");
const leadStatus = ref(props.contact?.lead_status ?? "Lead");
const role = ref(linked?.role ?? "");
const companyId = ref<number | null>(linked?.companies?.id ?? null);
const selectedTagIds = ref<number[]>((props.contact?.tags_contacts ?? []).map((t) => t.tags?.id).filter((x): x is number => !!x));
const note = ref("");
const saving = ref(false);
const history = ref<ContactHistorial[] | null>(null);
const historyError = ref(false);

onMounted(async () => {
  if (!props.contact) return;
  try {
    const { data, error } = await supabase
      .from("contacts_historial")
      .select("*")
      .eq("contact_id", props.contact.id)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;
    history.value = data as ContactHistorial[];
  } catch {
    historyError.value = true;
  }
});

function toggleTag(id: number) {
  selectedTagIds.value = selectedTagIds.value.includes(id)
    ? selectedTagIds.value.filter((t) => t !== id)
    : [...selectedTagIds.value, id];
}

const newTagName = ref("");
async function createTag() {
  const n = newTagName.value.trim();
  if (!n) return;
  try {
    const { data, error } = await supabase.from("tags").insert({ name: n }).select("id, name");
    if (error) throw error;
    catalogs.tags.push(data[0]);
    selectedTagIds.value.push(data[0].id);
    newTagName.value = "";
  } catch (e) { toast.error(e, "crear la etiqueta"); }
}

async function save() {
  if (!name.value.trim()) { toast.show("El nombre es obligatorio."); return; }
  saving.value = true;
  try {
    const row = {
      name: name.value.trim(),
      email: nn(email.value.trim()),
      phone: nn(phone.value.trim()),
      lead_status: leadStatus.value,
      created_by: auth.session?.user.id,
    };
    let id = props.contact?.id;
    if (props.contact) {
      const { error } = await supabase.from("contacts").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("contacts").insert(row).select("id");
      if (error) throw error;
      id = data[0].id;
    }
    await syncBridge("contacts_companies", "contact_id", id!,
      companyId.value ? [{ contact_id: id, company_id: companyId.value, role: nn(role.value.trim()) }] : []);
    await syncBridge("tags_contacts", "contact_id", id!,
      selectedTagIds.value.map((t) => ({ contact_id: id, tags: t, created_by: auth.session?.user.id })));
    await supabase.from("contacts_historial").insert({
      contact_id: id, created_by: auth.session?.user.id,
      note: note.value.trim() || (props.contact ? "Ficha actualizada" : "Contacto creado"),
    });
    toast.show(props.contact ? "Contacto actualizado" : "Contacto creado");
    emit("saved");
  } catch (e) {
    toast.error(e, "guardar el contacto");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal @close="emit('close')">
    <h2>{{ contact ? "Editar contacto" : "Nuevo contacto" }}</h2>
    <div class="field">
      <label>Nombre completo</label>
      <input v-model="name" type="text" placeholder="Nombre y apellidos" />
    </div>
    <div class="field-row">
      <div class="field"><label>Correo electrónico</label><input v-model="email" type="email" placeholder="nombre@empresa.com" /></div>
      <div class="field"><label>Teléfono</label><input v-model="phone" type="text" placeholder="+34 600 000 000" /></div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Estado del lead</label>
        <select v-model="leadStatus"><option v-for="s in LEAD_STATUSES" :key="s" :value="s">{{ s }}</option></select>
      </div>
      <ComboSingle
        v-model="companyId"
        label="Empresa"
        table="companies"
        search-col="name"
        select-cols="id, name"
        :label-fn="(r: Company) => r.name"
        :initial-label="linked?.companies?.name"
      />
    </div>
    <div class="field"><label>Cargo en la empresa</label><input v-model="role" type="text" placeholder="Puesto que ocupa" /></div>
    <div class="field">
      <label>Etiquetas</label>
      <div class="chips">
        <button v-for="t in catalogs.tags" :key="t.id" type="button" class="chip-btn" :class="{ selected: selectedTagIds.includes(t.id) }" @click="toggleTag(t.id)">
          {{ t.name }}
        </button>
        <p v-if="!catalogs.tags.length" style="font-size: 12.5px; color: var(--faint)">Sin etiquetas todavía.</p>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px">
        <input v-model="newTagName" type="text" placeholder="Nueva etiqueta..." style="flex: 1" @keyup.enter="createTag" />
        <button class="btn btn-ghost" type="button" @click="createTag">Crear</button>
      </div>
    </div>

    <template v-if="contact">
      <h4>Historial</h4>
      <div v-if="history === null && !historyError" class="loading" style="padding: 14px">Cargando historial...</div>
      <p v-else-if="historyError" style="font-size: 12.5px; color: var(--faint)">No se pudo cargar el historial.</p>
      <template v-else>
        <p v-if="!history!.length" style="font-size: 12.5px; color: var(--faint)">Sin registros todavía.</p>
        <div v-for="h in history" :key="h.id" class="hist-item">
          <span class="h-date">{{ fdate(h.created_at) }}</span>
          <span class="h-note">{{ h.note || "Actualización de la ficha" }}</span>
        </div>
      </template>
      <div class="field" style="margin-top: 12px">
        <label>Añadir nota al historial</label>
        <textarea v-model="note" placeholder="Llamada, reunión, acuerdo..."></textarea>
      </div>
    </template>

    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
