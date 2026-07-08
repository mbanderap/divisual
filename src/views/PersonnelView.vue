<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useCatalogStore } from "../stores/catalogs";
import { useSearchStore } from "../stores/search";
import { useToastStore } from "../stores/toast";
import { useConfirmStore } from "../stores/confirm";
import { supabase } from "../lib/supabase";
import Avatar from "../components/ui/Avatar.vue";
import PersonnelModal from "../components/personnel/PersonnelModal.vue";
import type { Personnel } from "../lib/types";

const catalogs = useCatalogStore();
const search = useSearchStore();
const toast = useToastStore();
const confirm = useConfirmStore();

const localSearch = ref("");
onMounted(() => search.register((v) => (localSearch.value = v.toLowerCase()), "", "Buscar personal por nombre o correo"));
onUnmounted(() => search.unregister());

const rows = computed(() =>
  catalogs.personnel.filter((p) => {
    if (!localSearch.value) return true;
    const haystack = [p.name, p.email, ...(p.hotels_personnel || []).map((a) => a.hotels?.name)].join(" ").toLowerCase();
    return haystack.includes(localSearch.value);
  }),
);

const showModal = ref(false);
const editing = ref<Personnel | null>(null);
function openNew() { editing.value = null; showModal.value = true; }
function openEdit(p: Personnel) { editing.value = p; showModal.value = true; }
function onSaved() { showModal.value = false; catalogs.loadCatalogs(); }
async function onDelete(p: Personnel) {
  const ok = await confirm.ask(`Se eliminará a ${p.name} y sus asignaciones a hoteles.`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("personnel").delete().eq("id", p.id);
    if (error) throw error;
    toast.show("Persona eliminada");
    catalogs.loadCatalogs();
  } catch (e) { toast.error(e, "eliminar a la persona"); }
}
</script>

<template>
  <div class="view-head">
    <div><h1>Personal</h1><div class="view-sub">{{ rows.length }} personas · las asignaciones a hoteles se gestionan desde la ficha de cada hotel</div></div>
    <button class="btn btn-primary" @click="openNew">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      Nueva persona
    </button>
  </div>

  <div class="card table-wrap" v-if="rows.length">
    <table>
      <thead><tr><th>Persona</th><th>Teléfono</th><th>Hoteles asignados</th><th style="width: 80px"></th></tr></thead>
      <tbody>
        <tr v-for="p in rows" :key="p.id" @click="openEdit(p)">
          <td><div class="cell-person"><Avatar :name="p.name" /><div><div class="p-name">{{ p.name }}</div><div class="p-sub">{{ p.email || "" }}</div></div></div></td>
          <td class="num">{{ p.phone || "—" }}</td>
          <td>
            <template v-if="(p.hotels_personnel || []).length">
              <span v-for="(a, i) in p.hotels_personnel" :key="i" class="tag chip">{{ a.hotels?.name }}{{ a.role ? " · " + a.role : "" }}</span>
            </template>
            <span v-else style="color: var(--faint)">Sin asignaciones</span>
          </td>
          <td>
            <div class="row-actions">
              <button class="mini-btn" title="Editar" @click.stop="openEdit(p)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/></svg>
              </button>
              <button class="mini-btn del" title="Eliminar" @click.stop="onDelete(p)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></svg>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="card empty"><div class="e-title">Sin resultados</div><p>Ajusta la búsqueda o crea una persona nueva.</p></div>

  <PersonnelModal v-if="showModal" :person="editing" @close="showModal = false" @saved="onSaved" />
</template>
