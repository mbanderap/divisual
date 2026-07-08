import { reactive, shallowRef } from "vue";
import { supabase } from "../lib/supabase";

export interface EntityMeta {
  table: string;
  select: string;
  searchCols: string[];
}

interface PagerMeta {
  page: number;
  pageSize: number;
  total: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  search: string;
  loading: boolean;
}

/**
 * Encapsula la paginacion real en servidor para tablas grandes:
 * PostgREST limita cada respuesta a 1000 filas, así que en vez de
 * traer la tabla entera pedimos solo la página visible, con
 * busqueda (ILIKE) y orden resueltos en Postgres. Se usa para
 * contactos, empresas y hoteles (las tres tablas con miles de filas).
 *
 * `rows` va en un shallowRef aparte (no dentro del `reactive`) para
 * evitar el unwrap profundo que Vue aplica a genericos dentro de
 * `reactive<T>`, que rompe la inferencia de tipos en TypeScript.
 */
export function usePagedEntity<T>(meta: EntityMeta, defaultSortKey: string) {
  const rows = shallowRef<T[]>([]);
  const pager = reactive<PagerMeta>({
    page: 1,
    pageSize: 50,
    total: 0,
    sortKey: defaultSortKey,
    sortDir: "asc",
    search: "",
    loading: false,
  });

  async function fetchPage() {
    pager.loading = true;
    try {
      const from = (pager.page - 1) * pager.pageSize;
      const to = from + pager.pageSize - 1;
      let query = supabase.from(meta.table).select(meta.select, { count: "exact" });
      if (pager.search) {
        const term = `%${pager.search.replace(/[%,()]/g, "")}%`;
        query = query.or(meta.searchCols.map((c) => `${c}.ilike.${term}`).join(","));
      }
      query = query.order(pager.sortKey, { ascending: pager.sortDir === "asc", nullsFirst: false }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      rows.value = (data ?? []) as T[];
      pager.total = count ?? rows.value.length;
    } finally {
      pager.loading = false;
    }
  }

  function setSearch(term: string) {
    pager.search = term;
    pager.page = 1;
    return fetchPage();
  }
  function setSort(dbCol: string) {
    if (pager.sortKey === dbCol) pager.sortDir = pager.sortDir === "asc" ? "desc" : "asc";
    else { pager.sortKey = dbCol; pager.sortDir = "asc"; }
    pager.page = 1;
    return fetchPage();
  }
  function setPage(page: number) {
    pager.page = page;
    return fetchPage();
  }
  function setPageSize(size: number) {
    pager.pageSize = size;
    pager.page = 1;
    return fetchPage();
  }

  return { rows, pager, fetchPage, setSearch, setSort, setPage, setPageSize };
}
