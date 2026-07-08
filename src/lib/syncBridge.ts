import { supabase } from "./supabase";

export async function syncBridge(
  table: string,
  col: string,
  id: number,
  rows: Record<string, unknown>[],
): Promise<void> {
  const del = await supabase.from(table).delete().eq(col, id);
  if (del.error) throw new Error(del.error.message);
  if (rows.length) {
    const ins = await supabase.from(table).insert(rows);
    if (ins.error) throw new Error(ins.error.message);
  }
}
