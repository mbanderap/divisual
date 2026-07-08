<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import Modal from "../ui/Modal.vue";
import MultiPicker from "../ui/MultiPicker.vue";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/auth";
import { useToastStore } from "../../stores/toast";
import { useConfirmStore } from "../../stores/confirm";
import { useCatalogStore } from "../../stores/catalogs";
import { syncBridge } from "../../lib/syncBridge";
import { nn, fdate } from "../../lib/format";
import { TASK_TYPES, TASK_STAGES } from "../../lib/types";
import type { Task, TaskComment, Personnel } from "../../lib/types";

const props = defineProps<{ task?: Task | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const auth = useAuthStore();
const toast = useToastStore();
const confirm = useConfirmStore();
const catalogs = useCatalogStore();

const title = ref(props.task?.title ?? "");
const description = ref(props.task?.description ?? "");
const type = ref(props.task?.type ?? "Tarea");
const status = ref(props.task?.status ?? "Por hacer");
const assignees = ref(
  (props.task?.tasks_personnel ?? []).map((tp) => ({ id: tp.personnel!.id, label: tp.personnel!.name })).filter((x) => x.id),
);
const saving = ref(false);

// --- historia: buscar entre las existentes o crear una nueva al vuelo ---
const storyId = ref<number | null>(props.task?.story_id ?? null);
const storyQuery = ref(props.task?.stories?.name ?? "");
const storyOpen = ref(false);
const storyWrapEl = ref<HTMLElement | null>(null);
const filteredStories = computed(() => {
  const q = storyQuery.value.trim().toLowerCase();
  const list = q ? catalogs.stories.filter((s) => s.name.toLowerCase().includes(q)) : catalogs.stories;
  return list.slice(0, 8);
});
const exactStoryMatch = computed(() => catalogs.stories.some((s) => s.name.toLowerCase() === storyQuery.value.trim().toLowerCase()));

function onStoryInput() { storyId.value = null; storyOpen.value = true; }
function onStoryFocus() { storyOpen.value = true; }
function pickStory(id: number, name: string) { storyId.value = id; storyQuery.value = name; storyOpen.value = false; }
async function createStory() {
  const n = storyQuery.value.trim();
  if (!n) return;
  try {
    const { data, error } = await supabase.from("stories").insert({ name: n }).select("id, name");
    if (error) throw error;
    catalogs.stories.push(data[0]);
    storyId.value = data[0].id;
    storyQuery.value = data[0].name;
    storyOpen.value = false;
  } catch (e) { toast.error(e, "crear la historia"); }
}
function onStoryDocClick(e: MouseEvent) {
  if (storyWrapEl.value && !storyWrapEl.value.contains(e.target as Node)) storyOpen.value = false;
}

// --- comentarios (foro) ---
const comments = ref<TaskComment[] | null>(null);
const commentsError = ref(false);
const newComment = ref("");

onMounted(async () => {
  document.addEventListener("click", onStoryDocClick);
  if (!props.task) return;
  try {
    const { data, error } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", props.task.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    comments.value = data as TaskComment[];
  } catch { commentsError.value = true; }
});
onUnmounted(() => document.removeEventListener("click", onStoryDocClick));

async function addComment() {
  const c = newComment.value.trim();
  if (!c || !props.task) return;
  try {
    const { data, error } = await supabase.from("task_comments").insert({
      task_id: props.task.id, author_email: auth.userEmail, comment: c,
    }).select("*");
    if (error) throw error;
    comments.value = [data[0] as TaskComment, ...(comments.value ?? [])];
    newComment.value = "";
  } catch (e) { toast.error(e, "añadir el comentario"); }
}

async function save() {
  if (!title.value.trim()) { toast.show("El título es obligatorio."); return; }
  saving.value = true;
  try {
    const row = {
      title: title.value.trim(), description: nn(description.value), type: type.value, status: status.value,
      story_id: storyId.value,
    };
    let id = props.task?.id;
    if (props.task) {
      const { error } = await supabase.from("tasks").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("tasks").insert(row).select("id");
      if (error) throw error;
      id = data[0].id;
    }
    await syncBridge("tasks_personnel", "task_id", id!, assignees.value.map((p) => ({ task_id: id, personnel_id: p.id })));
    toast.show(props.task ? "Tarea actualizada" : "Tarea creada");
    emit("saved");
  } catch (e) { toast.error(e, "guardar la tarea"); }
  finally { saving.value = false; }
}

async function remove() {
  if (!props.task) return;
  const ok = await confirm.ask(`Se eliminará la tarea "${props.task.title}".`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", props.task.id);
    if (error) throw error;
    toast.show("Tarea eliminada");
    emit("saved");
  } catch (e) { toast.error(e, "eliminar la tarea"); }
}
</script>

<template>
  <Modal width="640px" @close="emit('close')">
    <h2>{{ task ? `Editar tarea #${task.id}` : "Nueva tarea" }}</h2>
    <div class="field"><label>Título</label><input v-model="title" type="text" placeholder="Qué hay que hacer" /></div>
    <div class="field-row-3">
      <div class="field">
        <label>Tipo</label>
        <div class="chips">
          <button v-for="t in TASK_TYPES" :key="t" type="button" class="chip-btn" :class="{ selected: type === t }" @click="type = t">{{ t }}</button>
        </div>
      </div>
      <div class="field">
        <label>Etapa</label>
        <select v-model="status"><option v-for="s in TASK_STAGES" :key="s" :value="s">{{ s }}</option></select>
      </div>
      <div class="field">
        <label>Historia</label>
        <div class="combo" ref="storyWrapEl">
          <input
            v-model="storyQuery"
            type="text"
            class="combo-input"
            placeholder="Buscar o crear..."
            autocomplete="off"
            @input="onStoryInput"
            @focus="onStoryFocus"
          />
          <div class="combo-drop" :class="{ open: storyOpen }">
            <div v-if="!filteredStories.length && !storyQuery.trim()" class="combo-empty">Sin historias todavía</div>
            <div v-for="s in filteredStories" :key="s.id" class="combo-opt" @click="pickStory(s.id, s.name)">{{ s.name }}</div>
            <div v-if="storyQuery.trim() && !exactStoryMatch" class="combo-opt" @click="createStory">Crear historia "{{ storyQuery.trim() }}"</div>
          </div>
        </div>
      </div>
    </div>
    <div class="field"><label>Descripción</label><textarea v-model="description" placeholder="Detalle de la tarea o del bug"></textarea></div>
    <MultiPicker
      v-model="assignees"
      label="Personas asociadas"
      table="personnel"
      search-col="name"
      select-cols="id, name"
      :label-fn="(r: Personnel) => r.name"
    />

    <template v-if="task">
      <h4>Comentarios</h4>
      <div v-if="comments === null && !commentsError" class="loading" style="padding: 14px">Cargando comentarios...</div>
      <p v-else-if="commentsError" style="font-size: 12.5px; color: var(--faint)">No se pudieron cargar los comentarios.</p>
      <template v-else>
        <p v-if="!comments!.length" style="font-size: 12.5px; color: var(--faint)">Sin comentarios todavía.</p>
        <div v-for="c in comments" :key="c.id" class="hist-item">
          <span class="h-date">{{ fdate(c.created_at) }}</span>
          <span class="h-note"><strong>{{ c.author_email }}:</strong> {{ c.comment }}</span>
        </div>
      </template>
      <div class="field" style="margin-top: 12px">
        <label>Añadir comentario</label>
        <textarea v-model="newComment" placeholder="Escribe un comentario..."></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px">
        <button class="btn btn-ghost" @click="addComment">Comentar</button>
      </div>
    </template>

    <div class="modal-foot">
      <button v-if="task" class="btn btn-danger" style="margin-right: auto" @click="remove">Eliminar</button>
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
