<script setup lang="ts" generic="T">
import Modal from "./Modal.vue";
import type { ColumnDef } from "../../lib/types";
import { ICONS } from "../../lib/icons";

const props = defineProps<{ columns: ColumnDef<T>[] }>();
const emit = defineEmits<{ "update:columns": [ColumnDef<T>[]]; close: [] }>();

function toggle(i: number, visible: boolean) {
  const next = props.columns.map((c, idx) => (idx === i ? { ...c, visible } : c));
  emit("update:columns", next);
}
function move(i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= props.columns.length) return;
  const next = [...props.columns];
  [next[i], next[j]] = [next[j], next[i]];
  emit("update:columns", next);
}
</script>

<template>
  <Modal width="460px" @close="emit('close')">
    <h2>Columnas de la lista</h2>
    <p style="font-size: 12.5px; color: var(--muted); margin-bottom: 12px; line-height: 1.5">
      Marca las columnas que quieres ver y usa las flechas para cambiar su orden. Los cambios se aplican al momento.
    </p>
    <div>
      <div v-for="(c, i) in columns" :key="c.key" class="col-row">
        <label>
          <input type="checkbox" :checked="c.visible" :disabled="i === 0" @change="toggle(i, ($event.target as HTMLInputElement).checked)" />
          {{ c.label }}
        </label>
        <div class="col-move">
          <button title="Subir" :disabled="i === 0" @click="move(i, -1)" v-html="ICONS.up"></button>
          <button title="Bajar" :disabled="i === columns.length - 1" @click="move(i, 1)" v-html="ICONS.down"></button>
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-primary" @click="emit('close')">Hecho</button>
    </div>
  </Modal>
</template>
