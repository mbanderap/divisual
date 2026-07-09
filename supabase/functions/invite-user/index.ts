// Edge Function: invita a un usuario nuevo por correo (Supabase Auth).
// La clave service_role solo existe aquí (secreto del proyecto), nunca en el navegador.
// Deploy: supabase functions deploy invite-user
// Secreto necesario (se añade solo, pero verifica): SUPABASE_SERVICE_ROLE_KEY

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

    // Solo un usuario ya autenticado de la app puede invitar a otros.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: caller, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller.user) throw new Error("No autenticado");

    const { email, name } = await req.json();
    if (!email || typeof email !== "string") throw new Error("Falta el correo");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await admin.auth.admin.inviteUserByEmail(email.trim(), {
      data: name ? { name: String(name).trim() } : undefined,
    });
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
