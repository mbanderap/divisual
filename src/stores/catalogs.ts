import { defineStore } from "pinia";
import { fetchAllRows, countRows } from "../lib/fetchAll";
import { useToastStore } from "./toast";
import type { Deal, Personnel, Tag, BillingModel, Ticket, Task, Story, Sprint, TaskLabel, CalendarEvent, Profile } from "../lib/types";

const CATALOG_NAMES = ["deals", "tickets", "tasks", "stories", "sprints", "labels", "events", "personnel", "tags", "billing_models", "profiles"];

interface Counts {
  contacts: number;
  companies: number;
  companiesClient: number;
  hotels: number;
  hotelsClient: number;
  contactsCliente: number;
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
    profiles: [] as Profile[],
    tags: [] as Tag[],
    billing: [] as BillingModel[],
    counts: { contacts: 0, companies: 0, companiesClient: 0, hotels: 0, hotelsClient: 0, contactsCliente: 0 } as Counts,
    lastLoadedAt: null as Date | null,
  }),
  getters: {
    openDealsCount: (state) => state.deals.filter((d) => d.status && ["Prospecto", "Contactado", "Propuesta", "Negociación"].includes(d.status)).length,
    openTicketsCount: (state) => state.tickets.filter((t) => t.status && ["Por iniciar", "Seguimiento activo", "Consolidación", "Décima alcanzada"].includes(t.status)).length,
    openTasksCount: (state) => state.tasks.filter((t) => t.status && t.status !== "Listo en prod").length,
    // Personal que además tiene cuenta real (auth.users, vía profiles) — los "Usuarios" internos.
    loggedInPersonnel: (state) =>
      state.personnel.filter((p) => p.email && state.profiles.some((pr) => pr.email.toLowerCase() === p.email!.toLowerCase())),
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
        fetchAllRows<Profile>("profiles", "id, email", "email"),
      ]);
      const failed = results
        .map((r, i) => (r.status === "rejected" ? { name: CATALOG_NAMES[i], reason: r.reason } : null))
        .filter((x): x is { name: string; reason: unknown } => x !== null);
      if (failed.length) {
        for (const f of failed) console.error(`Fallo al cargar "${f.name}":`, f.reason);
        useToastStore().show(`No se pudieron cargar: ${failed.map((f) => f.name).join(", ")}. Revisa la consola.`, 6000);
      }
      const [deals, tickets, tasks, stories, sprints, labels, events, personnel, tags, billing, profiles] = results.map((r) => (r.status === "fulfilled" ? r.value : []));
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
      this.profiles = profiles as Profile[];
      this.lastLoadedAt = new Date();
    },
    async loadCounts() {
      const [contacts, companies, companiesClient, hotels, hotelsClient, contactsCliente] = await Promise.all([
        countRows("contacts"),
        countRows("companies"),
        countRows("companies", [["client", "eq", true]]),
        countRows("hotels"),
        countRows("hotels", [["is_client", "eq", true]]),
        countRows("contacts", [["lead_status", "eq", "Cliente"]]),
      ]);
      this.counts = { contacts, companies, companiesClient, hotels, hotelsClient, contactsCliente };
    },
    async refreshCatalogsAndCounts() {
      await Promise.all([this.loadCatalogs(), this.loadCounts()]);
    },
  },
});
