<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useCatalogStore } from "../stores/catalogs";
import { useToastStore } from "../stores/toast";
import { supabase } from "../lib/supabase";
import { initials } from "../lib/format";
import TaskRequestModal from "../components/chat/TaskRequestModal.vue";
import type { Message } from "../lib/types";

const auth = useAuthStore();
const catalogs = useCatalogStore();
const toast = useToastStore();

const myEmail = computed(() => auth.userEmail);
const myPersonnel = computed(() => catalogs.personnel.find((p) => p.email === myEmail.value) ?? null);

const messages = ref<Message[]>([]);
const loading = ref(true);
const activePeer = ref<string | null>(null);
const extraPeers = ref<string[]>([]);
const newMessageText = ref("");
const showTaskModal = ref(false);

function personnelName(email: string): string {
  return catalogs.personnel.find((p) => p.email === email)?.name ?? email;
}
function ftime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

async function loadMessages() {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_email.eq.${myEmail.value},recipient_email.eq.${myEmail.value}`)
      .order("created_at", { ascending: true });
    if (error) throw error;
    messages.value = (data ?? []) as Message[];
  } catch (e) { toast.error(e, "cargar los mensajes"); }
  finally { loading.value = false; }
}

let channel: ReturnType<typeof supabase.channel> | null = null;
onMounted(async () => {
  if (!catalogs.personnel.length) {
    try { await catalogs.loadCatalogs(); } catch { /* seguimos con lo que ya haya en el store */ }
  }
  await loadMessages();
  channel = supabase
    .channel("messages-changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const m = payload.new as Message;
      if (m.sender_email === myEmail.value || m.recipient_email === myEmail.value) messages.value.push(m);
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
      const m = payload.new as Message;
      const idx = messages.value.findIndex((x) => x.id === m.id);
      if (idx !== -1) messages.value[idx] = m;
    })
    .subscribe();
});
onUnmounted(() => { if (channel) supabase.removeChannel(channel); });

const otherPersonnel = computed(() => catalogs.loggedInPersonnel.filter((p) => p.email && p.email !== myEmail.value));

const conversations = computed(() => {
  const map = new Map<string, Message>();
  for (const m of messages.value) {
    const peer = m.sender_email === myEmail.value ? m.recipient_email : m.sender_email;
    if (peer === myEmail.value) continue;
    const prev = map.get(peer);
    if (!prev || m.created_at > prev.created_at) map.set(peer, m);
  }
  const fromMessages = Array.from(map.entries()).map(([email, last]) => ({ email, last }));
  const extra = extraPeers.value.filter((e) => !map.has(e)).map((email) => ({ email, last: null as Message | null }));
  return [...fromMessages, ...extra].sort((a, b) => {
    if (!a.last) return 1;
    if (!b.last) return -1;
    return b.last.created_at > a.last.created_at ? 1 : -1;
  });
});

const pendingForMe = computed(() =>
  messages.value.filter((m) => m.type === "task_request" && m.task_response === "pending" && m.recipient_email === myEmail.value),
);

const threadMessages = computed(() => {
  if (!activePeer.value) return [];
  return messages.value
    .filter((m) => (m.sender_email === myEmail.value && m.recipient_email === activePeer.value) || (m.sender_email === activePeer.value && m.recipient_email === myEmail.value))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
});

function openConversation(email: string) {
  activePeer.value = email;
}
function startConversation(email: string) {
  if (!email) return;
  if (!extraPeers.value.includes(email)) extraPeers.value.push(email);
  activePeer.value = email;
}

async function sendMessage() {
  const body = newMessageText.value.trim();
  if (!body || !activePeer.value) return;
  newMessageText.value = "";
  try {
    const { data, error } = await supabase.from("messages").insert({
      sender_email: myEmail.value, recipient_email: activePeer.value, body, type: "text",
    }).select("*");
    if (error) throw error;
    messages.value.push(data[0] as Message);
  } catch (e) { toast.error(e, "enviar el mensaje"); }
}

async function sendTaskRequest(payload: { title: string; description: string; type: string }) {
  if (!activePeer.value) return;
  try {
    const { data, error } = await supabase.from("messages").insert({
      sender_email: myEmail.value, recipient_email: activePeer.value, type: "task_request",
      task_title: payload.title, task_description: payload.description, task_type: payload.type, task_response: "pending",
    }).select("*");
    if (error) throw error;
    messages.value.push(data[0] as Message);
    showTaskModal.value = false;
    toast.show("Solicitud de tarea enviada");
  } catch (e) { toast.error(e, "enviar la solicitud"); }
}

async function acceptTask(m: Message) {
  if (!myPersonnel.value) { toast.show("Tu email de sesión no coincide con ningún registro de Personal."); return; }
  try {
    const { data, error } = await supabase.from("tasks").insert({
      title: m.task_title, description: m.task_description, type: m.task_type, status: "Por hacer",
    }).select("id");
    if (error) throw error;
    const taskId = data[0].id;
    const { error: linkErr } = await supabase.from("tasks_personnel").insert({ task_id: taskId, personnel_id: myPersonnel.value.id });
    if (linkErr) throw linkErr;
    const { error: updErr } = await supabase.from("messages").update({ task_response: "accepted", task_id: taskId }).eq("id", m.id);
    if (updErr) throw updErr;
    m.task_response = "accepted"; m.task_id = taskId;
    toast.show("Tarea añadida al tablero");
    catalogs.loadCatalogs();
  } catch (e) { toast.error(e, "aceptar la tarea"); }
}
async function declineTask(m: Message) {
  try {
    const { error } = await supabase.from("messages").update({ task_response: "declined" }).eq("id", m.id);
    if (error) throw error;
    m.task_response = "declined";
  } catch (e) { toast.error(e, "rechazar la tarea"); }
}
</script>

<template>
  <div class="view-head">
    <div><h1>Chat</h1><div class="view-sub">Habla con el equipo y manda tareas directamente desde la conversación</div></div>
  </div>

  <div v-if="loading" class="loading" style="padding: 14px">Cargando chat...</div>
  <div v-else class="chat-shell">
    <div class="chat-sidebar">
      <div class="chat-sidebar-section">Nueva conversación</div>
      <select class="filter-select" style="margin: 0 14px 10px; width: calc(100% - 28px)" @change="startConversation(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''">
        <option value="">+ Elegir persona...</option>
        <option v-for="p in otherPersonnel" :key="p.id" :value="p.email!">{{ p.name }}</option>
      </select>

      <template v-if="pendingForMe.length">
        <div class="chat-sidebar-section">Tareas sin aceptar ({{ pendingForMe.length }})</div>
        <div v-for="m in pendingForMe" :key="m.id" class="chat-conv" @click="openConversation(m.sender_email)">
          <span class="avatar">{{ initials(personnelName(m.sender_email)) }}</span>
          <div style="min-width: 0">
            <div class="c-name">{{ m.task_title }}</div>
            <div class="c-preview">de {{ personnelName(m.sender_email) }}</div>
          </div>
        </div>
      </template>

      <div class="chat-sidebar-section">Conversaciones</div>
      <div v-if="!conversations.length" style="padding: 0 14px; font-size: 12.5px; color: var(--faint)">Todavía no has hablado con nadie.</div>
      <div
        v-for="c in conversations"
        :key="c.email"
        class="chat-conv"
        :class="{ active: activePeer === c.email }"
        @click="openConversation(c.email)"
      >
        <span class="avatar">{{ initials(personnelName(c.email)) }}</span>
        <div style="min-width: 0">
          <div class="c-name">{{ personnelName(c.email) }}</div>
          <div class="c-preview">{{ c.last ? (c.last.type === "task_request" ? "📋 " + c.last.task_title : c.last.body) : "Nueva conversación" }}</div>
        </div>
      </div>
    </div>

    <div class="chat-main">
      <div v-if="!activePeer" class="chat-empty-thread">Elige una conversación o empieza una nueva</div>
      <template v-else>
        <div class="chat-thread">
          <template v-for="m in threadMessages" :key="m.id">
            <div v-if="m.type === 'text'" class="chat-bubble" :class="m.sender_email === myEmail ? 'mine' : 'theirs'">
              {{ m.body }}
              <span class="b-time">{{ ftime(m.created_at) }}</span>
            </div>
            <div v-else class="chat-task-card" :class="{ mine: m.sender_email === myEmail }">
              <div class="tc-title">📋 {{ m.task_title }}</div>
              <div class="tc-desc">{{ m.task_description }}</div>
              <div class="tc-desc" style="margin-top: 4px">
                <span class="tag" :class="m.task_type === 'Bug' ? 'lead' : 'oportunidad'">{{ m.task_type }}</span>
              </div>
              <div v-if="m.task_response === 'pending' && m.recipient_email === myEmail" class="tc-actions">
                <button class="btn btn-primary btn-sm" @click="acceptTask(m)">Aceptar tarea</button>
                <button class="btn btn-ghost btn-sm" @click="declineTask(m)">Rechazar</button>
              </div>
              <div v-else class="tc-desc" style="margin-top: 8px">
                <span class="tag" :class="m.task_response === 'accepted' ? 'cliente' : m.task_response === 'declined' ? 'inactivo' : 'lead'">
                  {{ m.task_response === "accepted" ? "Aceptada" : m.task_response === "declined" ? "Rechazada" : "Pendiente" }}
                </span>
              </div>
            </div>
          </template>
          <p v-if="!threadMessages.length" style="text-align: center; color: var(--faint); font-size: 12.5px">Todavía no hay mensajes en esta conversación.</p>
        </div>
        <div class="chat-composer">
          <button class="icon-btn" title="Solicitar tarea" @click="showTaskModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <input v-model="newMessageText" type="text" placeholder="Escribe un mensaje..." @keyup.enter="sendMessage" />
          <button class="btn btn-primary" @click="sendMessage">Enviar</button>
        </div>
      </template>
    </div>
  </div>

  <TaskRequestModal v-if="showTaskModal" @close="showTaskModal = false" @send="sendTaskRequest" />
</template>
