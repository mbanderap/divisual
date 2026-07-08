<script setup lang="ts">
import ConfirmModal from "./ConfirmModal.vue";
import { useConfirmStore } from "../../stores/confirm";
const confirm = useConfirmStore();
</script>

<template>
  <ConfirmModal
    v-if="confirm.open"
    :message="confirm.message"
    @confirm="confirm.resolve(true)"
    @cancel="confirm.resolve(false)"
  />
</template>
