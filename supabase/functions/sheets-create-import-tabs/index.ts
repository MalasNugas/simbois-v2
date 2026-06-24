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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const msg = (e as Error).message || "";
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        const wait = 1500 * (i + 1);
        console.warn(`${label} rate-limited, retry in ${wait}ms`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const { data: settings, error: sErr } = await admin
      .from("sheet_integration_settings").select("spreadsheet_id").limit(1).maybeSingle();
    if (sErr) { console.error("settings error:", sErr); return json({ error: sErr.message }, 500); }
    if (!settings?.spreadsheet_id) return json({ error: "Belum ada konfigurasi spreadsheet" }, 400);
    const sid = settings.spreadsheet_id;
    console.log("create-import-tabs for", sid);

    // Check existing tabs
    const meta = await withRetry("get meta", () =>
      gatewayFetch(`/spreadsheets/${sid}?fields=sheets(properties(title))`),
    );
    const existing = new Set((meta.sheets || []).map((s: any) => s.properties?.title));
    console.log("existing tabs:", [...existing]);

    const toAdd = Object.keys(TEMPLATES).filter((name) => !existing.has(name));
    const results: Record<string, string> = {};

    if (toAdd.length > 0) {
      await withRetry("batchUpdate addSheet", () =>
        gatewayFetch(`/spreadsheets/${sid}:batchUpdate`, {
          method: "POST",
          body: JSON.stringify({
            requests: toAdd.map((title) => ({ addSheet: { properties: { title } } })),
          }),
        }),
      );
      for (const t of toAdd) results[t] = "created";
    }
    for (const t of Object.keys(TEMPLATES)) if (!results[t]) results[t] = "already_exists";

    // Write headers sequentially with small spacing to avoid rate limit
    for (const [tab, headers] of Object.entries(TEMPLATES)) {
      const quoted = `'${tab.replace(/'/g, "''")}'`;
      try {
        await withRetry(`headers ${tab}`, () =>
          gatewayFetch(
            `/spreadsheets/${sid}/values/${quoted}!A1?valueInputOption=USER_ENTERED`,
            { method: "PUT", body: JSON.stringify({ values: [headers], majorDimension: "ROWS" }) },
          ),
        );
      } catch (e) {
        console.error(`header error ${tab}:`, (e as Error).message);
        results[tab] = `header_error: ${(e as Error).message}`;
      }
      await sleep(300);
    }

    return json({ ok: true, results });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("create-import-tabs fatal:", msg);
    // Friendly message for common cases
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return json({ error: "Google Sheets sedang membatasi permintaan (rate limit). Tunggu 1 menit lalu coba lagi." }, 429);
    }
    if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
      return json({ error: "Connector Google tidak punya akses Editor ke spreadsheet ini. Share spreadsheet ke akun Google connector sebagai Editor." }, 403);
    }
    if (msg.includes("404") || msg.includes("NOT_FOUND")) {
      return json({ error: "Spreadsheet tidak ditemukan. Periksa URL/ID di pengaturan." }, 404);
    }
    return json({ error: msg }, 500);
  }
});
