// Push DB → Google Sheet: 6 tabs (Clients, Wajib Lapor, Izin Lapor, Pegawai PK, Rekap Bulanan, Tracking Lokasi)
import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

// Geofencing wilayah Malang (sesuai memory project)
const GEO = { latMin: -8.6, latMax: -7.55, lngMin: 112.15, lngMax: 113.5 };
const inWilayah = (lat?: number | null, lng?: number | null) =>
  lat != null && lng != null && lat >= GEO.latMin && lat <= GEO.latMax && lng >= GEO.lngMin && lng <= GEO.lngMax;

const BULAN = ["", "Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "";
const fmtDay = (s?: string | null) => s ? new Date(s).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "";

type TabSpec = { name: string; headers: string[]; rows: (string | number)[][] };

async function ensureTabs(spreadsheet_id: string, tabNames: string[]) {
  const meta = await gatewayFetch(`/spreadsheets/${spreadsheet_id}`);
  const existing = new Set((meta.sheets || []).map((s: any) => s.properties.title));
  const toAdd = tabNames.filter((n) => !existing.has(n));
  if (toAdd.length === 0) return;
  await gatewayFetch(`/spreadsheets/${spreadsheet_id}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: toAdd.map((title) => ({ addSheet: { properties: { title } } })),
    }),
  });
}

async function pushTab(spreadsheet_id: string, tab: string, headers: string[], rows: (string|number)[][]) {
  const quoted = `'${tab.replace(/'/g, "''")}'`;
  await gatewayFetch(`/spreadsheets/${spreadsheet_id}/values/${quoted}:clear`, { method: "POST", body: "{}" });
  await gatewayFetch(
    `/spreadsheets/${spreadsheet_id}/values/${quoted}!A1?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values: [headers, ...rows], majorDimension: "ROWS" }) },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const { data: settings, error: sErr } = await admin
      .from("sheet_integration_settings").select("*").limit(1).maybeSingle();
    if (sErr) throw sErr;
    if (!settings) return json({ error: "Belum ada konfigurasi spreadsheet" }, 400);

    // Fetch everything in parallel
    const [
      { data: clients },
      { data: reports },
      { data: perms },
      { data: profiles },
      { data: roles },
      { data: tracking },
    ] = await Promise.all([
      admin.from("clients").select("*"),
      admin.from("monthly_reports").select("*").order("report_year", { ascending: false }).order("report_month", { ascending: false }),
      admin.from("reporting_permissions").select("*").order("granted_at", { ascending: false }),
      admin.from("profiles").select("user_id, full_name, phone, address, birth_date, birth_place, gender, created_at"),
      admin.from("user_roles").select("user_id, role"),
      admin.from("location_tracking").select("*").order("tracked_at", { ascending: false }).limit(1000),
    ]);

    const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const cmap = new Map((clients || []).map((c: any) => [c.id, c]));
    const pegawaiIds = new Set((roles || []).filter((r: any) => r.role === "pegawai").map((r: any) => r.user_id));

    // ---------- 1. Clients ----------
    const clientsTab: TabSpec = {
      name: settings.clients_sheet_name || "Clients",
      headers: ["No. Litmas","Nama Lengkap","Jenis Kelamin","Tempat, Tgl Lahir","Telepon","Alamat","Status Bimbingan","Status Pekerjaan","Detail Pekerjaan","Mulai Bimbingan","Akhir Bimbingan","Pegawai PK","Rujukan Disnaker","Tgl Registrasi"],
      rows: (clients || []).map((c: any) => {
        const p = pmap.get(c.user_id) || {};
        const pk = c.assigned_pk_id ? pmap.get(c.assigned_pk_id) : null;
        const ttl = [p.birth_place, fmtDay(p.birth_date)].filter(Boolean).join(", ");
        return [
          c.case_number || "",
          p.full_name || "",
          p.gender || "",
          ttl,
          p.phone || "",
          p.address || "",
          c.guidance_status || c.client_status || "",
          c.employment_status || "",
          c.employment_details || "",
          fmtDay(c.guidance_start),
          fmtDay(c.guidance_end),
          pk?.full_name || "Belum ditugaskan",
          c.referred_to_disnaker ? "Ya" : "Tidak",
          fmtDate(c.created_at),
        ];
      }),
    };

    // ---------- 2. Wajib Lapor ----------
    const reportsTab: TabSpec = {
      name: settings.reports_sheet_name || "Wajib Lapor",
      headers: ["No. Litmas","Nama Klien","Periode","Tanggal Lapor","Status Pekerjaan","Status Operasional","Latitude","Longitude","Status Lokasi","Metode","Catatan","URL Selfie"],
      rows: (reports || []).map((r: any) => {
        const cli = cmap.get(r.client_id);
        const pname = cli ? pmap.get(cli.user_id)?.full_name || "" : "";
        return [
          cli?.case_number || "",
          pname,
          `${BULAN[r.report_month] || r.report_month} ${r.report_year}`,
          fmtDate(r.report_date || r.created_at),
          r.job_status || "",
          r.operational_status || "",
          r.lat ?? "",
          r.lng ?? "",
          inWilayah(r.lat, r.lng) ? "Di Dalam Wilayah" : "Di Luar Wilayah",
          r.submitted_via || "",
          r.notes || "",
          r.selfie_url || "",
        ];
      }),
    };

    // ---------- 3. Izin Lapor ----------
    const permsTab: TabSpec = {
      name: settings.permissions_sheet_name || "Izin Lapor",
      headers: ["No. Litmas","Nama Klien","Pegawai PK","Periode Izin","Tgl Diberikan","Tgl Dicabut","Tgl Digunakan","Status","Catatan"],
      rows: (perms || []).map((p: any) => {
        const cli = cmap.get(p.client_id);
        const cname = cli ? pmap.get(cli.user_id)?.full_name || "" : "";
        const pk = p.pegawai_id ? pmap.get(p.pegawai_id)?.full_name || "" : "";
        const status = p.revoked_at ? "Dicabut" : p.used_at ? "Sudah digunakan" : "Aktif";
        return [
          cli?.case_number || "",
          cname,
          pk,
          `${BULAN[p.period_month] || p.period_month} ${p.period_year}`,
          fmtDate(p.granted_at),
          fmtDate(p.revoked_at),
          fmtDate(p.used_at),
          status,
          p.note || "",
        ];
      }),
    };

    // ---------- 4. Pegawai PK ----------
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    const pegawaiTab: TabSpec = {
      name: "Pegawai PK",
      headers: ["Nama Pegawai","Telepon","Jumlah Klien Aktif","Jumlah Klien Selesai","Laporan Bulan Ini","Bergabung Sejak"],
      rows: (profiles || [])
        .filter((p: any) => pegawaiIds.has(p.user_id))
        .map((p: any) => {
          const myClients = (clients || []).filter((c: any) => c.assigned_pk_id === p.user_id);
          const active = myClients.filter((c: any) => (c.guidance_status || c.client_status) === "aktif" || (c.guidance_status || c.client_status) === "active").length;
          const done = myClients.filter((c: any) => ["selesai","done","terminated"].includes((c.guidance_status || c.client_status || "").toLowerCase())).length;
          const myClientIds = new Set(myClients.map((c: any) => c.id));
          const reportsThisMonth = (reports || []).filter((r: any) =>
            myClientIds.has(r.client_id) && r.report_month === thisMonth && r.report_year === thisYear).length;
          return [
            p.full_name || "",
            p.phone || "",
            active,
            done,
            reportsThisMonth,
            fmtDay(p.created_at),
          ];
        }),
    };

    // ---------- 5. Rekap Bulanan (12 bulan terakhir) ----------
    const rekap: TabSpec = {
      name: "Rekap Bulanan",
      headers: ["Periode","Total Lapor","Klien Lapor (Unik)","Izin Diberikan","Lapor Di Luar Wilayah"],
      rows: [],
    };
    for (let i = 0; i < 12; i++) {
      const d = new Date(thisYear, thisMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const monthReports = (reports || []).filter((r: any) => r.report_year === y && r.report_month === m);
      const uniqClients = new Set(monthReports.map((r: any) => r.client_id)).size;
      const monthPerms = (perms || []).filter((p: any) => p.period_year === y && p.period_month === m).length;
      const outside = monthReports.filter((r: any) => !inWilayah(r.lat, r.lng)).length;
      rekap.rows.push([`${BULAN[m]} ${y}`, monthReports.length, uniqClients, monthPerms, outside]);
    }

    // ---------- 6. Tracking Lokasi ----------
    const trackingTab: TabSpec = {
      name: "Tracking Lokasi",
      headers: ["Nama","No. Litmas","Waktu","Latitude","Longitude","Akurasi (m)","Status Lokasi"],
      rows: (tracking || []).map((t: any) => {
        const prof = pmap.get(t.user_id);
        const cli = (clients || []).find((c: any) => c.user_id === t.user_id);
        return [
          prof?.full_name || "",
          cli?.case_number || "",
          fmtDate(t.tracked_at),
          t.latitude ?? "",
          t.longitude ?? "",
          t.accuracy ?? "",
          inWilayah(t.latitude, t.longitude) ? "Di Dalam Wilayah" : "Di Luar Wilayah",
        ];
      }),
    };

    const allTabs = [clientsTab, reportsTab, permsTab, pegawaiTab, rekap, trackingTab];

    // Auto-create missing tabs
    try {
      await ensureTabs(settings.spreadsheet_id, allTabs.map((t) => t.name));
    } catch (e) {
      // continue — pushTab may still succeed if tabs exist
      console.error("ensureTabs warn:", (e as Error).message);
    }

    const results: Record<string, { rows: number; ok: boolean; error?: string }> = {};
    for (const t of allTabs) {
      try {
        await pushTab(settings.spreadsheet_id, t.name, t.headers, t.rows);
        results[t.name] = { rows: t.rows.length, ok: true };
      } catch (e) {
        results[t.name] = { rows: t.rows.length, ok: false, error: (e as Error).message };
      }
    }

    const anyFailed = Object.values(results).some((r) => !r.ok);
    await admin.from("sheet_integration_settings").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: anyFailed ? "partial_error" : "success",
      last_sync_error: anyFailed ? JSON.stringify(results) : null,
    }).eq("id", settings.id);

    return json({ ok: !anyFailed, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
