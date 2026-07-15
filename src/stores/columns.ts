import { defineStore } from "pinia";
import type { Contact, Company, Hotel, ColumnDef } from "../lib/types";

const STORAGE_KEY = "divisual-columns-v1";

function defaultContactColumns(): ColumnDef<Contact>[] {
  return [
    { key: "name", label: "Contacto", visible: true, dbCol: "name" },
    { key: "last_name", label: "Apellidos", visible: false, dbCol: "last_name" },
    { key: "empresa", label: "Empresa", visible: true },
    { key: "hotel", label: "Hotel", visible: false },
    { key: "etiquetas", label: "Etiquetas", visible: true },
    { key: "lead_status", label: "Estado", visible: true, dbCol: "lead_status" },
    { key: "phone", label: "Teléfono", visible: false, dbCol: "phone", numeric: true },
    { key: "mobile_phone", label: "Móvil", visible: false, dbCol: "mobile_phone", numeric: true },
    { key: "email", label: "Correo", visible: false, dbCol: "email" },
    { key: "creation_date", label: "Creado", visible: false, dbCol: "creation_date" },
    { key: "last_update", label: "Actualizado", visible: true, dbCol: "last_update" },
  ];
}
function defaultCompanyColumns(): ColumnDef<Company>[] {
  return [
    { key: "name", label: "Empresa", visible: true, dbCol: "name" },
    { key: "client", label: "Relación", visible: true, dbCol: "client" },
    { key: "category", label: "Categoría", visible: true, dbCol: "category" },
    { key: "phone", label: "Teléfono", visible: true, dbCol: "phone", numeric: true },
    { key: "contactos", label: "Contactos", visible: true, numeric: true },
  ];
}
function defaultHotelColumns(): ColumnDef<Hotel>[] {
  return [
    { key: "name", label: "Hotel", visible: true, dbCol: "name" },
    { key: "is_client", label: "Cliente", visible: true, dbCol: "is_client" },
    { key: "current_ij", label: "IJ actual", visible: true, dbCol: "current_ij", numeric: true },
    { key: "objective", label: "Objetivo", visible: true, dbCol: "objective", numeric: true },
    { key: "tau", label: "TAU", visible: true, dbCol: "tau", numeric: true },
    { key: "equipo", label: "Equipo", visible: false, numeric: true },
    { key: "num_rooms", label: "Nº habitaciones", visible: false, dbCol: "num_rooms", numeric: true },
    { key: "adr", label: "ADR", visible: false, dbCol: "adr", numeric: true },
    { key: "stars", label: "Nº estrellas", visible: false, dbCol: "stars", numeric: true },
    { key: "category", label: "Categoría", visible: false, dbCol: "category" },
    { key: "is_chain", label: "Cadena", visible: false, dbCol: "is_chain" },
    { key: "pms", label: "PMS", visible: false, dbCol: "pms" },
    { key: "city", label: "Ciudad", visible: false, dbCol: "city" },
    { key: "postal_code", label: "Código postal", visible: false, dbCol: "postal_code" },
    { key: "address", label: "Dirección", visible: false, dbCol: "address" },
    { key: "booking_url", label: "URL booking", visible: false, dbCol: "booking_url" },
    { key: "jaippy_id", label: "ID Jaippy", visible: false, dbCol: "jaippy_id", numeric: true },
    { key: "income_current_month", label: "Ingresos mes actual", visible: false, dbCol: "income_current_month", numeric: true },
    { key: "income_next_month", label: "Ingresos mes siguiente", visible: false, dbCol: "income_next_month", numeric: true },
  ];
}

// Reconcilia lo guardado en localStorage con las columnas actuales del
// código: si quitamos o renombramos una columna, desaparece sola de lo
// guardado en vez de quedarse colgada con datos viejos; si añadimos una
// columna nueva, se incorpora sola. Solo se conserva del guardado la
// visibilidad y el orden, todo lo demás (label, dbCol...) sale siempre
// de la definición actual.
function reconcile<T>(persisted: ColumnDef<T>[] | undefined, defaults: ColumnDef<T>[]): ColumnDef<T>[] {
  if (!persisted) return defaults;
  const remaining = new Map(defaults.map((d) => [d.key, d]));
  const merged: ColumnDef<T>[] = [];
  for (const p of persisted) {
    const def = remaining.get(p.key);
    if (!def) continue;
    merged.push({ ...def, visible: p.visible });
    remaining.delete(p.key);
  }
  merged.push(...remaining.values());
  return merged;
}

function loadPersisted<T>(key: string, fallback: ColumnDef<T>[]): ColumnDef<T>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return reconcile<T>(parsed[key], fallback);
  } catch {
    return fallback;
  }
}

export const useColumnStore = defineStore("columns", {
  state: () => ({
    contactos: loadPersisted<Contact>("contactos", defaultContactColumns()),
    empresas: loadPersisted<Company>("empresas", defaultCompanyColumns()),
    hoteles: loadPersisted<Hotel>("hoteles", defaultHotelColumns()),
  }),
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ contactos: this.contactos, empresas: this.empresas, hoteles: this.hoteles }));
    },
    setContactColumns(cols: ColumnDef<Contact>[]) { this.contactos = cols; this.persist(); },
    setCompanyColumns(cols: ColumnDef<Company>[]) { this.empresas = cols; this.persist(); },
    setHotelColumns(cols: ColumnDef<Hotel>[]) { this.hoteles = cols; this.persist(); },
  },
});
