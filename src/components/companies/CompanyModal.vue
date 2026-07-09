<script setup lang="ts">
import { ref } from "vue";
import Modal from "../ui/Modal.vue";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { nn } from "../../lib/format";
import type { Company } from "../../lib/types";

const props = defineProps<{ company?: Company | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const toast = useToastStore();

const name = ref(props.company?.name ?? "");
const phone = ref(props.company?.phone ?? "");
const category = ref(props.company?.category ?? "");
const client = ref(String(props.company?.client ?? false));
const saving = ref(false);

async function save() {
  if (!name.value.trim()) { toast.show("El nombre es obligatorio."); return; }
  saving.value = true;
  try {
    const row = { name: name.value.trim(), phone: nn(phone.value.trim()), category: nn(category.value.trim()), client: client.value === "true" };
    const { error } = props.company
      ? await supabase.from("companies").update(row).eq("id", props.company.id)
      : await supabase.from("companies").insert(row);
    if (error) throw error;
    toast.show(props.company ? "Empresa actualizada" : "Empresa creada");
    emit("saved");
  } catch (e) { toast.error(e, "guardar la empresa"); }
  finally { saving.value = false; }
}
</script>

<template>
  <Modal @close="emit('close')">
    <h2>{{ company ? "Editar empresa" : "Nueva empresa" }}</h2>
    <div class="field"><label>Nombre</label><input v-model="name" type="text" placeholder="Nombre de la empresa" /></div>
    <div class="field-row">
      <div class="field"><label>Teléfono</label><input v-model="phone" type="text" placeholder="+34 900 000 000" /></div>
      <div class="field"><label>Categoría</label><input v-model="category" type="text" placeholder="Cadena hotelera, agencia, proveedor..." /></div>
    </div>
    <div class="field">
      <label>Relación</label>
      <select v-model="client"><option value="true">Cliente</option><option value="false">No cliente</option></select>
    </div>

    <template v-if="company">
      <h4>Contactos vinculados</h4>
      <p v-if="!company.contacts_companies?.length" style="font-size: 12.5px; color: var(--faint)">
        Ningún contacto tiene esta empresa asignada todavía. Se vincula desde la ficha del contacto.
      </p>
      <div v-for="cc in company.contacts_companies" :key="cc.id" class="assign-row">
        <div class="a-main">
          <router-link :to="{ name: 'contactos', query: { open: cc.contacts!.id } }" style="font-weight: 600; color: var(--accent)">{{ cc.contacts?.name }}</router-link>
          <div class="a-sub">{{ cc.role || "Sin cargo definido" }}</div>
        </div>
      </div>
    </template>

    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
