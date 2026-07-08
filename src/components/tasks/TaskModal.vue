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
import { ICONS } from "../../lib/icons";
import { TASK_TYPES, TASK_STAGES, TASK_PRIORITIES } from "../../lib/types";
import type { Task, TaskComment, TaskSubitem, TaskAttachment, Personnel } from "../../lib/types";

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
const priority = ref(props.task?.priority ?? "Media");
const dueDate = ref(props.task?.due_date ?? "");
const sprintId = ref<number | null>(props.task?.sprint_id ?? null);
const assignees = ref(
  (props.task?.tasks_personnel ?? []).map((tp) => ({ id: tp.personnel!.id, label: tp.personnel!.name })).filter((x) => x.id),
);
const saving = ref(false);

// --- etiquetas ---
const LABEL_COLORS = ["#6366f1", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
const selectedLabelIds = ref<number[]>(
  (props.task?.tasks_labels ?? []).map((l) => l.labels?.id).filter((x): x is number => !!x),
);
const newLabelName = ref("");
function toggleLabel(id: number) {
  selectedLabelIds.value = selectedLabelIds.value.includes(id)
    ? selectedLabelIds.value.filter((x) => x !== id)
    : [...selectedLabelIds.value, id];
}
async function createLabel() {
  const n = newLabelName.value.trim();
  if (!n) return;
  try {
    const color = LABEL_COLORS[catalogs.labels.length % LABEL_COLORS.length];
    const { data, error } = await supabase.from("labels").insert({ name: n, color }).select("id, name, color");
    if (error) throw error;
    catalogs.labels.push(data[0]);
    selectedLabelIds.value.push(data[0].id);
    newLabelName.value = "";
  } catch (e) { toast.error(e, "crear la etiqueta"); }
}

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

// --- subtareas (checklist) ---
const subitems = ref<TaskSubitem[] | null>(null);
const subitemsError = ref(false);
const newSubitem = ref("");

// --- adjuntos (enlaces) ---
const attachments = ref<TaskAttachment[] | null>(null);
const attachmentsError = ref(false);
const newAttachmentLabel = ref("");
const newAttachmentUrl = ref("");

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
  try {
    const { data, error } = await supabase
      .from("task_subitems")
      .select("*")
      .eq("task_id", props.task.id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    subitems.value = data as TaskSubitem[];
  } catch { subitemsError.value = true; }
  try {
    const { data, error } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", props.task.id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    attachments.value = data as TaskAttachment[];
  } catch { attachmentsError.value = true; }
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

async function addSubitem() {
  const t = newSubitem.value.trim();
  if (!t || !props.task) return;
  try {
    const { data, error } = await supabase.from("task_subitems").insert({ task_id: props.task.id, title: t, done: false }).select("*");
    if (error) throw error;
    subitems.value = [...(subitems.value ?? []), data[0] as TaskSubitem];
    newSubitem.value = "";
  } catch (e) { toast.error(e, "añadir la subtarea"); }
}
async function toggleSubitem(s: TaskSubitem) {
  try {
    const { error } = await supabase.from("task_subitems").update({ done: !s.done }).eq("id", s.id);
    if (error) throw error;
    s.done = !s.done;
  } catch (e) { toast.error(e, "actualizar la subtarea"); }
}
async function removeSubitem(s: TaskSubitem) {
  try {
    const { error } = await supabase.from("task_subitems").delete().eq("id", s.id);
    if (error) throw error;
    subitems.value = (subitems.value ?? []).filter((x) => x.id !== s.id);
  } catch (e) { toast.error(e, "eliminar la subtarea"); }
}

async function addAttachment() {
  const url = newAttachmentUrl.value.trim();
  if (!url || !props.task) return;
  const label = newAttachmentLabel.value.trim() || url;
  try {
    const { data, error } = await supabase.from("task_attachments").insert({ task_id: props.task.id, label, url }).select("*");
    if (error) throw error;
    attachments.value = [...(attachments.value ?? []), data[0] as TaskAttachment];
    newAttachmentLabel.value = ""; newAttachmentUrl.value = "";
  } catch (e) { toast.error(e, "añadir el adjunto"); }
}
async function removeAttachment(a: TaskAttachment) {
  try {
    const { error } = await supabase.from("task_attachments").delete().eq("id", a.id);
    if (error) throw error;
    attachments.value = (attachments.value ?? []).filter((x) => x.id !== a.id);
  } catch (e) { toast.error(e, "eliminar el adjunto"); }
}

async function save() {
  if (!title.value.trim()) { toast.show("El título es obligatorio."); return; }
  saving.value = true;
  try {
    const row = {
      title: title.value.trim(), description: nn(description.value), type: type.value, status: status.value,
      priority: priority.value, due_date: nn(dueDate.value),
      story_id: storyId.value, sprint_id: sprintId.value,
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
    await syncBridge("tasks_labels", "task_id", id!, selectedLabelIds.value.map((lid) => ({ task_id: id, label_id: lid })));
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
    <div class="field-row-3">
      <div class="field">
        <label>Prioridad</label>
        <div class="chips">
          <button v-for="p in TASK_PRIORITIES" :key="p" type="button" class="chip-btn" :class="{ selected: priority === p }" @click="priority = p">{{ p }}</button>
        </div>
      </div>
      <div class="field"><label>Fecha límite</label><input v-model="dueDate" type="date" /></div>
      <div class="field">
        <label>Sprint</label>
        <select v-model="sprintId">
          <option :value="null">Sin sprint</option>
          <option v-for="s in catalogs.sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
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

    <div class="field">
      <label>Etiquetas</label>
      <div class="chips">
        <button
          v-for="l in catalogs.labels"
          :key="l.id"
          type="button"
          class="chip-btn"
          :style="selectedLabelIds.includes(l.id) ? { background: l.color, borderColor: l.color, color: '#fff' } : { borderColor: l.color, color: l.color }"
          @click="toggleLabel(l.id)"
        >{{ l.name }}</button>
        <p v-if="!catalogs.labels.length" style="font-size: 12.5px; color: var(--faint)">Sin etiquetas todavía.</p>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px">
        <input v-model="newLabelName" type="text" placeholder="Nueva etiqueta..." style="flex: 1" @keyup.enter="createLabel" />
        <button class="btn btn-ghost" @click="createLabel">Crear</button>
      </div>
    </div>

    <template v-if="task">
      <h4>Subtareas</h4>
      <div v-if="subitems === null && !subitemsError" class="loading" style="padding: 14px">Cargando subtareas...</div>
      <p v-else-if="subitemsError" style="font-size: 12.5px; color: var(--faint)">No se pudieron cargar las subtareas.</p>
      <template v-else>
        <p v-if="!subitems!.length" style="font-size: 12.5px; color: var(--faint)">Sin subtareas todavía.</p>
        <div v-for="s in subitems" :key="s.id" class="multi-chip" style="margin-bottom: 6px">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1">
            <input type="checkbox" :checked="s.done" @change="toggleSubitem(s)" />
            <span :style="{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--faint)' : 'inherit' }">{{ s.title }}</span>
          </label>
          <button type="button" title="Quitar" @click="removeSubitem(s)" v-html="ICONS.trash"></button>
        </div>
      </template>
      <div style="display: flex; gap: 8px; margin: 8px 0 16px">
        <input v-model="newSubitem" type="text" placeholder="Nueva subtarea..." style="flex: 1" @keyup.enter="addSubitem" />
        <button class="btn btn-ghost" @click="addSubitem">Añadir</button>
      </div>

      <h4>Adjuntos</h4>
      <div v-if="attachments === null && !attachmentsError" class="loading" style="padding: 14px">Cargando adjuntos...</div>
      <p v-else-if="attachmentsError" style="font-size: 12.5px; color: var(--faint)">No se pudieron cargar los adjuntos.</p>
      <template v-else>
        <p v-if="!attachments!.length" style="font-size: 12.5px; color: var(--faint)">Sin adjuntos todavía.</p>
        <div v-for="a in attachments" :key="a.id" class="multi-chip" style="margin-bottom: 6px">
          <a :href="a.url" target="_blank" rel="noopener" style="flex: 1; color: var(--accent)">{{ a.label }}</a>
          <button type="button" title="Quitar" @click="removeAttachment(a)" v-html="ICONS.trash"></button>
        </div>
      </template>
      <div class="field-row" style="margin: 8px 0 16px">
        <input v-model="newAttachmentLabel" type="text" placeholder="Nombre (opcional)" />
        <input v-model="newAttachmentUrl" type="text" placeholder="https://..." @keyup.enter="addAttachment" />
      </div>
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px">
        <button class="btn btn-ghost" @click="addAttachment">Adjuntar enlace</button>
      </div>

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
