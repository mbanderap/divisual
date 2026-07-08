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
const hasPlan = ref(String(props.hotel?.has_plan ?? false));
const planEndDate = ref(props.hotel?.plan_end_date ?? "");
const tau = ref<string>(props.hotel?.tau != null ? String(props.hotel.tau) : "");
const contractedTenths = ref<string>(props.hotel?.contracted_tenths != null ? String(props.hotel.contracted_tenths) : "");
const currentTenth = ref<string>(props.hotel?.current_tenth != null ? String(props.hotel.current_tenth) : "");
const currentIj = ref<string>(props.hotel?.current_ij != null ? String(props.hotel.current_ij) : "");
const objective = ref<string>(props.hotel?.objective != null ? String(props.hotel.objective) : "");
const deviationDays = ref<string>(props.hotel?.deviation_days != null ? String(props.hotel.deviation_days) : "");
const deviationPct = ref<string>(props.hotel?.deviation_pct != null ? String(props.hotel.deviation_pct) : "");
const remainingTenths = ref<string>(props.hotel?.remaining_tenths != null ? String(props.hotel.remaining_tenths) : "");
const invoiced = ref(String(props.hotel?.invoiced ?? false));
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
      name: name.value.trim(), has_plan: hasPlan.value === "true", plan_end_date: nn(planEndDate.value),
      tau: nnum(tau.value), contracted_tenths: nnum(contractedTenths.value), current_tenth: nnum(currentTenth.value),
      current_ij: nnum(currentIj.value), objective: nnum(objective.value),
      deviation_days: deviationDays.value === "" ? null : parseInt(deviationDays.value), deviation_pct: nnum(deviationPct.value),
      remaining_tenths: nnum(remainingTenths.value), invoiced: invoiced.value === "true",
      updated_at: new Date().toISOString(),
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
    <div class="field-row">
      <div class="field"><label>Plan de gestión</label><select v-model="hasPlan"><option value="true">Plan activo</option><option value="false">Sin plan</option></select></div>
      <div class="field"><label>Fin del plan</label><input v-model="planEndDate" type="date" /></div>
    </div>
    <div class="field-row-3">
      <div class="field"><label>TAU</label><input v-model="tau" type="number" /></div>
      <div class="field"><label>Décimas contratadas</label><input v-model="contractedTenths" type="number" /></div>
      <div class="field"><label>Décima actual</label><input v-model="currentTenth" type="number" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>IJ actual</label><input v-model="currentIj" type="number" /></div>
      <div class="field"><label>Objetivo</label><input v-model="objective" type="number" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Desviación (días)</label><input v-model="deviationDays" type="number" /></div>
      <div class="field"><label>Desviación (%)</label><input v-model="deviationPct" type="number" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Décimas restantes por consolidar</label><input v-model="remainingTenths" type="number" /></div>
      <div class="field"><label>Factura de la década actual</label><select v-model="invoiced"><option value="false">No</option><option value="true">Sí</option></select></div>
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
