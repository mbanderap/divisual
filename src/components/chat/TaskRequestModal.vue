<script setup lang="ts">
import { ref } from "vue";
import Modal from "../ui/Modal.vue";
import { TASK_TYPES } from "../../lib/types";

const emit = defineEmits<{ close: []; send: [{ title: string; description: string; type: string }] }>();

const title = ref("");
const description = ref("");
const type = ref("Tarea");

function send() {
  if (!title.value.trim()) return;
  emit("send", { title: title.value.trim(), description: description.value.trim(), type: type.value });
}
</script>

<template>
  <Modal width="480px" @close="emit('close')">
    <h2>Solicitar tarea</h2>
    <div class="field"><label>Título</label><input v-model="title" type="text" placeholder="Qué necesitas" /></div>
    <div class="field">
      <label>Tipo</label>
      <div class="chips">
        <button v-for="t in TASK_TYPES" :key="t" type="button" class="chip-btn" :class="{ selected: type === t }" @click="type = t">{{ t }}</button>
      </div>
    </div>
    <div class="field"><label>Descripción</label><textarea v-model="description" placeholder="Detalle de lo que necesitas"></textarea></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" @click="send">Enviar solicitud</button>
    </div>
  </Modal>
</template>
