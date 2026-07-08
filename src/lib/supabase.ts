import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

// Si faltan las variables de entorno, exportamos un cliente "vacío" que nunca
// se usa (supabaseConfigured queda en false y la app muestra la pantalla de
// configuración) para no romper el arranque con un createClient(undefined).
export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-key",
);
