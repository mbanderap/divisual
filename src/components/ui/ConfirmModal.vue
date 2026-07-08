<script setup lang="ts">
import Modal from "./Modal.vue";

defineProps<{ message: string }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <Modal width="420px" @close="emit('cancel')">
    <h2>Confirmar</h2>
    <p style="color: var(--muted); font-size: 13.5px; line-height: 1.55">{{ message }}</p>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('cancel')">Cancelar</button>
      <button class="btn btn-danger" @click="emit('confirm')">Eliminar</button>
    </div>
  </Modal>
</template>
