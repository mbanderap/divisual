<script setup lang="ts">
import { initials } from "../../lib/format";
defineProps<{ name: string | null | undefined }>();
</script>

<template>
  <span class="avatar">{{ initials(name) }}</span>
</template>
