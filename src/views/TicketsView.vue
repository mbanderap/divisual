<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useSearchStore } from "../stores/search";
import { useToastStore } from "../stores/toast";
import { supabase } from "../lib/supabase";
import { fdate } from "../lib/format";
import { useDeepLinkOpen } from "../composables/useDeepLinkOpen";
import { TICKET_STAGES } from "../lib/types";
import TicketModal from "../components/tickets/TicketModal.vue";
import type { Ticket } from "../lib/types";

const catalogs = useCatalogStore();
const search = useSearchStore();
const toast = useToastStore();

const localSearch = ref("");
onMounted(() => search.register((v) => (localSearch.value = v.toLowerCase()), "", "Buscar tickets por título, empresa o propietario"));
onUnmounted(() => search.unregister());

const visible = computed(() =>
  catalogs.tickets.filter((t) => {
    if (!localSearch.value) return true;
    const haystack = [t.title, t.companies?.name, t.personnel?.name].join(" ").toLowerCase();
    return haystack.includes(localSearch.value);
  }),
);

const showModal = ref(false);
const editing = ref<Ticket | null>(null);
function openNew() { editing.value = null; showModal.value = true; }
function openEdit(t: Ticket) { editing.value = t; showModal.value = true; }
function onSaved() { showModal.value = false; catalogs.loadCatalogs(); }
useDeepLinkOpen(() => catalogs.tickets, openEdit);

const draggingId = ref<number | null>(null);
const dragOverStage = ref<string | null>(null);

function onDrop(stage: string) {
  dragOverStage.value = null;
  const ticket = catalogs.tickets.find((t) => t.id === draggingId.value);
  if (!ticket || ticket.status === stage) return;
  moveTicket(ticket, stage);
}
async function moveTicket(ticket: Ticket, stage: string) {
  try {
    const { data, error } = await supabase.from("tickets").update({ status: stage }).eq("id", ticket.id).select("status").single();
    if (error) throw error;
    ticket.status = data.status;
    if (stage === "Décima alcanzada" && data.status !== stage) {
      toast.show(`¡Décima alcanzada! Se registra la subida y "${ticket.title}" vuelve a Seguimiento activo.`);
    } else {
      toast.show(stage === "Cierre de ciclo" ? "Ciclo cerrado: " + ticket.title : "Movido a " + stage);
    }
  } catch (e) { toast.error(e, "mover el ticket"); }
}
</script>

<template>
  <div class="view-head">
    <div><h1>Tickets</h1><div class="view-sub">Arrastra las tarjetas entre etapas para actualizar el estado</div></div>
    <button class="btn btn-primary" @click="openNew">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      Nuevo ticket
    </button>
  </div>

  <div class="kanban">
    <div
      v-for="s in TICKET_STAGES"
      :key="s"
      class="kcol"
      :class="{ 'drag-over': dragOverStage === s }"
      @dragover.prevent="dragOverStage = s"
      @dragleave="dragOverStage = null"
      @drop.prevent="onDrop(s)"
    >
      <div class="kcol-head">
        <span class="kc-name">{{ s }}</span>
        <span class="kc-sum">{{ visible.filter((t) => t.status === s).length }}</span>
      </div>
      <div
        v-for="t in visible.filter((x) => x.status === s)"
        :key="t.id"
        class="ticket"
        :class="{ dragging: draggingId === t.id }"
        draggable="true"
        @dragstart="draggingId = t.id"
        @dragend="draggingId = null"
        @click="openEdit(t)"
      >
        <div class="t-title">{{ t.title }}</div>
        <div class="t-company">
          {{ t.companies?.name || "Sin empresa" }}{{ (t.tickets_contacts || []).length ? " · " + t.tickets_contacts!.length + " contacto" + (t.tickets_contacts!.length > 1 ? "s" : "") : "" }}
        </div>
        <div class="t-foot"><span class="t-owner">{{ t.personnel?.name || "Sin propietario" }}</span><span class="t-date">{{ fdate(t.created_at) }}</span></div>
      </div>
    </div>
  </div>

  <TicketModal v-if="showModal" :ticket="editing" @close="showModal = false" @saved="onSaved" />
</template>
