<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "../../lib/supabase";
import { useToastStore } from "../../stores/toast";
import { fdate } from "../../lib/format";
import type { Deal, Contact, ContactHistorial, Hotel } from "../../lib/types";

const props = defineProps<{ deal: Deal }>();
const emit = defineEmits<{ close: [] }>();

const toast = useToastStore();
const loading = ref(true);
const contact = ref<Contact | null>(null);
const historial = ref<ContactHistorial[]>([]);
const hotels = ref<Hotel[]>([]);

onMounted(async () => {
  try {
    const hotelIds = (props.deal.deals_hotels ?? []).map((dh) => dh.hotels?.id).filter((x): x is number => !!x);
    const [contactRes, historialRes, hotelsRes] = await Promise.all([
      props.deal.contact_id
        ? supabase.from("contacts").select("*, contacts_companies(id, role, companies(id, name, phone))").eq("id", props.deal.contact_id).single()
        : Promise.resolve({ data: null, error: null }),
      props.deal.contact_id
        ? supabase.from("contacts_historial").select("*").eq("contact_id", props.deal.contact_id).order("created_at", { ascending: false }).limit(10)
        : Promise.resolve({ data: [], error: null }),
      hotelIds.length ? supabase.from("hotels").select("id, name, city, stars, category, is_client").in("id", hotelIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (contactRes.error) throw contactRes.error;
    if (historialRes.error) throw historialRes.error;
    if (hotelsRes.error) throw hotelsRes.error;
    contact.value = contactRes.data as Contact | null;
    historial.value = (historialRes.data ?? []) as ContactHistorial[];
    hotels.value = (hotelsRes.data ?? []) as Hotel[];
  } catch (e) {
    toast.error(e, "cargar la vista previa");
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="drawer-backdrop" @click="emit('close')">
    <div class="drawer-panel" @click.stop>
      <div class="drawer-head">
        <h3>{{ deal.name }}</h3>
        <button class="mini-btn" title="Cerrar" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div v-if="loading" class="loading" style="padding: 20px">Cargando...</div>
      <template v-else>
        <div class="drawer-section">
          <div class="drawer-label">Contacto</div>
          <template v-if="contact">
            <div class="drawer-name">{{ contact.name }}</div>
            <div class="drawer-sub">{{ contact.email || "—" }}</div>
            <div class="drawer-sub">{{ contact.phone || contact.mobile_phone || "—" }}</div>
            <div v-if="contact.contacts_companies?.[0]" class="drawer-sub">
              {{ contact.contacts_companies[0].companies?.name }}{{ contact.contacts_companies[0].role ? " · " + contact.contacts_companies[0].role : "" }}
            </div>
          </template>
          <p v-else style="font-size: 12.5px; color: var(--faint)">Sin contacto asignado.</p>
        </div>

        <div class="drawer-section">
          <div class="drawer-label">Hoteles vinculados</div>
          <div v-for="h in hotels" :key="h.id" class="drawer-hotel">
            <div class="drawer-name">{{ h.name }}</div>
            <div class="drawer-sub">{{ [h.city, h.category, h.stars ? h.stars + "★" : null].filter(Boolean).join(" · ") || "—" }}</div>
          </div>
          <p v-if="!hotels.length" style="font-size: 12.5px; color: var(--faint)">Sin hoteles vinculados.</p>
        </div>

        <div class="drawer-section">
          <div class="drawer-label">Historial del contacto</div>
          <div v-for="h in historial" :key="h.id" class="hist-item">
            <span class="h-date">{{ fdate(h.created_at) }}</span>
            <span class="h-note">{{ h.note || "Actualización de la ficha" }}</span>
          </div>
          <p v-if="!historial.length" style="font-size: 12.5px; color: var(--faint)">Sin historial todavía.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.drawer-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.25); z-index: 70; display: flex; justify-content: flex-end; }
.drawer-panel { width: min(420px, 92vw); height: 100%; background: var(--surface); border-left: 1px solid var(--line); box-shadow: var(--shadow-lift); overflow-y: auto; padding: 20px; }
.drawer-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.drawer-head h3 { font-family: var(--display); font-size: 17px; font-weight: 700; padding-right: 12px; }
.drawer-section { padding: 14px 0; border-top: 1px solid var(--line); }
.drawer-section:first-of-type { border-top: none; }
.drawer-label { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--faint); margin-bottom: 8px; }
.drawer-name { font-weight: 600; font-size: 14px; }
.drawer-sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.drawer-hotel { margin-bottom: 10px; }
.drawer-hotel:last-child { margin-bottom: 0; }
</style>
