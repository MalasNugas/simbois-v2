// Shared helpers for Google Sheets connector + admin auth
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json({ error: "Unauthorized" }, 401) };
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userRes } = await userClient.auth.getUser();
  if (!userRes?.user) return { error: json({ error: "Unauthorized" }, 401) };
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roleCheck } = await admin
    .from("user_roles").select("role")
    .eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
  if (!roleCheck) return { error: json({ error: "Hanya admin" }, 403) };
  return { admin, user: userRes.user };
}

export function gatewayHeaders() {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
  if (!lovableKey || !connKey) {
    throw new Error("Connector Google Sheets belum aktif. Hubungkan terlebih dahulu di Connectors.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
}

export async function gatewayFetch(path: string, init: RequestInit = {}) {
  const url = `${GATEWAY_URL}${path}`;
  const headers = { ...gatewayHeaders(), ...(init.headers || {}) };
  let lastErr: { status: number; body: any } | null = null;
  // Retry transient gateway errors (502/503/504) and 429 with backoff
  const delays = [500, 1200, 2500];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers });
    } catch (e) {
      if (attempt < delays.length) { await new Promise((r) => setTimeout(r, delays[attempt])); continue; }
      throw new Error(`Google Sheets network error: ${(e as Error).message}`);
    }
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (res.ok) return body;
    lastErr = { status: res.status, body };
    const retryable = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
    if (!retryable || attempt === delays.length) break;
    await new Promise((r) => setTimeout(r, delays[attempt]));
  }
  throw new Error(`Google Sheets ${lastErr!.status}: ${typeof lastErr!.body === "string" ? lastErr!.body : JSON.stringify(lastErr!.body)}`);
}
