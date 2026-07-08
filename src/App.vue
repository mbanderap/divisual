<script setup lang="ts">
import { onMounted } from "vue";
import { useThemeStore } from "./stores/theme";
import ToastHost from "./components/ui/ToastHost.vue";
import ConfirmHost from "./components/ui/ConfirmHost.vue";

const theme = useThemeStore();
onMounted(() => theme.apply());
</script>

<template>
  <router-view />
  <ToastHost />
  <ConfirmHost />
</template>
