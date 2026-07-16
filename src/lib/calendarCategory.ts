import { recurrenceMatchesDay } from "./recurrence";
import type { Recurrence } from "./recurrence";
import type { CalendarEvent } from "./types";

export function eventOccursOn(e: CalendarEvent, key: string): boolean {
  if (e.recurrence) return recurrenceMatchesDay(key, e.recurrence as Recurrence, e.recurrence_day, e.start_date, e.end_date);
  return key >= e.start_date && key <= (e.end_date || e.start_date);
}

// Agrupa las 6 categorías de evento en los 4 colores fijos que se usan
// en el calendario (leyenda, píldoras del mes, panel "Hoy").
export function categoryColor(category: string): "blue" | "violet" | "green" | "orange" {
  if (category === "Despliegue") return "blue";
  if (category === "Vacaciones") return "green";
  if (category === "Teletrabajo") return "orange";
  return "violet"; // Reunión, Formación, Visita a hotel
}

export function timeRangeLabel(startTime: string | null, endTime: string | null): string {
  if (!startTime) return "Todo el día";
  const s = startTime.slice(0, 5);
  return endTime ? `${s} – ${endTime.slice(0, 5)}` : s;
}
