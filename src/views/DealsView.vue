<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useSearchStore } from "../stores/search";
import { useToastStore } from "../stores/toast";
import { supabase } from "../lib/supabase";
import { eur, fdate, daysSince } from "../lib/format";
import { useDeepLinkOpen } from "../composables/useDeepLinkOpen";
import { ICONS } from "../lib/icons";
import { DEAL_STAGES, OPEN_STAGES } from "../lib/types";
import DealModal from "../components/deals/DealModal.vue";
import ArchivedDealsModal from "../components/deals/ArchivedDealsModal.vue";
import DealPreviewDrawer from "../components/deals/DealPreviewDrawer.vue";
import Modal from "../components/ui/Modal.vue";
import type { Deal } from "../lib/types";

const NOTE_COLORS = ["#6366f1", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

const STAGNANT_DAYS = 14;
const CLOSING_SOON_DAYS = 15;
const KANBAN_STAGES = DEAL_STAGES.filter((s) => s !== "Perdido");

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

function stagnantDays(d: Deal): number | null {
  if (!d.status || !OPEN_STAGES.includes(d.status as never)) return null;
  const days = daysSince(d.status_changed_at);
  return days != null && days > STAGNANT_DAYS ? days : null;
}
function closingSoonDays(d: Deal): number | null {
  if (!d.status || !OPEN_STAGES.includes(d.status as never) || !d.closing_date) return null;
  const days = Math.ceil((new Date(d.closing_date).getTime() - Date.now()) / 86400000);
  return days >= 0 && days <= CLOSING_SOON_DAYS ? days : null;
}

const showModal = ref(false);
const editing = ref<Deal | null>(null);
const showArchived = ref(false);
function openNew() { editing.value = null; showModal.value = true; }
function openEdit(d: Deal) { editing.value = d; showModal.value = true; }
function openFromArchived(d: Deal) { showArchived.value = false; openEdit(d); }
function onSaved() { showModal.value = false; catalogs.loadCatalogs(); }
useDeepLinkOpen(() => catalogs.deals, openEdit);

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

const previewing = ref<Deal | null>(null);
const noteEditing = ref<Deal | null>(null);
const noteText = ref("");
const noteColor = ref(NOTE_COLORS[0]);
const savingNote = ref(false);

function openPreview(d: Deal) { previewing.value = d; }
function openNote(d: Deal) {
  noteEditing.value = d;
  noteText.value = d.quick_note ?? "";
  noteColor.value = d.quick_note_color ?? NOTE_COLORS[0];
}
async function saveNote() {
  if (!noteEditing.value) return;
  savingNote.value = true;
  try {
    const { error } = await supabase.from("deals").update({ quick_note: noteText.value.trim() || null, quick_note_color: noteColor.value }).eq("id", noteEditing.value.id);
    if (error) throw error;
    noteEditing.value.quick_note = noteText.value.trim() || null;
    noteEditing.value.quick_note_color = noteColor.value;
    toast.show("Nota guardada");
    noteEditing.value = null;
  } catch (e) { toast.error(e, "guardar la nota"); }
  finally { savingNote.value = false; }
}
</script>

<template>
  <div class="view-head">
    <div><h1>Negocios</h1><div class="view-sub">Arrastra las tarjetas entre etapas para actualizar el estado</div></div>
    <div style="display: flex; gap: 9px">
      <button class="btn btn-ghost" @click="showArchived = true">Archivados</button>
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nuevo negocio
      </button>
    </div>
  </div>

  <div class="kanban">
    <div
      v-for="s in KANBAN_STAGES"
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
        :class="{ dragging: draggingId === d.id, stagnant: stagnantDays(d) != null }"
        draggable="true"
        @dragstart="draggingId = d.id"
        @dragend="draggingId = null"
        @click="openEdit(d)"
      >
        <div class="d-top">
          <div class="d-title">{{ d.name }}</div>
          <div class="row-actions">
            <button class="mini-btn" title="Vista previa" @click.stop="openPreview(d)" v-html="ICONS.eye"></button>
            <button class="mini-btn" title="Nota rápida" :style="d.quick_note_color ? { color: d.quick_note_color } : {}" @click.stop="openNote(d)" v-html="ICONS.note"></button>
          </div>
        </div>
        <div class="d-company">
          {{ d.contacts?.name || "Sin contacto" }}{{ (d.deals_hotels || []).length ? " · " + d.deals_hotels!.length + " hotel" + (d.deals_hotels!.length > 1 ? "es" : "") : "" }}
        </div>
        <div v-if="d.quick_note" class="d-note" :style="{ borderColor: d.quick_note_color || 'var(--line)' }">{{ d.quick_note }}</div>
        <div class="value-bar"><i :style="{ width: Math.max(6, Math.round(((d.value || 0) / maxAmount) * 100)) + '%' }"></i></div>
        <div class="d-foot"><span class="d-amount">{{ eur(d.value) }}</span><span class="d-date">{{ fdate(d.closing_date) }}</span></div>
        <div v-if="closingSoonDays(d) != null" class="d-soon"><span class="icon-inline" v-html="ICONS.calendar"></span>cierra en {{ closingSoonDays(d) }} día{{ closingSoonDays(d) === 1 ? "" : "s" }}</div>
        <div v-else-if="stagnantDays(d) != null" class="d-stagnant"><span class="icon-inline" v-html="ICONS.clock"></span>{{ stagnantDays(d) }} días sin moverse</div>
      </div>
    </div>
  </div>

  <DealModal v-if="showModal" :deal="editing" @close="showModal = false" @saved="onSaved" />
  <ArchivedDealsModal v-if="showArchived" @close="showArchived = false" @edit="openFromArchived" />
  <DealPreviewDrawer v-if="previewing" :deal="previewing" @close="previewing = null" />
  <Modal v-if="noteEditing" width="380px" @close="noteEditing = null">
    <h2>Nota rápida</h2>
    <div class="field"><label>Resumen</label><textarea v-model="noteText" placeholder="Qué hay que recordar de este negocio..."></textarea></div>
    <div class="field">
      <label>Color</label>
      <div style="display: flex; gap: 8px">
        <button
          v-for="c in NOTE_COLORS"
          :key="c"
          type="button"
          class="color-swatch"
          :class="{ selected: noteColor === c }"
          :style="{ background: c }"
          @click="noteColor = c"
        ></button>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" @click="noteEditing = null">Cancelar</button>
      <button class="btn btn-primary" :disabled="savingNote" @click="saveNote">{{ savingNote ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
