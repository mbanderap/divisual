<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useCatalogStore } from "../../stores/catalogs";
import { asyncSearch } from "../../composables/useAsyncSearch";
import { debounce } from "../../lib/format";

const router = useRouter();
const catalogs = useCatalogStore();

const open = ref(false);
const query = ref("");
const inputEl = ref<HTMLInputElement | null>(null);

const contactResults = ref<{ id: number; name: string }[]>([]);
const companyResults = ref<{ id: number; name: string }[]>([]);
const hotelResults = ref<{ id: number; name: string }[]>([]);

const localResults = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return { deals: [], tasks: [], tickets: [], personnel: [] };
  return {
    deals: catalogs.deals.filter((d) => d.name.toLowerCase().includes(q)).slice(0, 6),
    tasks: catalogs.tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 6),
    tickets: catalogs.tickets.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 6),
    personnel: catalogs.personnel.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6),
  };
});

const hasResults = computed(
  () =>
    contactResults.value.length ||
    companyResults.value.length ||
    hotelResults.value.length ||
    localResults.value.deals.length ||
    localResults.value.tasks.length ||
    localResults.value.tickets.length ||
    localResults.value.personnel.length,
);

const runRemote = debounce(async (term: string) => {
  if (term.trim().length < 2) {
    contactResults.value = [];
    companyResults.value = [];
    hotelResults.value = [];
    return;
  }
  const [contacts, companies, hotels] = await Promise.all([
    asyncSearch<{ id: number; name: string }>("contacts", "name", term, "id, name", 6),
    asyncSearch<{ id: number; name: string }>("companies", "name", term, "id, name", 6),
    asyncSearch<{ id: number; name: string }>("hotels", "name", term, "id, name", 6),
  ]);
  contactResults.value = contacts;
  companyResults.value = companies;
  hotelResults.value = hotels;
}, 250);

function onInput() {
  runRemote(query.value);
}

function openPalette() {
  open.value = true;
  query.value = "";
  contactResults.value = [];
  companyResults.value = [];
  hotelResults.value = [];
  nextTick(() => inputEl.value?.focus());
}
function closePalette() {
  open.value = false;
}
function goTo(routeName: string, id: number) {
  closePalette();
  router.push({ name: routeName, query: { open: String(id) } });
}

function onGlobalKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    open.value ? closePalette() : openPalette();
  } else if (e.key === "Escape" && open.value) {
    closePalette();
  }
}
onMounted(() => document.addEventListener("keydown", onGlobalKey));
onUnmounted(() => document.removeEventListener("keydown", onGlobalKey));
</script>

<template>
  <div v-if="open" class="overlay" @click.self="closePalette">
    <div class="cmdk">
      <div class="cmdk-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>
        <input ref="inputEl" v-model="query" type="text" placeholder="Busca contactos, empresas, hoteles, negocios, tareas, tickets, personal..." @input="onInput" />
        <kbd>Esc</kbd>
      </div>
      <div class="cmdk-results">
        <p v-if="!query.trim()" class="cmdk-hint">Escribe al menos 2 letras para buscar en todo divisual.</p>
        <template v-else>
          <div v-if="contactResults.length" class="cmdk-group">
            <div class="cmdk-group-title">Contactos</div>
            <div v-for="r in contactResults" :key="r.id" class="cmdk-opt" @click="goTo('contactos', r.id)">{{ r.name }}</div>
          </div>
          <div v-if="companyResults.length" class="cmdk-group">
            <div class="cmdk-group-title">Empresas</div>
            <div v-for="r in companyResults" :key="r.id" class="cmdk-opt" @click="goTo('empresas', r.id)">{{ r.name }}</div>
          </div>
          <div v-if="hotelResults.length" class="cmdk-group">
            <div class="cmdk-group-title">Hoteles</div>
            <div v-for="r in hotelResults" :key="r.id" class="cmdk-opt" @click="goTo('hoteles', r.id)">{{ r.name }}</div>
          </div>
          <div v-if="localResults.deals.length" class="cmdk-group">
            <div class="cmdk-group-title">Negocios</div>
            <div v-for="r in localResults.deals" :key="r.id" class="cmdk-opt" @click="goTo('negocios', r.id)">{{ r.name }}</div>
          </div>
          <div v-if="localResults.tasks.length" class="cmdk-group">
            <div class="cmdk-group-title">Tareas</div>
            <div v-for="r in localResults.tasks" :key="r.id" class="cmdk-opt" @click="goTo('tablero', r.id)">{{ r.title }}</div>
          </div>
          <div v-if="localResults.tickets.length" class="cmdk-group">
            <div class="cmdk-group-title">Tickets</div>
            <div v-for="r in localResults.tickets" :key="r.id" class="cmdk-opt" @click="goTo('tickets', r.id)">{{ r.title }}</div>
          </div>
          <div v-if="localResults.personnel.length" class="cmdk-group">
            <div class="cmdk-group-title">Personal</div>
            <div v-for="r in localResults.personnel" :key="r.id" class="cmdk-opt" @click="goTo('personal', r.id)">{{ r.name }}</div>
          </div>
          <p v-if="!hasResults" class="cmdk-hint">Sin resultados.</p>
        </template>
      </div>
    </div>
  </div>
</template>
