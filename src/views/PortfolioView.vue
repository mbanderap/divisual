<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useSearchStore } from "../stores/search";
import { useToastStore } from "../stores/toast";
import { supabase } from "../lib/supabase";
import { eur, fdate, num } from "../lib/format";
import { TICKET_STAGES } from "../lib/types";
import type { Hotel } from "../lib/types";

const search = useSearchStore();
const toast = useToastStore();

const localSearch = ref("");
onMounted(() => search.register((v) => (localSearch.value = v.toLowerCase()), "", "Buscar en la cartera por hotel"));
onUnmounted(() => search.unregister());

const rows = ref<Hotel[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from("hotels")
      .select("*, deals_hotels(id, deals(id, name, value, status)), tickets(id, status, created_at)");
    if (error) throw error;
    rows.value = (data ?? []) as Hotel[];
  } catch (e) { toast.error(e, "cargar la cartera"); }
  finally { loading.value = false; }
});

function etapa(h: Hotel): string | null {
  const list = h.tickets ?? [];
  if (!list.length) return null;
  return list.reduce((a, b) => (a.created_at > b.created_at ? a : b)).status;
}
function importe(h: Hotel): number {
  const links = h.deals_hotels ?? [];
  const won = links.find((l) => l.deals?.status === "Ganado");
  const deal = won?.deals ?? links[0]?.deals;
  return deal?.value ?? 0;
}

const filterStage = ref("");
const filterCube = ref("");
const cubeOptions = computed(() => {
  const set = new Set(rows.value.map((h) => h.current_tenth).filter((v): v is number => v != null));
  return Array.from(set).sort((a, b) => a - b);
});

const visible = computed(() => {
  let list = rows.value.filter((h) => {
    if (filterStage.value && etapa(h) !== filterStage.value) return false;
    if (filterCube.value !== "" && h.current_tenth !== Number(filterCube.value)) return false;
    if (localSearch.value && !h.name.toLowerCase().includes(localSearch.value)) return false;
    return true;
  });
  list = [...list].sort((a, b) => {
    const ca = a.current_tenth ?? -1, cb = b.current_tenth ?? -1;
    if (ca !== cb) return ca - cb;
    return importe(b) - importe(a);
  });
  return list;
});
</script>

<template>
  <div class="view-head">
    <div><h1>Cartera activa</h1><div class="view-sub">Resumen de los hoteles cliente: etapa, décimas y facturación</div></div>
  </div>

  <div style="display: flex; gap: 10px; margin-bottom: 14px">
    <select v-model="filterStage" class="filter-select">
      <option value="">Todas las etapas</option>
      <option v-for="s in TICKET_STAGES" :key="s" :value="s">{{ s }}</option>
    </select>
    <select v-model="filterCube" class="filter-select">
      <option value="">Todos los cubos</option>
      <option v-for="c in cubeOptions" :key="c" :value="String(c)">{{ c }}</option>
    </select>
  </div>

  <div v-if="loading" class="loading" style="padding: 14px">Cargando cartera...</div>
  <div v-else class="card table-wrap">
    <table>
      <thead>
        <tr>
          <th>Hotel</th>
          <th>Etapa</th>
          <th>Cubo</th>
          <th>Importe</th>
          <th>Contratadas</th>
          <th>Restantes</th>
          <th>Factura</th>
          <th>Últ. mod.</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in visible" :key="h.id">
          <td>{{ h.name }}</td>
          <td><span v-if="etapa(h)" class="tag oportunidad">{{ etapa(h) }}</span><span v-else>—</span></td>
          <td class="num">{{ h.current_tenth ?? "—" }}</td>
          <td class="num">{{ eur(importe(h)) }}</td>
          <td class="num">{{ h.contracted_tenths ?? "—" }}</td>
          <td class="num">{{ h.remaining_tenths != null ? num(h.remaining_tenths, 1) : "—" }}</td>
          <td>{{ h.invoiced ? "Sí" : "No" }}</td>
          <td class="num">{{ fdate(h.updated_at) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="!visible.length" class="card empty"><div class="e-title">Sin resultados</div><p>Ajusta los filtros o crea hoteles en el módulo de Hoteles.</p></div>
  </div>
</template>
