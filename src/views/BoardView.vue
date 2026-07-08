<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useSearchStore } from "../stores/search";
import { useToastStore } from "../stores/toast";
import { supabase } from "../lib/supabase";
import { statusClass } from "../lib/format";
import { TASK_STAGES } from "../lib/types";
import TaskModal from "../components/tasks/TaskModal.vue";
import type { Task } from "../lib/types";

const catalogs = useCatalogStore();
const search = useSearchStore();
const toast = useToastStore();

const localSearch = ref("");
onMounted(() => search.register((v) => (localSearch.value = v.toLowerCase()), "", "Buscar tareas por título, historia o persona"));
onUnmounted(() => search.unregister());

const filterIds = ref<number[]>([]);
const filterOpen = ref(false);
const filterWrapEl = ref<HTMLElement | null>(null);
function toggleFilter(id: number) {
  filterIds.value = filterIds.value.includes(id) ? filterIds.value.filter((x) => x !== id) : [...filterIds.value, id];
}
function onFilterDocClick(e: MouseEvent) {
  if (filterWrapEl.value && !filterWrapEl.value.contains(e.target as Node)) filterOpen.value = false;
}
onMounted(() => document.addEventListener("click", onFilterDocClick));
onUnmounted(() => document.removeEventListener("click", onFilterDocClick));

function assigneeNames(t: Task): string {
  return (t.tasks_personnel || []).map((tp) => tp.personnel?.name).filter(Boolean).join(", ") || "Sin asignar";
}

const visible = computed(() =>
  catalogs.tasks.filter((t) => {
    if (filterIds.value.length && !(t.tasks_personnel || []).some((tp) => tp.personnel && filterIds.value.includes(tp.personnel.id))) return false;
    if (!localSearch.value) return true;
    const haystack = [t.title, t.stories?.name, ...(t.tasks_personnel || []).map((tp) => tp.personnel?.name)].join(" ").toLowerCase();
    return haystack.includes(localSearch.value);
  }),
);

const showModal = ref(false);
const editing = ref<Task | null>(null);
function openNew() { editing.value = null; showModal.value = true; }
function openEdit(t: Task) { editing.value = t; showModal.value = true; }
function onSaved() { showModal.value = false; catalogs.loadCatalogs(); }

const draggingId = ref<number | null>(null);
const dragOverStage = ref<string | null>(null);

function onDrop(stage: string) {
  dragOverStage.value = null;
  const task = catalogs.tasks.find((t) => t.id === draggingId.value);
  if (!task || task.status === stage) return;
  moveTask(task, stage);
}
async function moveTask(task: Task, stage: string) {
  try {
    const { error } = await supabase.from("tasks").update({ status: stage }).eq("id", task.id);
    if (error) throw error;
    task.status = stage;
    toast.show("Movido a " + stage);
  } catch (e) { toast.error(e, "mover la tarea"); }
}
</script>

<template>
  <div class="view-head">
    <div><h1>Tablero</h1><div class="view-sub">Arrastra las tarjetas entre columnas para actualizar el estado</div></div>
    <div style="display: flex; gap: 10px">
      <div class="combo" ref="filterWrapEl">
        <button class="btn btn-ghost" @click="filterOpen = !filterOpen">
          Filtrar por persona{{ filterIds.length ? ` (${filterIds.length})` : "" }}
        </button>
        <div class="combo-drop" :class="{ open: filterOpen }">
          <div v-if="!catalogs.personnel.length" class="combo-empty">Sin personal todavía</div>
          <div v-for="p in catalogs.personnel" :key="p.id" class="combo-opt" @click="toggleFilter(p.id)">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
              <input type="checkbox" :checked="filterIds.includes(p.id)" @click.stop="toggleFilter(p.id)" />
              {{ p.name }}
            </label>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="openNew">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Nueva tarea
      </button>
    </div>
  </div>

  <div class="kanban">
    <div
      v-for="s in TASK_STAGES"
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
        class="task"
        :class="{ dragging: draggingId === t.id }"
        draggable="true"
        @dragstart="draggingId = t.id"
        @dragend="draggingId = null"
        @click="openEdit(t)"
      >
        <div class="t-top">
          <span class="task-type" :class="statusClass(t.type)">{{ t.type }}</span>
          <span class="task-id">#{{ t.id }}</span>
        </div>
        <div class="t-title">{{ t.title }}</div>
        <div class="t-company">{{ t.stories?.name || "Sin historia" }}</div>
        <div class="t-foot"><span class="t-owner">{{ assigneeNames(t) }}</span></div>
      </div>
    </div>
  </div>

  <TaskModal v-if="showModal" :task="editing" @close="showModal = false" @saved="onSaved" />
</template>
