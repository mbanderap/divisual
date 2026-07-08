import { defineStore } from "pinia";
import { supabase } from "../lib/supabase";
import { fetchAllRows, countRows } from "../lib/fetchAll";
import type { Deal, Personnel, Tag, BillingModel, Hotel } from "../lib/types";

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
    personnel: [] as Personnel[],
    tags: [] as Tag[],
    billing: [] as BillingModel[],
    counts: { contacts: 0, companies: 0, hotels: 0, hotelsPlan: 0, contactsCliente: 0 } as Counts,
    panelStats: null as PanelStats | null,
  }),
  getters: {
    openDealsCount: (state) => state.deals.filter((d) => d.status && ["Prospecto", "Contactado", "Propuesta", "Negociación"].includes(d.status)).length,
  },
  actions: {
    async loadCatalogs() {
      const [deals, personnel, tags, billing] = await Promise.all([
        fetchAllRows<Deal>("deals", "*, contacts(id, name), billing_models(id, name), deals_hotels(id, hotels(id, name))", "id"),
        fetchAllRows<Personnel>("personnel", "*, hotels_personnel(role, area, hotels(id, name))", "name"),
        fetchAllRows<Tag>("tags", "*", "name"),
        fetchAllRows<BillingModel>("billing_models", "*", "name"),
      ]);
      this.deals = deals.sort((a, b) => b.id - a.id);
      this.personnel = personnel;
      this.tags = tags;
      this.billing = billing;
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
