export function eur(n: number | null | undefined): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
}

export function num(n: number | null | undefined, d = 2): string {
  return n == null ? "—" : new Intl.NumberFormat("es-ES", { maximumFractionDigits: d }).format(n);
}

export function fdate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" });
}

export function initials(name: string | null | undefined): string {
  return String(name || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function statusClass(s: string | null | undefined): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// null-safe helpers para escribir en Supabase: '' -> null
export function nn(v: string | null | undefined): string | null {
  return v === "" || v == null ? null : v;
}
export function nnum(v: string | number | null | undefined): number | null {
  if (v === "" || v == null) return null;
  const f = typeof v === "number" ? v : parseFloat(v);
  return Number.isNaN(f) ? null : f;
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 320): (...args: A) => void {
  let handle: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}
