<script setup lang="ts" generic="T extends { id: number }">
import { shallowRef, ref, watch } from "vue";
import { debounce } from "../../lib/format";
import { asyncSearch } from "../../composables/useAsyncSearch";
import { ICONS } from "../../lib/icons";

const props = defineProps<{
  modelValue: { id: number; label: string }[];
  label: string;
  table: string;
  searchCol: string;
  selectCols: string;
  labelFn: (row: T) => string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: { id: number; label: string }[]] }>();

const query = ref("");
const results = shallowRef<T[]>([]);
const open = ref(false);
const wrapEl = ref<HTMLElement | null>(null);

const runSearch = debounce(async (term: string) => {
  if (term.trim().length < 2) { open.value = false; return; }
  const selectedIds = new Set(props.modelValue.map((x) => x.id));
  const found = await asyncSearch<T>(props.table, props.searchCol, term.trim(), props.selectCols, 8);
  results.value = found.filter((r) => !selectedIds.has(r.id));
  open.value = true;
}, 300);

function onInput() { runSearch(query.value); }
function pick(row: T) {
  emit("update:modelValue", [...props.modelValue, { id: row.id, label: props.labelFn(row) }]);
  query.value = ""; open.value = false;
}
function remove(id: number) {
  emit("update:modelValue", props.modelValue.filter((x) => x.id !== id));
}
function onDocClick(e: MouseEvent) {
  if (wrapEl.value && !wrapEl.value.contains(e.target as Node)) open.value = false;
}
watch(open, (v) => {
  if (v) document.addEventListener("click", onDocClick);
  else document.removeEventListener("click", onDocClick);
});
</script>

<template>
  <div class="field">
    <label>{{ label }}</label>
    <div class="combo" ref="wrapEl">
      <input v-model="query" type="text" class="combo-input" placeholder="Buscar y añadir..." autocomplete="off" @input="onInput" />
      <div class="combo-drop" :class="{ open }">
        <div v-if="!results.length" class="combo-empty">Sin resultados</div>
        <div v-for="r in results" :key="r.id" class="combo-opt" @click="pick(r)">{{ labelFn(r) }}</div>
      </div>
    </div>
    <div class="multi-list">
      <p v-if="!modelValue.length" style="font-size: 12px; color: var(--faint)">Ninguno seleccionado todavía.</p>
      <div v-for="item in modelValue" :key="item.id" class="multi-chip">
        <span>{{ item.label }}</span>
        <button type="button" title="Quitar" @click="remove(item.id)" v-html="ICONS.trash"></button>
      </div>
    </div>
  </div>
</template>
