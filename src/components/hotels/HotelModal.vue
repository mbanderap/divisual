<script setup lang="ts">
import { ref } from "vue";
import Modal from "../ui/Modal.vue";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { useCatalogStore } from "../../stores/catalogs";
import { nn, nnum, initials } from "../../lib/format";
import type { Hotel, HotelPersonnelLink } from "../../lib/types";

const props = defineProps<{ hotel?: Hotel | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const toast = useToastStore();
const catalogs = useCatalogStore();

const name = ref(props.hotel?.name ?? "");
const isClient = ref(String(props.hotel?.is_client ?? false));
const planEndDate = ref(props.hotel?.plan_end_date ?? "");
const tau = ref<string>(props.hotel?.tau != null ? String(props.hotel.tau) : "");
const currentIj = ref<string>(props.hotel?.current_ij != null ? String(props.hotel.current_ij) : "");
const objective = ref<string>(props.hotel?.objective != null ? String(props.hotel.objective) : "");
const deviationDays = ref<string>(props.hotel?.deviation_days != null ? String(props.hotel.deviation_days) : "");
const deviationPct = ref<string>(props.hotel?.deviation_pct != null ? String(props.hotel.deviation_pct) : "");
const jaippyId = ref<string>(props.hotel?.jaippy_id != null ? String(props.hotel.jaippy_id) : "");
const incomeCurrentMonth = ref<string>(props.hotel?.income_current_month != null ? String(props.hotel.income_current_month) : "");
const incomeNextMonth = ref<string>(props.hotel?.income_next_month != null ? String(props.hotel.income_next_month) : "");
const numRooms = ref<string>(props.hotel?.num_rooms != null ? String(props.hotel.num_rooms) : "");
const adr = ref<string>(props.hotel?.adr != null ? String(props.hotel.adr) : "");
const bookingUrl = ref(props.hotel?.booking_url ?? "");
const stars = ref<string>(props.hotel?.stars != null ? String(props.hotel.stars) : "");
const category = ref(props.hotel?.category ?? "");
const isChain = ref(String(props.hotel?.is_chain ?? false));
const pms = ref(props.hotel?.pms ?? "");
const city = ref(props.hotel?.city ?? "");
const postalCode = ref(props.hotel?.postal_code ?? "");
const address = ref(props.hotel?.address ?? "");
const description = ref(props.hotel?.description ?? "");
const saving = ref(false);

const assignments = ref<HotelPersonnelLink[]>([...(props.hotel?.hotels_personnel ?? [])]);
const assignPersId = ref<string>(catalogs.personnel[0] ? String(catalogs.personnel[0].id) : "");
const assignRole = ref("");
const assignArea = ref("");

async function addAssignment() {
  if (!props.hotel || !assignPersId.value) return;
  const pid = parseInt(assignPersId.value);
  if (assignments.value.some((a) => a.personnel?.id === pid)) { toast.show("Esa persona ya está asignada a este hotel."); return; }
  try {
    const role = nn(assignRole.value.trim()), area = nn(assignArea.value.trim());
    const { error } = await supabase.from("hotels_personnel").insert({ id_hotel: props.hotel.id, id_personnel: pid, role, area });
    if (error) throw error;
    const p = catalogs.personnel.find((x) => x.id === pid);
    assignments.value.push({ role, area, personnel: { id: pid, name: p!.name, email: p!.email } });
    assignRole.value = ""; assignArea.value = "";
    toast.show("Persona asignada");
  } catch (e) { toast.error(e, "asignar a la persona"); }
}
async function removeAssignment(pid: number) {
  if (!props.hotel) return;
  try {
    const { error } = await supabase.from("hotels_personnel").delete().eq("id_hotel", props.hotel.id).eq("id_personnel", pid);
    if (error) throw error;
    assignments.value = assignments.value.filter((a) => a.personnel?.id !== pid);
    toast.show("Asignación eliminada");
  } catch (e) { toast.error(e, "quitar la asignación"); }
}

async function save() {
  if (!name.value.trim()) { toast.show("El nombre es obligatorio."); return; }
  saving.value = true;
  try {
    const row = {
      name: name.value.trim(), is_client: isClient.value === "true", plan_end_date: nn(planEndDate.value),
      tau: nnum(tau.value), current_ij: nnum(currentIj.value), objective: nnum(objective.value),
      deviation_days: deviationDays.value === "" ? null : parseInt(deviationDays.value), deviation_pct: nnum(deviationPct.value),
      updated_at: new Date().toISOString(),
      jaippy_id: jaippyId.value === "" ? null : parseInt(jaippyId.value),
      income_current_month: nnum(incomeCurrentMonth.value), income_next_month: nnum(incomeNextMonth.value),
      num_rooms: numRooms.value === "" ? null : parseInt(numRooms.value), adr: nnum(adr.value),
      booking_url: nn(bookingUrl.value.trim()),
      stars: stars.value === "" ? null : parseInt(stars.value), category: nn(category.value.trim()),
      is_chain: isChain.value === "true", pms: nn(pms.value.trim()),
      city: nn(city.value.trim()), postal_code: nn(postalCode.value.trim()), address: nn(address.value.trim()),
      description: nn(description.value.trim()),
    };
    const { error } = props.hotel
      ? await supabase.from("hotels").update(row).eq("id", props.hotel.id)
      : await supabase.from("hotels").insert(row);
    if (error) throw error;
    toast.show(props.hotel ? "Hotel actualizado" : "Hotel creado");
    emit("saved");
  } catch (e) { toast.error(e, "guardar el hotel"); }
  finally { saving.value = false; }
}
</script>

<template>
  <Modal @close="emit('close')">
    <h2>{{ hotel ? "Editar hotel" : "Nuevo hotel" }}</h2>
    <div class="field"><label>Nombre del hotel</label><input v-model="name" type="text" placeholder="Nombre comercial" /></div>
    <div class="field-row-3">
      <div class="field"><label>Nº de habitaciones</label><input v-model="numRooms" type="number" /></div>
      <div class="field"><label>ADR</label><input v-model="adr" type="number" /></div>
      <div class="field"><label>Nº estrellas</label><input v-model="stars" type="number" min="0" max="7" /></div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Categoría</label>
        <input v-model="category" type="text" placeholder="Hotel, apartamento..." />
      </div>
      <div class="field"><label>Cadena</label><select v-model="isChain"><option value="false">No</option><option value="true">Sí</option></select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>PMS</label><input v-model="pms" type="text" placeholder="Sistema de gestión hotelera" /></div>
      <div class="field"><label>ID Jaippy</label><input v-model="jaippyId" type="number" placeholder="id en public.hoteles" /></div>
    </div>
    <div class="field-row-3">
      <div class="field"><label>Ciudad</label><input v-model="city" type="text" /></div>
      <div class="field"><label>Código postal</label><input v-model="postalCode" type="text" /></div>
      <div class="field"><label>Dirección</label><input v-model="address" type="text" /></div>
    </div>
    <div class="field"><label>URL booking</label><input v-model="bookingUrl" type="text" placeholder="https://..." /></div>
    <div class="field"><label>Descripción del hotel</label><textarea v-model="description" placeholder="Descripción libre"></textarea></div>
    <div class="field-row">
      <div class="field"><label>Cliente</label><select v-model="isClient"><option value="true">Sí</option><option value="false">No</option></select></div>
      <div class="field"><label>Fin del plan</label><input v-model="planEndDate" type="date" /></div>
    </div>
    <div class="field-row-3">
      <div class="field"><label>TAU</label><input v-model="tau" type="number" /></div>
      <div class="field"><label>IJ actual</label><input v-model="currentIj" type="number" /></div>
      <div class="field"><label>Objetivo</label><input v-model="objective" type="number" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Desviación (días)</label><input v-model="deviationDays" type="number" /></div>
      <div class="field"><label>Desviación (%)</label><input v-model="deviationPct" type="number" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Ingresos mes actual</label><input v-model="incomeCurrentMonth" type="number" /></div>
      <div class="field"><label>Ingresos mes siguiente</label><input v-model="incomeNextMonth" type="number" /></div>
    </div>
    <template v-if="hotel">
      <h4>Equipo asignado</h4>
      <div>
        <p v-if="!assignments.length" style="font-size: 12.5px; color: var(--faint)">Nadie asignado todavía.</p>
        <div v-for="a in assignments" :key="a.personnel?.id" class="assign-row">
          <span class="avatar">{{ initials(a.personnel?.name) }}</span>
          <div class="a-main">
            <div style="font-weight: 600">{{ a.personnel?.name }}</div>
            <div class="a-sub">{{ [a.role, a.area].filter(Boolean).join(" · ") || "Sin rol definido" }}</div>
          </div>
          <button class="mini-btn del" title="Quitar" @click="removeAssignment(a.personnel!.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></svg>
          </button>
        </div>
      </div>
      <div class="add-assign">
        <select v-model="assignPersId">
          <option v-if="!catalogs.personnel.length" value="">Crea personal primero</option>
          <option v-for="p in catalogs.personnel" :key="p.id" :value="String(p.id)">{{ p.name }}</option>
        </select>
        <input v-model="assignRole" placeholder="Rol" />
        <input v-model="assignArea" placeholder="Área" />
        <button class="btn btn-ghost btn-sm" @click="addAssignment">Añadir</button>
      </div>
    </template>

    <div class="modal-foot">
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
