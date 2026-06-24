// Pull Google Sheet → DB: import Pegawai PK, Clients, optional Wajib Lapor
import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

type Row = Record<string, string>;

async function readTab(spreadsheet_id: string, tab: string): Promise<Row[]> {
  const quoted = `'${tab.replace(/'/g, "''")}'`;
  const res = await gatewayFetch(`/spreadsheets/${spreadsheet_id}/values/${quoted}`);
  const values: string[][] = res?.values || [];
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h || "").trim());
  return values.slice(1).map((r) => {
    const o: Row = {};
    headers.forEach((h, i) => { o[h] = String(r[i] ?? "").trim(); });
    return o;
  }).filter((r) => Object.values(r).some((v) => v !== ""));
}

const parseDate = (s?: string) => {
  if (!s) return null;
  // accept YYYY-MM-DD, DD/MM/YYYY, or any Date-parseable
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const parsePeriode = (s: string): { year: number; month: number } | null => {
  // YYYY-MM
  const m1 = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m1) return { year: +m1[1], month: +m1[2] };
  // "Januari 2025"
  const BULAN = ["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];
  const m2 = s.toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (m2) {
    const idx = BULAN.indexOf(m2[1]);
    if (idx >= 0) return { year: +m2[2], month: idx + 1 };
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    const importPegawai = body.pegawai !== false;
    const importClients = body.clients !== false;
    const importReports = body.reports === true;
    const pegawaiTabName = body.pegawai_tab || "Pegawai PK Import";
    const clientsTabName = body.clients_tab || "Clients Import";
    const reportsTabName = body.reports_tab || "Wajib Lapor Import";

    const { data: settings } = await admin
      .from("sheet_integration_settings").select("*").limit(1).maybeSingle();
    if (!settings) return json({ error: "Belum ada konfigurasi spreadsheet" }, 400);
    const sid = settings.spreadsheet_id;

    const results: Record<string, any> = {};

    // ---- Pegawai PK ----
    if (importPegawai) {
      const r = { created: 0, skipped: 0, errors: [] as string[] };
      try {
        const rows = await readTab(sid, pegawaiTabName);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const email = (row["Email"] || "").toLowerCase();
          const password = row["Password Awal"] || row["Password"];
          const full_name = row["Nama Pegawai"] || row["Nama Lengkap"];
          const phone = row["Telepon"] || null;
          if (!email || !password || !full_name) {
            r.errors.push(`Baris ${i + 2}: Email/Password/Nama wajib`); continue;
          }
          // skip if email exists
          const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const exists = existing?.users?.find((u: any) => u.email?.toLowerCase() === email);
          if (exists) { r.skipped++; continue; }
          const { data: created, error: cErr } = await admin.auth.admin.createUser({
            email, password, email_confirm: true, user_metadata: { full_name },
          });
          if (cErr || !created.user) { r.errors.push(`Baris ${i + 2} (${email}): ${cErr?.message}`); continue; }
          await admin.from("user_roles").insert({ user_id: created.user.id, role: "pegawai" });
          if (phone) await admin.from("profiles").update({ phone }).eq("user_id", created.user.id);
          r.created++;
        }
      } catch (e) {
        r.errors.push((e as Error).message);
      }
      results.pegawai = r;
    }

    // ---- Clients ----
    if (importClients) {
      const r = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
      try {
        const rows = await readTab(sid, clientsTabName);

        // Lookup pegawai by full_name
        const { data: pegProfiles } = await admin
          .from("profiles").select("user_id, full_name");
        const { data: pegRoles } = await admin
          .from("user_roles").select("user_id").eq("role", "pegawai");
        const pegIds = new Set((pegRoles || []).map((r: any) => r.user_id));
        const pegByName = new Map(
          (pegProfiles || []).filter((p: any) => pegIds.has(p.user_id))
            .map((p: any) => [String(p.full_name || "").toLowerCase().trim(), p.user_id]),
        );

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const case_number = row["No. Litmas"] || row["No Litmas"];
          const email = (row["Email"] || "").toLowerCase();
          const password = row["Password Awal"] || row["Password"];
          const full_name = row["Nama Lengkap"] || row["Nama Klien"];
          if (!case_number || !full_name) { r.errors.push(`Baris ${i + 2}: No. Litmas & Nama wajib`); continue; }

          const pkName = (row["Pegawai PK"] || "").toLowerCase().trim();
          const assigned_pk_id = pkName ? pegByName.get(pkName) || null : null;

          const profilePatch = {
            full_name,
            phone: row["Telepon"] || null,
            address: row["Alamat"] || null,
            gender: row["Jenis Kelamin"] || null,
            birth_place: row["Tempat Lahir"] || null,
            birth_date: parseDate(row["Tgl Lahir"]),
          };
          const clientPatch: any = {
            case_number,
            guidance_status: row["Status Bimbingan"] || null,
            employment_status: row["Status Pekerjaan"] || null,
            employment_details: row["Detail Pekerjaan"] || null,
            guidance_start: parseDate(row["Mulai Bimbingan"]),
            guidance_end: parseDate(row["Akhir Bimbingan"]),
            assigned_pk_id,
          };

          // Find existing client by case_number
          const { data: existingClient } = await admin
            .from("clients").select("id, user_id").eq("case_number", case_number).maybeSingle();

          if (existingClient) {
            await admin.from("profiles").update(profilePatch).eq("user_id", existingClient.user_id);
            await admin.from("clients").update(clientPatch).eq("id", existingClient.id);
            r.updated++;
          } else {
            if (!email || !password) {
              r.errors.push(`Baris ${i + 2} (${case_number}): Email & Password Awal wajib untuk klien baru`); continue;
            }
            // create auth user
            const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const exists = list?.users?.find((u: any) => u.email?.toLowerCase() === email);
            let userId: string;
            if (exists) {
              userId = exists.id;
            } else {
              const { data: created, error: cErr } = await admin.auth.admin.createUser({
                email, password, email_confirm: true, user_metadata: { full_name },
              });
              if (cErr || !created.user) { r.errors.push(`Baris ${i + 2} (${case_number}): ${cErr?.message}`); continue; }
              userId = created.user.id;
            }
            await admin.from("user_roles").upsert({ user_id: userId, role: "client" }, { onConflict: "user_id,role" });
            await admin.from("profiles").update(profilePatch).eq("user_id", userId);
            await admin.from("clients").insert({ ...clientPatch, user_id: userId });
            r.created++;
          }
        }
      } catch (e) {
        r.errors.push((e as Error).message);
      }
      results.clients = r;
    }

    // ---- Wajib Lapor (opsional) ----
    if (importReports) {
      const r = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
      try {
        const rows = await readTab(sid, reportsTabName);
        const { data: allClients } = await admin.from("clients").select("id, case_number");
        const byCase = new Map((allClients || []).map((c: any) => [c.case_number, c.id]));

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const cn = row["No. Litmas"] || row["No Litmas"];
          const per = parsePeriode(row["Periode"] || "");
          const reportDate = parseDate(row["Tanggal Lapor"]);
          if (!cn || !per || !reportDate) {
            r.errors.push(`Baris ${i + 2}: No. Litmas / Periode (YYYY-MM) / Tanggal Lapor wajib`); continue;
          }
          const client_id = byCase.get(cn);
          if (!client_id) { r.errors.push(`Baris ${i + 2}: Klien ${cn} tidak ditemukan`); continue; }

          const lat = row["Latitude"] ? parseFloat(row["Latitude"]) : null;
          const lng = row["Longitude"] ? parseFloat(row["Longitude"]) : null;
          const patch = {
            client_id,
            report_year: per.year,
            report_month: per.month,
            report_date: reportDate,
            job_status: row["Status Pekerjaan"] || null,
            operational_status: row["Status Operasional"] || null,
            lat: Number.isFinite(lat as number) ? lat : null,
            lng: Number.isFinite(lng as number) ? lng : null,
            notes: row["Catatan"] || null,
            submitted_via: "import_sheet",
          };
          const { data: existing } = await admin.from("monthly_reports")
            .select("id").eq("client_id", client_id)
            .eq("report_year", per.year).eq("report_month", per.month).maybeSingle();
          if (existing) {
            await admin.from("monthly_reports").update(patch).eq("id", existing.id);
            r.updated++;
          } else {
            await admin.from("monthly_reports").insert(patch);
            r.created++;
          }
        }
      } catch (e) {
        r.errors.push((e as Error).message);
      }
      results.reports = r;
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
