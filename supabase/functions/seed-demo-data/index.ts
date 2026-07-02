import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PEGAWAI = [
  { email: "budi.pk@simbois.local", full_name: "Budi Santoso, S.H.", phone: "081234000001" },
  { email: "siti.pk@simbois.local", full_name: "Siti Rahmawati, S.Psi.", phone: "081234000002" },
];

const CLIENTS = [
  { case_number: "001/BKD/PB/2026", full_name: "Ahmad Fauzi",     gender: "L", phone: "081200000001", address: "Jl. Ijen No. 12, Malang", birth_place: "Malang",   birth_date: "1990-05-14", pk_idx: 0 },
  { case_number: "002/BKD/PB/2026", full_name: "Rina Kartika",    gender: "P", phone: "081200000002", address: "Jl. Sulfat No. 5, Malang",  birth_place: "Blitar",   birth_date: "1992-08-21", pk_idx: 0 },
  { case_number: "003/BKD/CB/2026", full_name: "Joko Prasetyo",   gender: "L", phone: "081200000003", address: "Jl. Soekarno-Hatta 45, Malang", birth_place: "Kediri", birth_date: "1988-02-03", pk_idx: 0 },
  { case_number: "004/BKD/PB/2026", full_name: "Dewi Anggraini",  gender: "P", phone: "081200000004", address: "Jl. Bandung No. 8, Malang",  birth_place: "Malang",   birth_date: "1995-11-30", pk_idx: 0 },
  { case_number: "005/BKD/AS/2026", full_name: "Hendra Wijaya",   gender: "L", phone: "081200000005", address: "Jl. Kawi No. 21, Malang",    birth_place: "Surabaya", birth_date: "1985-07-19", pk_idx: 0 },
  { case_number: "006/BKD/PB/2026", full_name: "Sri Wahyuni",     gender: "P", phone: "081200000006", address: "Jl. Panglima Sudirman 3, Batu", birth_place: "Batu",  birth_date: "1993-04-12", pk_idx: 1 },
  { case_number: "007/BKD/CB/2026", full_name: "Bagus Nugroho",   gender: "L", phone: "081200000007", address: "Jl. Diponegoro 17, Batu",    birth_place: "Malang",   birth_date: "1987-09-25", pk_idx: 1 },
  { case_number: "008/BKD/PB/2026", full_name: "Lestari Putri",   gender: "P", phone: "081200000008", address: "Jl. Semeru No. 9, Malang",   birth_place: "Malang",   birth_date: "1996-01-08", pk_idx: 1 },
  { case_number: "009/BKD/AS/2026", full_name: "Rudi Hartono",    gender: "L", phone: "081200000009", address: "Jl. Bromo No. 14, Malang",   birth_place: "Pasuruan", birth_date: "1983-12-02", pk_idx: 1 },
  { case_number: "010/BKD/PB/2026", full_name: "Maya Sari",       gender: "P", phone: "081200000010", address: "Jl. Arjuna No. 6, Batu",     birth_place: "Malang",   birth_date: "1998-06-17", pk_idx: 1 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleCheck } = await admin.from("user_roles").select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return new Response(JSON.stringify({ error: "Hanya admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const PASSWORD = "Demo_2026";
    const pkIds: string[] = [];

    // Create Pegawai PK
    for (const p of PEGAWAI) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: p.email, password: PASSWORD, email_confirm: true,
        user_metadata: { full_name: p.full_name },
      });
      if (error || !created.user) throw new Error(`Pegawai ${p.email}: ${error?.message}`);
      const uid = created.user.id;
      pkIds.push(uid);
      await admin.from("user_roles").insert({ user_id: uid, role: "pegawai" });
      await admin.from("profiles").update({ phone: p.phone, full_name: p.full_name }).eq("user_id", uid);
    }

    // Create Klien
    const clientIds: string[] = [];
    const now = new Date();
    const startBimb = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0,10);
    const endBimb = new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString().slice(0,10);

    for (const c of CLIENTS) {
      const tmpEmail = `client.${c.case_number.toLowerCase().replace(/[^a-z0-9]/g,'')}@simbois.local`;
      const { data: created, error } = await admin.auth.admin.createUser({
        email: tmpEmail, password: crypto.randomUUID(), email_confirm: true,
        user_metadata: { full_name: c.full_name },
      });
      if (error || !created.user) throw new Error(`Client ${c.case_number}: ${error?.message}`);
      const uid = created.user.id;
      await admin.from("user_roles").insert({ user_id: uid, role: "klien" });
      await admin.from("profiles").update({
        full_name: c.full_name, phone: c.phone, address: c.address,
        gender: c.gender, birth_place: c.birth_place, birth_date: c.birth_date,
      }).eq("user_id", uid);
      const { data: cl } = await admin.from("clients").insert({
        user_id: uid,
        case_number: c.case_number,
        assigned_pk_id: pkIds[c.pk_idx],
        guidance_start: startBimb,
        guidance_end: endBimb,
        client_status: "AKTIF",
      }).select("id").single();
      clientIds.push(cl!.id);
    }

    // Demo: grant permission to 4 clients (idx 0,1,5,6); submit report for 2 (idx 0,5)
    const y = now.getFullYear(), m = now.getMonth() + 1;
    const grantIdx = [0, 1, 5, 6];
    const reportIdx = [0, 5];
    for (const i of grantIdx) {
      await admin.from("reporting_permissions").insert({
        client_id: clientIds[i],
        period_year: y, period_month: m,
        granted_by: pkIds[CLIENTS[i].pk_idx],
      });
    }
    for (const i of reportIdx) {
      await admin.from("monthly_reports").insert({
        client_id: clientIds[i],
        report_year: y, report_month: m,
        job_status: "Bekerja",
        notes: "Data demo",
        lat: -7.9666,
        lng: 112.6326,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      pegawai_created: PEGAWAI.length,
      clients_created: CLIENTS.length,
      permissions_granted: grantIdx.length,
      reports_submitted: reportIdx.length,
      password: PASSWORD,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
