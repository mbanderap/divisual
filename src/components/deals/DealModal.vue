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
const legalCompanyName = ref(props.deal?.legal_company_name ?? "");
const legalBusinessName = ref(props.deal?.legal_business_name ?? "");
const registeredAddress = ref(props.deal?.registered_address ?? "");
const taxId = ref(props.deal?.tax_id ?? "");
const legalRepName = ref(props.deal?.legal_rep_name ?? "");
const legalRepId = ref(props.deal?.legal_rep_id ?? "");
const contractSigned = ref(String(props.deal?.contract_signed ?? false));
const monthlyFee = ref<string>(props.deal?.monthly_fee != null ? String(props.deal.monthly_fee) : "");
const billingContactName = ref(props.deal?.billing_contact_name ?? "");
const proposalAttachmentUrl = ref(props.deal?.proposal_attachment_url ?? "");
const proposalAttachmentName = ref(props.deal?.proposal_attachment_name ?? "");
const proposalFile = ref<File | null>(null);
const uploadingFile = ref(false);
const saving = ref(false);

function onProposalFileChange(e: Event) {
  proposalFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}

async function save() {
  if (!name.value.trim()) { toast.show("El nombre es obligatorio."); return; }
  saving.value = true;
  try {
    if (proposalFile.value) {
      uploadingFile.value = true;
      const file = proposalFile.value;
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("deal-attachments").upload(path, file);
      if (upErr) throw upErr;
      proposalAttachmentUrl.value = supabase.storage.from("deal-attachments").getPublicUrl(path).data.publicUrl;
      proposalAttachmentName.value = file.name;
    }
    const row = {
      name: name.value.trim(), status: status.value, value: nnum(value.value),
      closing_date: nn(closingDate.value), start_date: nn(startDate.value), end_date: nn(endDate.value),
      type_of_charge: nn(typeOfCharge.value), contact_id: contactId.value,
      billing_model: billingModel.value ? parseInt(billingModel.value) : null,
      legal_company_name: nn(legalCompanyName.value.trim()), legal_business_name: nn(legalBusinessName.value.trim()),
      registered_address: nn(registeredAddress.value.trim()), tax_id: nn(taxId.value.trim()),
      legal_rep_name: nn(legalRepName.value.trim()), legal_rep_id: nn(legalRepId.value.trim()),
      contract_signed: contractSigned.value === "true", monthly_fee: nnum(monthlyFee.value),
      billing_contact_name: nn(billingContactName.value.trim()),
      proposal_attachment_url: nn(proposalAttachmentUrl.value), proposal_attachment_name: nn(proposalAttachmentName.value),
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
  finally { saving.value = false; uploadingFile.value = false; }
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
    <div class="field-row">
      <div class="field">
        <label>Tipo de contrato</label>
        <select v-model="typeOfCharge">
          <option value="">Sin definir</option>
          <option v-for="t in CHARGE_TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div class="field"><label>Cuota mensual</label><input v-model="monthlyFee" type="number" placeholder="0" /></div>
    </div>
    <MultiPicker
      v-model="linkedHotels"
      label="Hoteles vinculados"
      table="hotels"
      search-col="name"
      select-cols="id, name"
      :label-fn="(r: Hotel) => r.name"
    />

    <h4>Datos de la oferta / contrato</h4>
    <div class="field-row">
      <div class="field"><label>Nombre de la sociedad</label><input v-model="legalCompanyName" type="text" /></div>
      <div class="field"><label>Razón Social</label><input v-model="legalBusinessName" type="text" /></div>
    </div>
    <div class="field"><label>Domicilio social</label><input v-model="registeredAddress" type="text" /></div>
    <div class="field-row">
      <div class="field"><label>NIF</label><input v-model="taxId" type="text" /></div>
      <div class="field"><label>Contrato firmado</label><select v-model="contractSigned"><option value="false">No</option><option value="true">Sí</option></select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Nombre y apellidos del representante legal</label><input v-model="legalRepName" type="text" /></div>
      <div class="field"><label>DNI del representante legal</label><input v-model="legalRepId" type="text" /></div>
    </div>
    <div class="field"><label>Persona a la que se envía la factura</label><input v-model="billingContactName" type="text" /></div>
    <div class="field">
      <label>Adjunto de oferta presentada</label>
      <div v-if="proposalAttachmentUrl" style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px">
        <a :href="proposalAttachmentUrl" target="_blank" rel="noopener" style="color: var(--accent)">{{ proposalAttachmentName || "Ver adjunto" }}</a>
      </div>
      <input type="file" @change="onProposalFileChange" />
      <p v-if="uploadingFile" style="font-size: 12.5px; color: var(--faint)">Subiendo archivo...</p>
    </div>

    <div class="modal-foot">
      <button v-if="deal" class="btn btn-danger" style="margin-right: auto" @click="remove">Eliminar</button>
      <a v-if="deal" class="btn btn-ghost" :href="`/negocios/${deal.id}/propuesta`" target="_blank" rel="noopener">Ver propuesta</a>
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
