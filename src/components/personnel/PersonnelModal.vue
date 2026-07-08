<script setup lang="ts">
import { ref } from "vue";
import Modal from "../ui/Modal.vue";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { nn } from "../../lib/format";
import type { Personnel } from "../../lib/types";

const props = defineProps<{ person?: Personnel | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const toast = useToastStore();

const name = ref(props.person?.name ?? "");
const email = ref(props.person?.email ?? "");
const phone = ref(props.person?.phone ?? "");
const saving = ref(false);

async function save() {
  if (!name.value.trim()) { toast.show("El nombre es obligatorio."); return; }
  saving.value = true;
  try {
    const row = { name: name.value.trim(), email: nn(email.value.trim()), phone: nn(phone.value.trim()) };
    const { error } = props.person
      ? await supabase.from("personnel").update(row).eq("id", props.person.id)
      : await supabase.from("personnel").insert(row);
    if (error) throw error;
    toast.show(props.person ? "Persona actualizada" : "Persona creada");
    emit("saved");
  } catch (e) { toast.error(e, "guardar la persona"); }
  finally { saving.value = false; }
}
</script>

<template>
  <Modal @close="emit('close')">
    <h2>{{ person ? "Editar persona" : "Nueva persona" }}</h2>
    <div class="field"><label>Nombre completo</label><input v-model="name" type="text" placeholder="Nombre y apellidos" /></div>
    <div class="field-row">
      <div class="field"><label>Correo electrónico</label><input v-model="email" type="email" placeholder="nombre@hotel.com" /></div>
      <div class="field"><label>Teléfono</label><input v-model="phone" type="text" placeholder="+34 600 000 000" /></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
