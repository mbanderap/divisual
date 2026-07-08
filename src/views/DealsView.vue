<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useSearchStore } from "../stores/search";
import { useToastStore } from "../stores/toast";
import { supabase } from "../lib/supabase";
import { eur, fdate } from "../lib/format";
import { DEAL_STAGES } from "../lib/types";
import DealModal from "../components/deals/DealModal.vue";
import type { Deal } from "../lib/types";

const catalogs = useCatalogStore();
const search = useSearchStore();
const toast = useToastStore();

const localSearch = ref("");
onMounted(() => search.register((v) => (localSearch.value = v.toLowerCase()), "", "Buscar negocios por nombre, contacto u hotel"));
onUnmounted(() => search.unregister());

const visible = computed(() =>
  catalogs.deals.filter((d) => {
    if (!localSearch.value) return true;
    const haystack = [d.name, d.contacts?.name, ...(d.deals_hotels || []).map((dh) => dh.hotels?.name)].join(" ").toLowerCase();
    return haystack.includes(localSearch.value);
  }),
);
const maxAmount = computed(() => Math.max(...catalogs.deals.map((d) => d.value || 0), 1));

const showModal = ref(false);
const editing = ref<Deal | null>(null);
function openNew() { editing.value = null; showModal.value = true; }
function openEdit(d: Deal) { editing.value = d; showModal.value = true; }
function onSaved() { showModal.value = false; catalogs.loadCatalogs(); }

const draggingId = ref<number | null>(null);
const dragOverStage = ref<string | null>(null);

function onDrop(stage: string) {
  dragOverStage.value = null;
  const deal = catalogs.deals.find((d) => d.id === draggingId.value);
  if (!deal || deal.status === stage) return;
  moveDeal(deal, stage);
}
async function moveDeal(deal: Deal, stage: string) {
  try {
    const { error } = await supabase.from("deals").update({ status: stage }).eq("id", deal.id);
    if (error) throw error;
    deal.status = stage;
    toast.show(stage === "Ganado" ? "Negocio ganado: " + deal.name : "Movido a " + stage);
  } catch (e) { toast.error(e, "mover el negocio"); }
}
</script>

<template>
  <div class="view-head">
    <div><h1>Negocios</h1><div class="view-sub">Arrastra las tarjetas entre etapas para actualizar el estado</div></div>
    <button class="btn btn-primary" @click="openNew">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      Nuevo negocio
    </button>
  </div>

  <div class="kanban">
    <div
      v-for="s in DEAL_STAGES"
      :key="s"
      class="kcol"
      :class="{ 'drag-over': dragOverStage === s }"
      @dragover.prevent="dragOverStage = s"
      @dragleave="dragOverStage = null"
      @drop.prevent="onDrop(s)"
    >
      <div class="kcol-head">
        <span class="kc-name">{{ s }}</span>
        <span class="kc-sum">{{ eur(visible.filter((d) => d.status === s).reduce((a, d) => a + (d.value || 0), 0)) }}</span>
      </div>
      <div
        v-for="d in visible.filter((x) => x.status === s)"
        :key="d.id"
        class="deal"
        :class="{ dragging: draggingId === d.id }"
        draggable="true"
        @dragstart="draggingId = d.id"
        @dragend="draggingId = null"
        @click="openEdit(d)"
      >
        <div class="d-title">{{ d.name }}</div>
        <div class="d-company">
          {{ d.contacts?.name || "Sin contacto" }}{{ (d.deals_hotels || []).length ? " · " + d.deals_hotels!.length + " hotel" + (d.deals_hotels!.length > 1 ? "es" : "") : "" }}
        </div>
        <div class="value-bar"><i :style="{ width: Math.max(6, Math.round(((d.value || 0) / maxAmount) * 100)) + '%' }"></i></div>
        <div class="d-foot"><span class="d-amount">{{ eur(d.value) }}</span><span class="d-date">{{ fdate(d.closing_date) }}</span></div>
      </div>
    </div>
  </div>

  <DealModal v-if="showModal" :deal="editing" @close="showModal = false" @saved="onSaved" />
</template>
