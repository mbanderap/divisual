import { defineStore } from "pinia";
import type { Contact, Company, Hotel, ColumnDef } from "../lib/types";

const STORAGE_KEY = "divisual-columns-v1";

function defaultContactColumns(): ColumnDef<Contact>[] {
  return [
    { key: "name", label: "Contacto", visible: true, dbCol: "name" },
    { key: "empresa", label: "Empresa", visible: true },
    { key: "etiquetas", label: "Etiquetas", visible: true },
    { key: "lead_status", label: "Estado", visible: true, dbCol: "lead_status" },
    { key: "phone", label: "Teléfono", visible: false, dbCol: "phone", numeric: true },
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
    { key: "has_plan", label: "Plan", visible: true, dbCol: "has_plan" },
    { key: "current_ij", label: "IJ actual", visible: true, dbCol: "current_ij", numeric: true },
    { key: "objective", label: "Objetivo", visible: true, dbCol: "objective", numeric: true },
    { key: "current_tenth", label: "Décima actual", visible: true, dbCol: "current_tenth", numeric: true },
    { key: "contracted_tenths", label: "Décimas contratadas", visible: true, dbCol: "contracted_tenths", numeric: true },
    { key: "tau", label: "TAU", visible: true, dbCol: "tau", numeric: true },
    { key: "deviation_days", label: "Desv. (días)", visible: true, dbCol: "deviation_days", numeric: true },
    { key: "deviation_pct", label: "Desv. (valor)", visible: false, dbCol: "deviation_pct", numeric: true },
    { key: "plan_end_date", label: "Fin del plan", visible: true, dbCol: "plan_end_date" },
    { key: "equipo", label: "Equipo", visible: false, numeric: true },
  ];
}

function loadPersisted<T>(key: string, fallback: ColumnDef<T>[]): ColumnDef<T>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed[key] ?? fallback;
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
