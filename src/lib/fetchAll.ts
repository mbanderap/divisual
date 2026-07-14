import { supabase } from "./supabase";
import type { FilterDef } from "./types";

/**
 * Trae una tabla entera paginando de 1000 en 1000 (limite por defecto
 * de PostgREST). Pensado para catalogos pequeños (deals, personnel,
 * tags, billing_models); si alguna de estas tablas creciera mucho,
 * el sitio a migrar seria usePagedEntity, no este helper.
 */
export async function fetchAllRows<T>(table: string, select: string, orderCol: string): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.from(table).select(select).order(orderCol).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all = all.concat((data ?? []) as T[]);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

/**
 * Como fetchAllRows, pero aplicando la misma búsqueda y los mismos
 * filtros que usePagedEntity — para exportar a CSV exactamente lo que
 * se está viendo en la tabla, no solo la página cargada.
 */
export async function fetchAllFiltered<T>(
  table: string,
  select: string,
  orderCol: string,
  search: string,
  searchCols: string[],
  filters: FilterDef[],
): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).select(select);
    if (search) {
      const term = `%${search.replace(/[%,()]/g, "")}%`;
      query = query.or(searchCols.map((c) => `${c}.ilike.${term}`).join(","));
    }
    for (const f of filters) {
      if (f.op === "eq") query = query.eq(f.col, f.value);
      else if (f.op === "gte") query = query.gte(f.col, f.value as string | number);
      else if (f.op === "lte") query = query.lte(f.col, f.value as string | number);
      else if (f.op === "in") query = query.in(f.col, f.value as (string | number)[]);
      else query = query.is(f.col, f.value as boolean | null);
    }
    const { data, error } = await query.order(orderCol).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    all = all.concat((data ?? []) as T[]);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function countRows(
  table: string,
  filters: [string, "eq" | "neq", string | number | boolean][] = [],
): Promise<number> {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [col, op, val] of filters) query = query[op](col, val as never);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}
