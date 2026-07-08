<script setup lang="ts" generic="T extends { id: number }">
import { shallowRef, ref, watch } from "vue";
import { debounce } from "../../lib/format";
import { asyncSearch } from "../../composables/useAsyncSearch";

const props = defineProps<{
  modelValue: number | null;
  label: string;
  table: string;
  searchCol: string;
  selectCols: string;
  labelFn: (row: T) => string;
  initialLabel?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();

const query = ref(props.initialLabel ?? "");
const results = shallowRef<T[]>([]);
const open = ref(false);
const wrapEl = ref<HTMLElement | null>(null);

const runSearch = debounce(async (term: string) => {
  if (term.trim().length < 2) { open.value = false; return; }
  results.value = await asyncSearch<T>(props.table, props.searchCol, term.trim(), props.selectCols, 8);
  open.value = true;
}, 300);

function onInput() {
  emit("update:modelValue", null);
  runSearch(query.value);
}
function pick(row: T) {
  emit("update:modelValue", row.id);
  query.value = props.labelFn(row);
  open.value = false;
}
function onFocus() {
  if (query.value.trim().length >= 2) runSearch(query.value);
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
      <input
        v-model="query"
        type="text"
        class="combo-input"
        placeholder="Escribe para buscar..."
        autocomplete="off"
        @input="onInput"
        @focus="onFocus"
      />
      <div class="combo-drop" :class="{ open }">
        <div v-if="!results.length" class="combo-empty">Sin resultados</div>
        <div v-for="r in results" :key="r.id" class="combo-opt" @click="pick(r)">{{ labelFn(r) }}</div>
      </div>
    </div>
  </div>
</template>
