// Repetición simple para eventos y tareas: "cada semana" (día 1=Lun..7=Dom)
// o "cada mes" (día 1-31, recortado al último día del mes si no existe).

export type Recurrence = "weekly" | "monthly";

export const WEEKDAYS: { label: string; value: number }[] = [
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sáb", value: 6 },
  { label: "Dom", value: 7 },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseKey(key: string): Date {
  return new Date(key + "T00:00:00");
}
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function todayKey(): string {
  return toKey(new Date());
}

export function weekdayOf(dateKey: string): number {
  return ((parseKey(dateKey).getDay() + 6) % 7) + 1;
}

// Próxima fecha, estrictamente posterior a `fromKey`, que cumple la regla.
export function nextOccurrenceDate(recurrence: Recurrence, day: number, fromKey: string): string {
  const from = parseKey(fromKey);
  if (recurrence === "weekly") {
    const cur = weekdayOf(fromKey);
    let diff = day - cur;
    if (diff <= 0) diff += 7;
    from.setDate(from.getDate() + diff);
    return toKey(from);
  }
  let year = from.getFullYear();
  let month = from.getMonth() + 1; // mes siguiente
  if (month > 11) { month = 0; year++; }
  const d = Math.min(day, lastDayOfMonth(year, month));
  return toKey(new Date(year, month, d));
}

// ¿Cae `dateKey` en una ocurrencia de la regla, entre startKey y untilKey (opcional)?
export function recurrenceMatchesDay(
  dateKey: string,
  recurrence: Recurrence | null | undefined,
  day: number | null | undefined,
  startKey: string,
  untilKey?: string | null,
): boolean {
  if (!recurrence || day == null) return false;
  if (dateKey < startKey) return false;
  if (untilKey && dateKey > untilKey) return false;
  if (recurrence === "weekly") return weekdayOf(dateKey) === day;
  const d = parseKey(dateKey);
  const effectiveDay = Math.min(day, lastDayOfMonth(d.getFullYear(), d.getMonth()));
  return d.getDate() === effectiveDay;
}

// Al llegar una tarea recurrente a la etapa final, en vez de quedarse "hecha"
// vuelve a la etapa inicial con la fecha de la siguiente ocurrencia.
export function rescheduleTaskIfDone<
  T extends { status: string | null; due_date: string | null; recurrence: string | null; recurrence_day: number | null },
>(row: T, doneStage: string, resetStage: string): T {
  if (row.status !== doneStage || !row.recurrence || row.recurrence_day == null) return row;
  const from = row.due_date || todayKey();
  return { ...row, status: resetStage, due_date: nextOccurrenceDate(row.recurrence as Recurrence, row.recurrence_day, from) };
}
