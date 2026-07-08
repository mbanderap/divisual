import { supabase } from "../lib/supabase";

export async function asyncSearch<T>(
  table: string,
  searchCol: string,
  term: string,
  selectCols: string,
  limit = 8,
): Promise<T[]> {
  const clean = term.replace(/[%,()]/g, "");
  if (!clean) return [];
  const { data, error } = await supabase.from(table).select(selectCols).ilike(searchCol, `%${clean}%`).limit(limit);
  if (error) { console.error(error); return []; }
  return (data ?? []) as T[];
}
