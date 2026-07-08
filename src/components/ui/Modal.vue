<script setup lang="ts">
withDefaults(defineProps<{ width?: string }>(), { width: "540px" });
const emit = defineEmits<{ close: [] }>();

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click="onOverlayClick" @keydown.esc="emit('close')">
      <div class="modal" :style="{ width: `min(${width}, calc(100vw - 32px))` }">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
