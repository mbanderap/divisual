<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useSearchStore } from "../stores/search";
import { useToastStore } from "../stores/toast";
import { supabase } from "../lib/supabase";
import { statusClass, fdate } from "../lib/format";
import { rescheduleTaskIfDone } from "../lib/recurrence";
import { TASK_STAGES } from "../lib/types";
import TaskModal from "../components/tasks/TaskModal.vue";
import SprintModal from "../components/tasks/SprintModal.vue";
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
function isOverdue(t: Task): boolean {
  return !!t.due_date && t.status !== "Listo en prod" && t.due_date < new Date().toISOString().slice(0, 10);
}

const tab = ref<"kanban" | "backlog">("kanban");
const sprintFilter = ref<number | "">("");
const showSprintModal = ref(false);
function onSprintSaved() { showSprintModal.value = false; catalogs.loadCatalogs(); }

function labelsOf(t: Task) {
  return (t.tasks_labels || []).map((l) => l.labels).filter((l): l is NonNullable<typeof l> => !!l);
}

const backlogGroups = computed(() => {
  const bySprint = new Map<number | null, Task[]>();
  for (const t of catalogs.tasks) {
    const key = t.sprint_id;
    if (!bySprint.has(key)) bySprint.set(key, []);
    bySprint.get(key)!.push(t);
  }
  const sorted = [...catalogs.sprints].sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
  const groups = sorted.map((s) => ({ id: s.id as number | null, name: s.name, tasks: bySprint.get(s.id) ?? [] }));
  groups.push({ id: null, name: "Backlog", tasks: bySprint.get(null) ?? [] });
  return groups;
});

async function moveToSprint(task: Task, sprintId: number | null) {
  try {
    const { error } = await supabase.from("tasks").update({ sprint_id: sprintId }).eq("id", task.id);
    if (error) throw error;
    task.sprint_id = sprintId;
    toast.show(sprintId ? "Movida al sprint" : "Movida al backlog");
  } catch (e) { toast.error(e, "mover la tarea de sprint"); }
}
async function changeStatus(task: Task, status: string) {
  try {
    const row = rescheduleTaskIfDone({ ...task, status }, TASK_STAGES[TASK_STAGES.length - 1], TASK_STAGES[0]);
    const { error } = await supabase.from("tasks").update({ status: row.status, due_date: row.due_date }).eq("id", task.id);
    if (error) throw error;
    task.status = row.status;
    task.due_date = row.due_date;
    if (row.status !== status) toast.show("Tarea recurrente reprogramada para " + fdate(row.due_date));
  } catch (e) { toast.error(e, "cambiar la etapa"); }
}

const visible = computed(() =>
  catalogs.tasks.filter((t) => {
    if (sprintFilter.value !== "" && t.sprint_id !== sprintFilter.value) return false;
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
    const row = rescheduleTaskIfDone({ ...task, status: stage }, TASK_STAGES[TASK_STAGES.length - 1], TASK_STAGES[0]);
    const { error } = await supabase.from("tasks").update({ status: row.status, due_date: row.due_date }).eq("id", task.id);
    if (error) throw error;
    task.status = row.status;
    task.due_date = row.due_date;
    toast.show(row.status !== stage ? "Tarea recurrente reprogramada para " + fdate(row.due_date) : "Movido a " + stage);
  } catch (e) { toast.error(e, "mover la tarea"); }
}
</script>

<template>
  <div class="view-head">
    <div><h1>Tablero</h1><div class="view-sub">Arrastra las tarjetas entre columnas para actualizar el estado</div></div>
    <div style="display: flex; gap: 10px">
      <select v-model="sprintFilter" class="filter-select">
        <option value="">Todos los sprints</option>
        <option v-for="s in catalogs.sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <button class="btn btn-ghost" @click="showSprintModal = true">+ Sprint</button>
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

  <div class="tabs">
    <button class="tab-btn" :class="{ active: tab === 'kanban' }" @click="tab = 'kanban'">Tablero</button>
    <button class="tab-btn" :class="{ active: tab === 'backlog' }" @click="tab = 'backlog'">Backlog</button>
  </div>

  <div v-if="tab === 'kanban'" class="kanban">
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
        :class="[`prio-${statusClass(t.priority)}`, { dragging: draggingId === t.id }]"
        draggable="true"
        @dragstart="draggingId = t.id"
        @dragend="draggingId = null"
        @click="openEdit(t)"
      >
        <div class="t-top">
          <span class="task-type" :class="statusClass(t.type)">{{ t.type }}</span>
          <span class="task-id">{{ t.recurrence ? "↻ " : "" }}#{{ t.id }}</span>
        </div>
        <div class="t-title">{{ t.title }}</div>
        <div class="t-company">{{ t.stories?.name || "Sin historia" }}</div>
        <div v-if="labelsOf(t).length" style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px">
          <span v-for="l in labelsOf(t)" :key="l.id" class="tag" :style="{ background: l.color, color: '#fff' }">{{ l.name }}</span>
        </div>
        <div class="t-foot">
          <span class="t-owner">{{ assigneeNames(t) }}</span>
          <span v-if="t.due_date" class="t-date" :class="{ neg: isOverdue(t) }">{{ fdate(t.due_date) }}</span>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="backlog">
    <div v-for="g in backlogGroups" :key="g.id ?? 'none'" class="card panel" style="margin-bottom: 12px">
      <div class="panel-title">{{ g.name }}<span class="hint">{{ g.tasks.length }} tareas</span></div>
      <div v-if="!g.tasks.length" style="font-size: 12.5px; color: var(--faint)">Sin tareas aquí.</div>
      <div v-for="t in g.tasks" :key="t.id" class="backlog-row">
        <span class="task-id">#{{ t.id }}</span>
        <span class="backlog-title" @click="openEdit(t)">{{ t.title }}</span>
        <span v-for="l in labelsOf(t)" :key="l.id" class="tag" :style="{ background: l.color, color: '#fff' }">{{ l.name }}</span>
        <select class="filter-select" :value="t.status" @change="changeStatus(t, ($event.target as HTMLSelectElement).value)">
          <option v-for="s in TASK_STAGES" :key="s" :value="s">{{ s }}</option>
        </select>
        <select class="filter-select" :value="t.sprint_id ?? ''" @change="moveToSprint(t, ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)">
          <option value="">Backlog</option>
          <option v-for="s in catalogs.sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
    </div>
  </div>

  <TaskModal v-if="showModal" :task="editing" @close="showModal = false" @saved="onSaved" />
  <SprintModal v-if="showSprintModal" @close="showSprintModal = false" @saved="onSprintSaved" />
</template>
