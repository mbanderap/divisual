<script setup lang="ts">
import { computed } from "vue";
import { useThemeStore } from "../../stores/theme";
import { useAuthStore } from "../../stores/auth";
import { useSearchStore } from "../../stores/search";
import { useCatalogStore } from "../../stores/catalogs";
import { debounce, initials } from "../../lib/format";

const theme = useThemeStore();
const auth = useAuthStore();
const search = useSearchStore();
const catalogs = useCatalogStore();

const debouncedInput = debounce((v: string) => search.onInput(v), 320);
function onSearchInput(e: Event) {
  debouncedInput((e.target as HTMLInputElement).value);
}
const avatarInitials = computed(() => initials(auth.userEmail));

async function refresh() {
  await catalogs.refreshCatalogsAndCounts();
}
</script>

<template>
  <div class="topbar">
    <div class="search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>
      <input type="text" :value="search.query" :placeholder="search.placeholder" @input="onSearchInput" />
    </div>
    <div class="topbar-right">
      <button class="icon-btn" title="Recargar catálogos y recuentos" @click="refresh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/></svg>
      </button>
      <button class="icon-btn" title="Cambiar tema" @click="theme.toggle()">
        <svg v-if="theme.mode === 'light'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>
      </button>
      <button class="icon-btn" title="Cerrar sesión" @click="auth.signOut()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      </button>
      <div class="avatar" :title="auth.userEmail">{{ avatarInitials }}</div>
    </div>
  </div>
</template>
