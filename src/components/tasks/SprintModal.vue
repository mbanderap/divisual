<script setup lang="ts">
import { ref } from "vue";
import Modal from "../ui/Modal.vue";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { nn } from "../../lib/format";

const emit = defineEmits<{ close: []; saved: [] }>();
const toast = useToastStore();

const name = ref("");
const startDate = ref("");
const endDate = ref("");
const saving = ref(false);

async function save() {
  if (!name.value.trim()) { toast.show("El nombre es obligatorio."); return; }
  saving.value = true;
  try {
    const { error } = await supabase.from("sprints").insert({
      name: name.value.trim(), start_date: nn(startDate.value), end_date: nn(endDate.value), active: true,
    });
    if (error) throw error;
    toast.show("Sprint creado");
    emit("saved");
  } catch (e) { toast.error(e, "crear el sprint"); }
  finally { saving.value = false; }
}
</script>

<template>
  <Modal width="420px" @close="emit('close')">
    <h2>Nuevo sprint</h2>
    <div class="field"><label>Nombre</label><input v-model="name" type="text" placeholder="Sprint 12" /></div>
    <div class="field-row">
      <div class="field"><label>Fecha inicio</label><input v-model="startDate" type="date" /></div>
      <div class="field"><label>Fecha fin</label><input v-model="endDate" type="date" /></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
