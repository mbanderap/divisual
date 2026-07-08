<script setup lang="ts" generic="T extends { id: number }">
import { computed } from "vue";
import type { ColumnDef } from "../../lib/types";
import { ICONS } from "../../lib/icons";

const props = defineProps<{
  columns: ColumnDef<T>[];
  rows: T[];
  activeSortKey: string | null;
  activeSortDir: "asc" | "desc";
}>();
const emit = defineEmits<{ sort: [ColumnDef<T>]; "row-click": [T]; edit: [T]; delete: [T] }>();

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
</script>

<template>
  <div class="card table-wrap">
    <table>
      <thead>
        <tr>
          <th v-for="c in visibleColumns" :key="c.key" class="sortable" @click="emit('sort', c)">
            {{ c.label }}<span v-if="arrow(c)" class="s-arrow">{{ arrow(c) }}</span>
          </th>
          <th style="width: 80px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" @click="emit('row-click', row)">
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
</template>
