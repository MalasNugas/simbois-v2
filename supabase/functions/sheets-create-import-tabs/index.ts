// Create import template tabs in Google Sheet (idempotent)
import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

const TEMPLATES: Record<string, string[]> = {
  "Pegawai PK Import": ["Nama Pegawai", "Email", "Password Awal", "Telepon"],
  "Clients Import": [
    "No. Litmas", "Nama Lengkap", "Email", "Password Awal", "Jenis Kelamin",
    "Tempat Lahir", "Tgl Lahir", "Telepon", "Alamat", "Status Bimbingan",
    "Status Pekerjaan", "Detail Pekerjaan", "Mulai Bimbingan", "Akhir Bimbingan", "Pegawai PK",
  ],
  "Wajib Lapor Import": [
    "No. Litmas", "Periode", "Tanggal Lapor", "Status Pekerjaan",
    "Status Operasional", "Latitude", "Longitude", "Catatan",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const { data: settings } = await admin
      .from("sheet_integration_settings").select("spreadsheet_id").limit(1).maybeSingle();
    if (!settings) return json({ error: "Belum ada konfigurasi spreadsheet" }, 400);
    const sid = settings.spreadsheet_id;

    // Check existing tabs
    const meta = await gatewayFetch(`/spreadsheets/${sid}?fields=sheets(properties(title))`);
    const existing = new Set((meta.sheets || []).map((s: any) => s.properties?.title));

    const toAdd = Object.keys(TEMPLATES).filter((name) => !existing.has(name));
    const results: Record<string, string> = {};

    // Add missing tabs in one batchUpdate
    if (toAdd.length > 0) {
      await gatewayFetch(`/spreadsheets/${sid}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: toAdd.map((title) => ({ addSheet: { properties: { title } } })),
        }),
      });
      for (const t of toAdd) results[t] = "created";
    }
    for (const t of Object.keys(TEMPLATES)) if (!results[t]) results[t] = "already_exists";

    // Write headers to ALL template tabs (overwrites row 1 only, safe)
    for (const [tab, headers] of Object.entries(TEMPLATES)) {
      const quoted = `'${tab.replace(/'/g, "''")}'`;
      try {
        await gatewayFetch(
          `/spreadsheets/${sid}/values/${quoted}!A1?valueInputOption=USER_ENTERED`,
          { method: "PUT", body: JSON.stringify({ values: [headers], majorDimension: "ROWS" }) },
        );
      } catch (e) {
        results[tab] = `header_error: ${(e as Error).message}`;
      }
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
