<script setup lang="ts">
import { ref } from "vue";
import Modal from "../ui/Modal.vue";
import ComboSingle from "../ui/ComboSingle.vue";
import MultiPicker from "../ui/MultiPicker.vue";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { useConfirmStore } from "../../stores/confirm";
import { syncBridge } from "../../lib/syncBridge";
import { nn, fdate } from "../../lib/format";
import { TICKET_STAGES } from "../../lib/types";
import type { Ticket, Contact, Company, Personnel, Hotel } from "../../lib/types";

const props = defineProps<{ ticket?: Ticket | null }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const toast = useToastStore();
const confirm = useConfirmStore();

const title = ref(props.ticket?.title ?? "");
const status = ref(props.ticket?.status ?? "Por iniciar");
const planEndDate = ref(props.ticket?.plan_end_date ?? "");
const companyId = ref<number | null>(props.ticket?.company_id ?? null);
const ownerId = ref<number | null>(props.ticket?.owner_id ?? null);
const hotelId = ref<number | null>(props.ticket?.hotel_id ?? null);
const linkedContacts = ref(
  (props.ticket?.tickets_contacts ?? []).map((tc) => ({ id: tc.contacts!.id, label: tc.contacts!.name })).filter((x) => x.id),
);
const saving = ref(false);

async function save() {
  if (!title.value.trim()) { toast.show("El título es obligatorio."); return; }
  saving.value = true;
  try {
    const row = {
      title: title.value.trim(), status: status.value,
      plan_end_date: nn(planEndDate.value), company_id: companyId.value, owner_id: ownerId.value, hotel_id: hotelId.value,
    };
    let id = props.ticket?.id;
    if (props.ticket) {
      const { error } = await supabase.from("tickets").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("tickets").insert(row).select("id");
      if (error) throw error;
      id = data[0].id;
    }
    await syncBridge("tickets_contacts", "ticket_id", id!, linkedContacts.value.map((c) => ({ ticket_id: id, contact_id: c.id })));
    toast.show(props.ticket ? "Ticket actualizado" : "Ticket creado");
    emit("saved");
  } catch (e) { toast.error(e, "guardar el ticket"); }
  finally { saving.value = false; }
}

async function remove() {
  if (!props.ticket) return;
  const ok = await confirm.ask(`Se eliminará el ticket "${props.ticket.title}".`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("tickets").delete().eq("id", props.ticket.id);
    if (error) throw error;
    toast.show("Ticket eliminado");
    emit("saved");
  } catch (e) { toast.error(e, "eliminar el ticket"); }
}
</script>

<template>
  <Modal @close="emit('close')">
    <h2>{{ ticket ? "Editar ticket" : "Nuevo ticket" }}</h2>
    <div class="field"><label>Título</label><input v-model="title" type="text" placeholder="Ej. Onboarding Hotel X" /></div>
    <div class="field-row">
      <div class="field">
        <label>Etapa</label>
        <select v-model="status"><option v-for="s in TICKET_STAGES" :key="s" :value="s">{{ s }}</option></select>
      </div>
      <div class="field"><label>Fin de plan</label><input v-model="planEndDate" type="date" /></div>
    </div>
    <div class="field-row-3">
      <ComboSingle
        v-model="companyId"
        label="Empresa asociada"
        table="companies"
        search-col="name"
        select-cols="id, name"
        :label-fn="(r: Company) => r.name"
        :initial-label="ticket?.companies?.name"
      />
      <ComboSingle
        v-model="ownerId"
        label="Propietario"
        table="personnel"
        search-col="name"
        select-cols="id, name"
        :label-fn="(r: Personnel) => r.name"
        :initial-label="ticket?.personnel?.name"
      />
      <ComboSingle
        v-model="hotelId"
        label="Hotel asociado"
        table="hotels"
        search-col="name"
        select-cols="id, name"
        :label-fn="(r: Hotel) => r.name"
        :initial-label="ticket?.hotels?.name"
      />
    </div>
    <MultiPicker
      v-model="linkedContacts"
      label="Contactos asociados"
      table="contacts"
      search-col="name"
      select-cols="id, name"
      :label-fn="(r: Contact) => r.name"
    />
    <div v-if="ticket" class="field"><label>Creado</label><div class="readonly-value">{{ fdate(ticket.created_at) }}</div></div>
    <div class="modal-foot">
      <button v-if="ticket" class="btn btn-danger" style="margin-right: auto" @click="remove">Eliminar</button>
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
