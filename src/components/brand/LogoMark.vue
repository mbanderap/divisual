<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 30 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" role="img" aria-label="divisual">
    <rect width="64" height="64" rx="16" fill="var(--accent)" />
    <text x="19" y="45" font-family="'Schibsted Grotesk', Arial, sans-serif" font-weight="800" font-size="34" fill="var(--accent-ink)">d</text>
    <circle cx="46" cy="40" r="4.2" fill="var(--accent-ink)" opacity="0.55" />
  </svg>
</template>
