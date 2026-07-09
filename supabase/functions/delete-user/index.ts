// Edge Function: elimina de verdad la cuenta de un usuario (Supabase Auth),
// no solo su ficha de personnel. La clave service_role solo existe aquí
// (secreto del proyecto), nunca en el navegador.
// Deploy: supabase functions deploy delete-user

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    if (req.method !== "POST") throw new Error("Método no permitido");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Solo un usuario ya autenticado de la app puede eliminar a otros.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: caller, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller.user) throw new Error("No autenticado");

    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") throw new Error("Falta el id del usuario");
    if (userId === caller.user.id) throw new Error("No puedes eliminar tu propia cuenta desde aquí");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
