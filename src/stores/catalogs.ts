import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";
import { fetchAllRows, countRows } from "../lib/fetchAll";
import type { Deal, Personnel, Tag, BillingModel, Hotel, Ticket, Task, Story, Sprint, TaskLabel, CalendarEvent } from "../lib/types";

interface Counts {
  contacts: number;
  companies: number;
  hotels: number;
  hotelsPlan: number;
  contactsCliente: number;
}

interface PanelStats {
  devHotels: Hotel[];
}

export const useCatalogStore = defineStore("catalogs", {
  state: () => ({
    deals: [] as Deal[],
    tickets: [] as Ticket[],
    tasks: [] as Task[],
    stories: [] as Story[],
    sprints: [] as Sprint[],
    labels: [] as TaskLabel[],
    events: [] as CalendarEvent[],
    personnel: [] as Personnel[],
    tags: [] as Tag[],
    billing: [] as BillingModel[],
    counts: { contacts: 0, companies: 0, hotels: 0, hotelsPlan: 0, contactsCliente: 0 } as Counts,
    panelStats: null as PanelStats | null,
  }),
  getters: {
    openDealsCount: (state) => state.deals.filter((d) => d.status && ["Prospecto", "Contactado", "Propuesta", "Negociación"].includes(d.status)).length,
    openTicketsCount: (state) => state.tickets.filter((t) => t.status && ["Por iniciar", "Seguimiento activo", "Consolidación", "Décima alcanzada"].includes(t.status)).length,
    openTasksCount: (state) => state.tasks.filter((t) => t.status && t.status !== "Listo en prod").length,
  },
  actions: {
    async loadCatalogs() {
      // Promise.allSettled: si una tabla falla (p.ej. todavía no se ha creado
      // en Supabase) o no existe, el resto de catálogos se cargan igual en
      // vez de dejar toda la carga colgada o vacía.
      const results = await Promise.allSettled([
        fetchAllRows<Deal>("deals", "*, contacts(id, name), billing_models(id, name), deals_hotels(id, hotels(id, name))", "id"),
        fetchAllRows<Ticket>("tickets", "*, companies(id, name), personnel(id, name), hotels(id, name), tickets_contacts(id, contacts(id, name))", "id"),
        fetchAllRows<Task>("tasks", "*, stories(id, name), sprints(id, name), tasks_personnel(id, personnel(id, name)), tasks_labels(id, labels(id, name, color))", "id"),
        fetchAllRows<Story>("stories", "*", "name"),
        fetchAllRows<Sprint>("sprints", "*", "start_date"),
        fetchAllRows<TaskLabel>("labels", "*", "name"),
        fetchAllRows<CalendarEvent>("events", "*, events_personnel(id, personnel(id, name))", "start_date"),
        fetchAllRows<Personnel>("personnel", "*, hotels_personnel(role, area, hotels(id, name))", "name"),
        fetchAllRows<Tag>("tags", "*", "name"),
        fetchAllRows<BillingModel>("billing_models", "*", "name"),
      ]);
      const [deals, tickets, tasks, stories, sprints, labels, events, personnel, tags, billing] = results.map((r) => (r.status === "fulfilled" ? r.value : []));
      this.deals = (deals as Deal[]).sort((a, b) => b.id - a.id);
      this.tickets = (tickets as Ticket[]).sort((a, b) => b.id - a.id);
      this.tasks = (tasks as Task[]).sort((a, b) => b.id - a.id);
      this.stories = stories as Story[];
      this.sprints = sprints as Sprint[];
      this.labels = labels as TaskLabel[];
      this.events = events as CalendarEvent[];
      this.personnel = personnel as Personnel[];
      this.tags = tags as Tag[];
      this.billing = billing as BillingModel[];
    },
    async loadCounts() {
      const [contacts, companies, hotels, hotelsPlan, contactsCliente] = await Promise.all([
        countRows("contacts"),
        countRows("companies"),
        countRows("hotels"),
        countRows("hotels", [["has_plan", "eq", true]]),
        countRows("contacts", [["lead_status", "eq", "Cliente"]]),
      ]);
      this.counts = { contacts, companies, hotels, hotelsPlan, contactsCliente };
    },
    async loadPanelStats() {
      const cols = "id,name,deviation_days,deviation_pct";
      const [descRes, ascRes] = await Promise.all([
        supabase.from("hotels").select(cols).eq("has_plan", true).not("deviation_pct", "is", null).order("deviation_pct", { ascending: false }).limit(4),
        supabase.from("hotels").select(cols).eq("has_plan", true).not("deviation_pct", "is", null).order("deviation_pct", { ascending: true }).limit(4),
      ]);
      if (descRes.error) throw new Error(descRes.error.message);
      if (ascRes.error) throw new Error(ascRes.error.message);
      const seen = new Set<number>();
      const merged: Hotel[] = [];
      [...(descRes.data ?? []), ...(ascRes.data ?? [])].forEach((h) => {
        if (!seen.has(h.id)) { seen.add(h.id); merged.push(h as Hotel); }
      });
      merged.sort((a, b) => Math.abs(b.deviation_pct ?? 0) - Math.abs(a.deviation_pct ?? 0));
      this.panelStats = { devHotels: merged.slice(0, 6) };
    },
    async refreshCatalogsAndCounts() {
      await Promise.all([this.loadCatalogs(), this.loadCounts()]);
      if (this.panelStats) await this.loadPanelStats();
    },
  },
});
