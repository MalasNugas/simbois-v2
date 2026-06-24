import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { client_id, selfie_base64, lat, lng, notes, job_status, operational_status } = body;

    if (!client_id || typeof client_id !== "string") {
      return new Response(JSON.stringify({ error: "client_id wajib" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!selfie_base64 || typeof selfie_base64 !== "string") {
      return new Response(JSON.stringify({ error: "Selfie wajib diambil" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 1. Cek izin
    const { data: perm } = await supabase
      .from("reporting_permissions")
      .select("id, used_at, revoked_at")
      .eq("client_id", client_id)
      .eq("period_year", year)
      .eq("period_month", month)
      .is("revoked_at", null)
      .maybeSingle();

    if (!perm) {
      return new Response(JSON.stringify({ error: "Anda belum mendapatkan izin wajib lapor bulan ini." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Cek sudah lapor?
    const { data: existing } = await supabase
      .from("monthly_reports")
      .select("id")
      .eq("client_id", client_id)
      .eq("report_year", year)
      .eq("report_month", month)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Anda sudah melakukan wajib lapor bulan ini." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Upload selfie
    const base64Data = selfie_base64.replace(/^data:image\/\w+;base64,/, "");
    const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const filePath = `${client_id}/${year}-${String(month).padStart(2, "0")}-${Date.now()}.jpg`;

    const { error: upErr } = await supabase.storage
      .from("wajib-lapor-selfies")
      .upload(filePath, bytes, { contentType: "image/jpeg", upsert: false });

    if (upErr) {
      return new Response(JSON.stringify({ error: "Gagal upload selfie: " + upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Insert report
    const { data: report, error: insErr } = await supabase
      .from("monthly_reports")
      .insert({
        client_id,
        report_date: now.toISOString().slice(0, 10),
        report_year: year,
        report_month: month,
        selfie_url: filePath,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        notes: notes || null,
        job_status: job_status || null,
        operational_status: operational_status || null,
        permission_id: perm.id,
        submitted_via: "public_form",
      })
      .select()
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: "Gagal simpan laporan: " + insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Tandai izin used
    await supabase
      .from("reporting_permissions")
      .update({ used_at: now.toISOString() })
      .eq("id", perm.id);

    // 6. Notifikasi pegawai PK
    const { data: client } = await supabase
      .from("clients")
      .select("assigned_pk_id, user_id")
      .eq("id", client_id)
      .maybeSingle();

    if (client?.assigned_pk_id) {
      const { data: prof } = await supabase
        .from("profiles").select("full_name").eq("user_id", client.user_id).maybeSingle();
      const name = prof?.full_name || "Klien";
      await supabase.from("notifications").insert({
        user_id: client.assigned_pk_id,
        title: "Wajib Lapor Diterima",
        message: `${name} telah melakukan wajib lapor untuk bulan ${month}/${year}.`,
        type: "success",
      });
    }

    return new Response(JSON.stringify({ success: true, report_id: report.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
