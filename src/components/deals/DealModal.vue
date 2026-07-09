<script setup lang="ts">
import { ref } from "vue";
import Modal from "../ui/Modal.vue";
import ComboSingle from "../ui/ComboSingle.vue";
import MultiPicker from "../ui/MultiPicker.vue";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/auth";
import { useToastStore } from "../../stores/toast";
import { useConfirmStore } from "../../stores/confirm";
import { useCatalogStore } from "../../stores/catalogs";
import { syncBridge } from "../../lib/syncBridge";
import { nn, nnum } from "../../lib/format";
import { DEAL_STAGES, CHARGE_TYPES } from "../../lib/types";
import type { Deal, Contact, Hotel } from "../../lib/types";

const props = defineProps<{ deal?: Deal | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const auth = useAuthStore();
const toast = useToastStore();
const confirm = useConfirmStore();
const catalogs = useCatalogStore();

const name = ref(props.deal?.name ?? "");
const status = ref(props.deal?.status ?? "Prospecto");
const value = ref<string>(props.deal?.value != null ? String(props.deal.value) : "");
const contactId = ref<number | null>(props.deal?.contact_id ?? null);
const billingModel = ref<string>(props.deal?.billing_model != null ? String(props.deal.billing_model) : "");
const closingDate = ref(props.deal?.closing_date ?? "");
const startDate = ref(props.deal?.start_date ?? "");
const endDate = ref(props.deal?.end_date ?? "");
const typeOfCharge = ref(props.deal?.type_of_charge ?? "");
const linkedHotels = ref((props.deal?.deals_hotels ?? []).map((dh) => ({ id: dh.hotels!.id, label: dh.hotels!.name })).filter((x) => x.id));
const saving = ref(false);

async function save() {
  if (!name.value.trim()) { toast.show("El nombre es obligatorio."); return; }
  saving.value = true;
  try {
    const row = {
      name: name.value.trim(), status: status.value, value: nnum(value.value),
      closing_date: nn(closingDate.value), start_date: nn(startDate.value), end_date: nn(endDate.value),
      type_of_charge: nn(typeOfCharge.value), contact_id: contactId.value,
      billing_model: billingModel.value ? parseInt(billingModel.value) : null,
      created_by: auth.session?.user.id,
    };
    let id = props.deal?.id;
    if (props.deal) {
      const { error } = await supabase.from("deals").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("deals").insert(row).select("id");
      if (error) throw error;
      id = data[0].id;
    }
    await syncBridge("deals_hotels", "deal_id", id!, linkedHotels.value.map((h) => ({ deal_id: id, hotel_id: h.id })));
    toast.show(props.deal ? "Negocio actualizado" : "Negocio creado");
    emit("saved");
  } catch (e) { toast.error(e, "guardar el negocio"); }
  finally { saving.value = false; }
}

async function remove() {
  if (!props.deal) return;
  const ok = await confirm.ask(`Se eliminará el negocio "${props.deal.name}".`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("deals").delete().eq("id", props.deal.id);
    if (error) throw error;
    toast.show("Negocio eliminado");
    emit("saved");
  } catch (e) { toast.error(e, "eliminar el negocio"); }
}
</script>

<template>
  <Modal @close="emit('close')">
    <h2>{{ deal ? "Editar negocio" : "Nuevo negocio" }}</h2>
    <div class="field"><label>Nombre del negocio</label><input v-model="name" type="text" placeholder="Qué se está vendiendo" /></div>
    <div class="field-row">
      <div class="field">
        <label>Etapa</label>
        <select v-model="status"><option v-for="s in DEAL_STAGES" :key="s" :value="s">{{ s }}</option></select>
      </div>
      <div class="field"><label>Valor (EUR)</label><input v-model="value" type="number" placeholder="0" /></div>
    </div>
    <div class="field-row">
      <ComboSingle
        v-model="contactId"
        label="Contacto"
        table="contacts"
        search-col="name"
        select-cols="id, name"
        :label-fn="(r: Contact) => r.name"
        :initial-label="deal?.contacts?.name"
      />
      <div class="field">
        <label>Modelo de facturación</label>
        <select v-model="billingModel">
          <option value="">Sin modelo</option>
          <option v-for="b in catalogs.billing" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
        </select>
      </div>
    </div>
    <div class="field-row-3">
      <div class="field"><label>Cierre previsto</label><input v-model="closingDate" type="date" /></div>
      <div class="field"><label>Inicio del servicio</label><input v-model="startDate" type="date" /></div>
      <div class="field"><label>Fin del servicio</label><input v-model="endDate" type="date" /></div>
    </div>
    <div class="field">
      <label>Tipo de cargo</label>
      <select v-model="typeOfCharge">
        <option value="">Sin definir</option>
        <option v-for="t in CHARGE_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>
    <MultiPicker
      v-model="linkedHotels"
      label="Hoteles vinculados"
      table="hotels"
      search-col="name"
      select-cols="id, name"
      :label-fn="(r: Hotel) => r.name"
    />
    <div class="modal-foot">
      <button v-if="deal" class="btn btn-danger" style="margin-right: auto" @click="remove">Eliminar</button>
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
