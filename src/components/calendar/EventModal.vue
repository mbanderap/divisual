<script setup lang="ts">
import { ref } from "vue";
import Modal from "../ui/Modal.vue";
import MultiPicker from "../ui/MultiPicker.vue";
import RecurrencePicker from "../ui/RecurrencePicker.vue";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { useConfirmStore } from "../../stores/confirm";
import { syncBridge } from "../../lib/syncBridge";
import { nn } from "../../lib/format";
import { EVENT_CATEGORIES } from "../../lib/types";
import type { Recurrence } from "../../lib/recurrence";
import type { CalendarEvent, Personnel } from "../../lib/types";

const props = defineProps<{ event?: CalendarEvent | null; defaultDate?: string; defaultCategory?: string; allowedCategories?: string[] }>();
const emit = defineEmits<{ close: []; saved: [] }>();

const toast = useToastStore();
const confirm = useConfirmStore();

const title = ref(props.event?.title ?? "");
const category = ref(props.event?.category ?? props.defaultCategory ?? EVENT_CATEGORIES[0]);
const startDate = ref(props.event?.start_date ?? props.defaultDate ?? "");
const endDate = ref(props.event?.end_date ?? "");
const startTime = ref(props.event?.start_time?.slice(0, 5) ?? "");
const endTime = ref(props.event?.end_time?.slice(0, 5) ?? "");
const description = ref(props.event?.description ?? "");
const recurrence = ref<Recurrence | null>((props.event?.recurrence as Recurrence) ?? null);
const recurrenceDay = ref<number | null>(props.event?.recurrence_day ?? null);
const linkedPeople = ref(
  (props.event?.events_personnel ?? []).map((l) => ({ id: l.personnel!.id, label: l.personnel!.name })).filter((x) => x.id),
);
const saving = ref(false);

async function save() {
  if (!title.value.trim()) { toast.show("El título es obligatorio."); return; }
  if (!startDate.value) { toast.show("La fecha de inicio es obligatoria."); return; }
  if (recurrence.value && recurrenceDay.value == null) { toast.show("Elige el día de la repetición."); return; }
  saving.value = true;
  try {
    const row = {
      title: title.value.trim(), category: category.value,
      start_date: startDate.value, end_date: nn(endDate.value),
      start_time: nn(startTime.value), end_time: nn(endTime.value),
      description: nn(description.value),
      recurrence: recurrence.value, recurrence_day: recurrence.value ? recurrenceDay.value : null,
    };
    let id = props.event?.id;
    if (props.event) {
      const { error } = await supabase.from("events").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("events").insert(row).select("id");
      if (error) throw error;
      id = data[0].id;
    }
    await syncBridge("events_personnel", "event_id", id!, linkedPeople.value.map((p) => ({ event_id: id, personnel_id: p.id })));
    toast.show(props.event ? "Evento actualizado" : "Evento creado");
    emit("saved");
  } catch (e) { toast.error(e, "guardar el evento"); }
  finally { saving.value = false; }
}

async function remove() {
  if (!props.event) return;
  const ok = await confirm.ask(`Se eliminará el evento "${props.event.title}".`);
  if (!ok) return;
  try {
    const { error } = await supabase.from("events").delete().eq("id", props.event.id);
    if (error) throw error;
    toast.show("Evento eliminado");
    emit("saved");
  } catch (e) { toast.error(e, "eliminar el evento"); }
}
</script>

<template>
  <Modal width="520px" @close="emit('close')">
    <h2>{{ event ? "Editar evento" : "Nuevo evento" }}</h2>
    <div class="field"><label>Título</label><input v-model="title" type="text" placeholder="Qué es" /></div>
    <div class="field-row">
      <div class="field">
        <label>Categoría</label>
        <select v-model="category"><option v-for="c in (event ? EVENT_CATEGORIES : (allowedCategories ?? EVENT_CATEGORIES))" :key="c" :value="c">{{ c }}</option></select>
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Fecha de inicio</label><input v-model="startDate" type="date" /></div>
      <div class="field">
        <label>{{ recurrence ? "Repetir hasta (opcional)" : "Fecha de fin (opcional)" }}</label>
        <input v-model="endDate" type="date" />
      </div>
    </div>
    <div class="field-row">
      <div class="field"><label>Hora de inicio (opcional)</label><input v-model="startTime" type="time" /></div>
      <div class="field"><label>Hora de fin (opcional)</label><input v-model="endTime" type="time" /></div>
    </div>
    <RecurrencePicker
      :recurrence="recurrence"
      :day="recurrenceDay"
      @update:recurrence="recurrence = $event"
      @update:day="recurrenceDay = $event"
    />
    <div class="field"><label>Descripción</label><textarea v-model="description" placeholder="Detalles del evento"></textarea></div>
    <MultiPicker
      v-model="linkedPeople"
      label="Personas asociadas"
      table="personnel"
      search-col="name"
      select-cols="id, name"
      :label-fn="(r: Personnel) => r.name"
    />
    <div class="modal-foot">
      <button v-if="event" class="btn btn-danger" style="margin-right: auto" @click="remove">Eliminar</button>
      <button class="btn btn-ghost" @click="emit('close')">Cancelar</button>
      <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando..." : "Guardar" }}</button>
    </div>
  </Modal>
</template>
