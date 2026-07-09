<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { eur, fdate } from "../lib/format";
import LogoWordmark from "../components/brand/LogoWordmark.vue";
import type { Deal } from "../lib/types";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();

const deal = ref<Deal | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from("deals")
      .select("*, contacts(id, name), deals_hotels(id, hotels(id, name))")
      .eq("id", route.params.id)
      .single();
    if (error) throw error;
    deal.value = data as Deal;
  } catch (e) {
    toast.error(e, "cargar el negocio");
  } finally {
    loading.value = false;
  }
});

function goBack() {
  router.push({ name: "negocios" });
}
function printPage() {
  window.print();
}
</script>

<template>
  <div class="proposal-page">
    <div v-if="loading" class="loading" style="padding: 60px">Cargando propuesta...</div>
    <div v-else-if="!deal" class="empty" style="padding: 60px"><p>No se encontró el negocio.</p></div>
    <template v-else>
      <div class="proposal-toolbar">
        <button class="btn btn-ghost" @click="goBack">← Volver</button>
        <button class="btn btn-primary" @click="printPage">Imprimir / Guardar PDF</button>
      </div>

      <div class="proposal-sheet">
        <div class="proposal-head">
          <LogoWordmark />
          <div class="proposal-date">{{ fdate(new Date().toISOString()) }}</div>
        </div>
        <h1 class="proposal-title">Propuesta comercial</h1>
        <h2 class="proposal-deal">{{ deal.name }}</h2>

        <div class="proposal-grid">
          <div>
            <div class="proposal-label">Contacto</div>
            <div class="proposal-value">{{ deal.contacts?.name || "Sin contacto asignado" }}</div>
          </div>
          <div>
            <div class="proposal-label">Etapa</div>
            <div class="proposal-value">{{ deal.status || "—" }}</div>
          </div>
          <div>
            <div class="proposal-label">Valor</div>
            <div class="proposal-value">{{ eur(deal.value) }}</div>
          </div>
          <div>
            <div class="proposal-label">Tipo de cargo</div>
            <div class="proposal-value">{{ deal.type_of_charge || "—" }}</div>
          </div>
          <div>
            <div class="proposal-label">Inicio del servicio</div>
            <div class="proposal-value">{{ fdate(deal.start_date) }}</div>
          </div>
          <div>
            <div class="proposal-label">Fin del servicio</div>
            <div class="proposal-value">{{ fdate(deal.end_date) }}</div>
          </div>
        </div>

        <div class="proposal-label" style="margin-top: 22px">Hoteles incluidos</div>
        <ul class="proposal-hotels">
          <li v-for="h in deal.deals_hotels" :key="h.id">{{ h.hotels?.name }}</li>
          <li v-if="!deal.deals_hotels?.length" style="color: var(--faint)">Sin hoteles vinculados</li>
        </ul>

        <div class="proposal-foot">Preparado por {{ auth.userEmail }} · divisual</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.proposal-page { min-height: 100vh; background: var(--bg); padding: 28px; }
.proposal-toolbar { display: flex; justify-content: space-between; max-width: 720px; margin: 0 auto 16px; }
.proposal-sheet { max-width: 720px; margin: 0 auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 48px; box-shadow: var(--shadow); }
.proposal-head { display: flex; justify-content: space-between; align-items: center; font-size: 20px; margin-bottom: 32px; }
.proposal-date { font-size: 13px; color: var(--muted); }
.proposal-title { font-family: var(--display); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.proposal-deal { font-family: var(--display); font-size: 26px; font-weight: 700; margin: 6px 0 28px; }
.proposal-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
.proposal-label { font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--faint); margin-bottom: 4px; }
.proposal-value { font-size: 15px; font-weight: 500; }
.proposal-hotels { margin-top: 6px; padding-left: 18px; font-size: 14px; line-height: 1.7; }
.proposal-foot { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 12px; color: var(--faint); }

@media print {
  .proposal-page { padding: 0; background: #fff; }
  .proposal-toolbar { display: none; }
  .proposal-sheet { box-shadow: none; border: none; max-width: none; }
}
</style>
