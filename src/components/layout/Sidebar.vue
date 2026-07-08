<script setup lang="ts">
import { onMounted } from "vue";
import { useCatalogStore } from "../../stores/catalogs";
import { useAuthStore } from "../../stores/auth";
import LogoWordmark from "../brand/LogoWordmark.vue";
import LogoMark from "../brand/LogoMark.vue";

const catalogs = useCatalogStore();
const auth = useAuthStore();
onMounted(() => { if (!catalogs.counts.contacts) catalogs.loadCounts(); });
</script>

<template>
  <aside class="sidebar">
    <div class="brand brand-full"><LogoWordmark /></div>
    <div class="brand brand-compact"><LogoMark :size="26" /></div>

    <div class="nav-label">General</div>
    <router-link class="nav-item" to="/">
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
      <span>Panel</span>
    </router-link>

    <div class="nav-label">CRM</div>
    <router-link class="nav-item" to="/contactos">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>
      <span>Contactos</span><span class="count">{{ catalogs.counts.contacts.toLocaleString("es-ES") }}</span>
    </router-link>
    <router-link class="nav-item" to="/empresas">
      <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11"/><path d="M8 8h3M8 12h3M8 16h3"/></svg>
      <span>Empresas</span><span class="count">{{ catalogs.counts.companies.toLocaleString("es-ES") }}</span>
    </router-link>
    <router-link class="nav-item" to="/negocios">
      <svg viewBox="0 0 24 24"><path d="M4 4v16M12 4v10M20 4v13"/><circle cx="4" cy="20" r="0.5"/><circle cx="12" cy="14" r="0.5"/><circle cx="20" cy="17" r="0.5"/></svg>
      <span>Negocios</span><span class="count">{{ catalogs.openDealsCount }}</span>
    </router-link>

    <div class="nav-label">Operación</div>
    <router-link class="nav-item" to="/hoteles">
      <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14"/><path d="M9 9h1.5M13.5 9H15M9 13h1.5M13.5 13H15M10 21v-3h4v3"/></svg>
      <span>Hoteles</span><span class="count">{{ catalogs.counts.hotels.toLocaleString("es-ES") }}</span>
    </router-link>
    <router-link class="nav-item" to="/personal">
      <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17.5 14.5c2.5.4 4 2 4 4.5"/></svg>
      <span>Personal</span><span class="count">{{ catalogs.personnel.length }}</span>
    </router-link>

    <div class="nav-label">Customer Success</div>
    <router-link class="nav-item" to="/tickets">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.5 5.5l3 3M18.5 5.5l-3 3M5.5 18.5l3-3M18.5 18.5l-3-3"/></svg>
      <span>Tickets</span><span class="count">{{ catalogs.openTicketsCount }}</span>
    </router-link>

    <div class="nav-label">Soporte / IT</div>
    <router-link class="nav-item" to="/tablero">
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="16" rx="1.2"/><rect x="9.5" y="4" width="5" height="10" rx="1.2"/><rect x="16" y="4" width="5" height="13" rx="1.2"/></svg>
      <span>Tablero</span><span class="count">{{ catalogs.openTasksCount }}</span>
    </router-link>

    <div class="nav-label">Sistema</div>
    <router-link class="nav-item" to="/ajustes">
      <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="2.5"/><path d="M4 5v14c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5"/><path d="M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/></svg>
      <span>Ajustes</span>
    </router-link>

    <div class="sidebar-foot">
      <div><span class="conn-dot on"></span>Supabase conectado</div>
      <div style="margin-top: 4px">{{ auth.userEmail }}</div>
    </div>
  </aside>
</template>
