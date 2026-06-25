// Pull Google Sheet → DB: update existing Clients (No. Litmas, Nama Lengkap, Pegawai PK)
import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

type Row = Record<string, string>;

function quoteTab(tab: string) {
  return `'${tab.replace(/'/g, "''")}'`;
}

function formatSheetsImportError(error: unknown) {
  const msg = (error as Error).message || String(error);
  if (msg.includes("Google Sheets 429") || msg.includes("RATE_LIMIT_EXCEEDED") || msg.includes("Quota exceeded")) {
    return "Kuota baca Google Sheets sedang penuh (429). Tunggu 1–2 menit lalu klik Tarik dari Sheet lagi.";
  }
  if (msg.includes("Unable to parse range") || msg.includes("Google Sheets 400")) {
    return 'Tab "Clients Import" belum ada. Klik "Buat Template Tab" terlebih dahulu.';
  }
  return msg;
}

function rowsFromValues(values: string[][] = []): Row[] {
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h || "").trim());
  return values.slice(1).map((r) => {
    const o: Row = {};
    headers.forEach((h, i) => { o[h] = String(r[i] ?? "").trim(); });
    return o;
  }).filter((r) => Object.values(r).some((v) => v !== ""));
}

Deno.serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error as Response;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    const clientsTabName = body.clients_tab || "Clients Import";

    const { data: settings } = await admin
      .from("sheet_integration_settings").select("*").limit(1).maybeSingle();
    if (!settings) return json({ error: "Belum ada konfigurasi spreadsheet" }, 400);
    const sid = settings.spreadsheet_id;

    let rows: Row[] = [];
    try {
      const res = await gatewayFetch(
        `/spreadsheets/${sid}/values:batchGet?ranges=${encodeURIComponent(quoteTab(clientsTabName))}`,
      );
      const valueRanges: Array<{ values?: string[][] }> = res?.valueRanges || [];
      rows = rowsFromValues(valueRanges[0]?.values || []);
    } catch (e) {
      return json({ ok: true, results: { clients: { created: 0, updated: 0, skipped: 0, errors: [formatSheetsImportError(e)] } } });
    }

    const r = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

    // Lookup pegawai by full_name (case-insensitive)
    const { data: pegProfiles } = await admin.from("profiles").select("user_id, full_name");
    const { data: pegRoles } = await admin.from("user_roles").select("user_id").eq("role", "pegawai");
    const pegIds = new Set((pegRoles || []).map((r: any) => r.user_id));
    const pegByName = new Map(
      (pegProfiles || []).filter((p: any) => pegIds.has(p.user_id))
        .map((p: any) => [String(p.full_name || "").toLowerCase().trim(), p.user_id]),
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const case_number = (row["No. Litmas"] || row["No Litmas"] || "").trim();
      const full_name = (row["Nama Lengkap"] || row["Nama Klien"] || "").trim();
      const pkNameRaw = (row["Pegawai PK"] || "").trim();
      const pkName = pkNameRaw.toLowerCase();

      if (!case_number || !full_name) {
        r.errors.push(`Baris ${i + 2}: No. Litmas & Nama Lengkap wajib`); continue;
      }

      const { data: existingClient } = await admin
        .from("clients").select("id, user_id").eq("case_number", case_number).maybeSingle();

      if (!existingClient) {
        r.skipped++;
        r.errors.push(`Baris ${i + 2} (${case_number}): Klien belum ada. Tambah klien via dashboard admin terlebih dahulu.`);
        continue;
      }

      let assigned_pk_id: string | null = null;
      if (pkName) {
        assigned_pk_id = pegByName.get(pkName) || null;
        if (!assigned_pk_id) {
          r.errors.push(`Baris ${i + 2} (${case_number}): Pegawai PK "${pkNameRaw}" tidak ditemukan — kolom lain tetap di-update.`);
        }
      }

      await admin.from("profiles").update({ full_name }).eq("user_id", existingClient.user_id);
      const clientPatch: any = { case_number };
      if (assigned_pk_id !== null || !pkName) clientPatch.assigned_pk_id = assigned_pk_id;
      await admin.from("clients").update(clientPatch).eq("id", existingClient.id);
      r.updated++;
    }

    return json({ ok: true, results: { clients: r } });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
