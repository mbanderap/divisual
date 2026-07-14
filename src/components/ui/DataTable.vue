<script setup lang="ts" generic="T extends { id: number }">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ColumnDef } from "../../lib/types";
import { ICONS } from "../../lib/icons";

const props = defineProps<{
  columns: ColumnDef<T>[];
  rows: T[];
  activeSortKey: string | null;
  activeSortDir: "asc" | "desc";
  selectable?: boolean;
  selected?: number[];
}>();
const emit = defineEmits<{ sort: [ColumnDef<T>]; "row-click": [T]; edit: [T]; delete: [T]; "update:selected": [number[]] }>();

const allOnPageSelected = computed(() => props.rows.length > 0 && props.rows.every((r) => props.selected?.includes(r.id)));
function toggleAll() {
  const ids = props.rows.map((r) => r.id);
  emit("update:selected", allOnPageSelected.value ? (props.selected ?? []).filter((id) => !ids.includes(id)) : [...new Set([...(props.selected ?? []), ...ids])]);
}
function toggleRow(id: number) {
  const cur = props.selected ?? [];
  emit("update:selected", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
}

const visibleColumns = computed(() => props.columns.filter((c) => c.visible));

function arrow(c: ColumnDef<T>) {
  const key = c.dbCol ?? c.key;
  if (key !== props.activeSortKey) return "";
  return props.activeSortDir === "asc" ? "▲" : "▼";
}
function cellValue(row: T, c: ColumnDef<T>): string {
  const v = (row as Record<string, unknown>)[c.key];
  return v == null || v === "" ? "—" : String(v);
}

// Barra de scroll horizontal duplicada arriba de la tabla: la nativa vive
// al final de una tabla que puede tener decenas de filas, así que hay que
// bajar hasta el fondo de la página para poder arrastrarla. Esta se ve
// siempre, justo encima de la tabla, y va sincronizada con el scroll real.
const topScrollEl = ref<HTMLElement | null>(null);
const bodyEl = ref<HTMLElement | null>(null);
const tableEl = ref<HTMLTableElement | null>(null);
const scrollWidth = ref(0);
const showTopScroll = ref(false);
let resizeObserver: ResizeObserver | null = null;
let syncing = false;

function measure() {
  if (!tableEl.value || !bodyEl.value) return;
  scrollWidth.value = tableEl.value.scrollWidth;
  showTopScroll.value = tableEl.value.scrollWidth > bodyEl.value.clientWidth;
}
function onTopScroll() {
  if (syncing || !bodyEl.value || !topScrollEl.value) return;
  syncing = true;
  bodyEl.value.scrollLeft = topScrollEl.value.scrollLeft;
  syncing = false;
}
function onBodyScroll() {
  if (syncing || !bodyEl.value || !topScrollEl.value) return;
  syncing = true;
  topScrollEl.value.scrollLeft = bodyEl.value.scrollLeft;
  syncing = false;
}

onMounted(() => {
  measure();
  if (tableEl.value) {
    resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(tableEl.value);
  }
  window.addEventListener("resize", measure);
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("resize", measure);
});
watch(() => [props.columns, props.rows], () => nextTick(measure), { deep: true });
</script>

<template>
  <div class="card table-card">
    <div v-show="showTopScroll" class="table-scroll-top" ref="topScrollEl" @scroll="onTopScroll">
      <div :style="{ width: scrollWidth + 'px' }"></div>
    </div>
    <div class="table-wrap" ref="bodyEl" @scroll="onBodyScroll">
      <table ref="tableEl">
        <thead>
          <tr>
            <th v-if="selectable" style="width: 36px"><input type="checkbox" :checked="allOnPageSelected" @click.stop="toggleAll" /></th>
            <th v-for="c in visibleColumns" :key="c.key" class="sortable" @click="emit('sort', c)">
              {{ c.label }}<span v-if="arrow(c)" class="s-arrow">{{ arrow(c) }}</span>
            </th>
            <th style="width: 80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" @click="emit('row-click', row)">
            <td v-if="selectable" @click.stop><input type="checkbox" :checked="selected?.includes(row.id)" @change="toggleRow(row.id)" /></td>
            <td v-for="c in visibleColumns" :key="c.key" :class="{ num: c.numeric }">
              <slot :name="`cell-${c.key}`" :row="row">{{ cellValue(row, c) }}</slot>
            </td>
            <td>
              <div class="row-actions">
                <button class="mini-btn" title="Editar" @click.stop="emit('edit', row)" v-html="ICONS.edit"></button>
                <button class="mini-btn del" title="Eliminar" @click.stop="emit('delete', row)" v-html="ICONS.trash"></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table-card { overflow: hidden; }
.table-scroll-top { overflow-x: auto; overflow-y: hidden; height: 16px; border-bottom: 1px solid var(--line); }
.table-scroll-top > div { height: 1px; }
</style>
