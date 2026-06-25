// Pull Google Sheet → DB: update existing Clients (No. Litmas, Nama Lengkap, Pegawai PK)
import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

type Row = Record<string, string>;

function quoteTab(tab: string) {
  return `'${tab.replace(/'/g, "''")}'`;
}

function normHeader(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSheetsImportError(error: unknown) {
  const msg = (error as Error).message || String(error);
  if (msg.includes("Google Sheets 429") || msg.includes("RATE_LIMIT_EXCEEDED") || msg.includes("Quota exceeded")) {
    return "Kuota baca Google Sheets sedang penuh (429). Tunggu 1–2 menit lalu klik Tarik dari Sheet lagi.";
  }
  if (msg.includes("Google Sheets 502") || msg.includes("Google Sheets 503") || msg.includes("Google Sheets 504") || msg.includes("upstream_request_failed")) {
    return "Gateway Google Sheets sedang gangguan sementara (502/503). Coba klik Tarik dari Sheet lagi dalam beberapa detik.";
  }
  if (msg.includes("Unable to parse range") || msg.includes("Google Sheets 400")) {
    return 'Tab tidak ditemukan. Klik "Buat Template Tab" terlebih dahulu.';
  }
  return msg;
}

const HEADER_ALIASES = {
  case_number: ["no litmas", "no regis", "no register", "no reg", "nomor litmas", "nomor regis", "nomor register", "register", "litmas", "no kasus", "case number"],
  full_name: ["nama lengkap", "nama klien", "nama klien bimbingan", "nama klien pk", "nama", "full name"],
  pk_name: ["pegawai pk", "nama pegawai pk", "pk pembimbing", "pegawai pembimbing", "nama pk", "pembimbing", "pk", "pegawai"],
};


function pickHeaderIndex(headers: string[], aliases: string[]): number {
  const norm = headers.map(normHeader);
  for (const a of aliases) {
    const i = norm.indexOf(a);
    if (i >= 0) return i;
  }
  // partial contains
  for (let i = 0; i < norm.length; i++) {
    if (aliases.some((a) => norm[i].includes(a))) return i;
  }
  return -1;
}

Deno.serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error as Response;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    const requestedTab = (body.clients_tab || "").trim();
    const headerRowOverride = Number.isFinite(Number(body.header_row)) && Number(body.header_row) > 0
      ? Math.floor(Number(body.header_row))
      : 0;

    const { data: settings } = await admin
      .from("sheet_integration_settings").select("*").limit(1).maybeSingle();
    if (!settings) return json({ error: "Belum ada konfigurasi spreadsheet" }, 400);
    const sid = settings.spreadsheet_id;

    // 1. Auto-detect tab: prioritize user override → MASTER DATA → master/klien/client → first
    let tabUsed = requestedTab || "MASTER DATA";
    let availableTabs: string[] = [];
    try {
      const meta = await gatewayFetch(`/spreadsheets/${sid}?fields=sheets.properties.title`);
      availableTabs = (meta?.sheets || []).map((s: any) => s?.properties?.title).filter(Boolean);
      if (requestedTab) {
        const exact = availableTabs.find((t) => t === requestedTab);
        const ci = availableTabs.find((t) => t.toLowerCase() === requestedTab.toLowerCase());
        tabUsed = exact || ci || requestedTab;
      } else {
        const master = availableTabs.find((t) => t.toLowerCase() === "master data")
          || availableTabs.find((t) => /master\s*data/i.test(t))
          || availableTabs.find((t) => /master/i.test(t))
          || availableTabs.find((t) => /klien|client/i.test(t));
        tabUsed = master || availableTabs[0] || tabUsed;
      }
    } catch (e) {
      return json({ ok: true, results: { clients: { created: 0, updated: 0, skipped: 0, errors: [formatSheetsImportError(e)] } } });
    }


    // 2. Fetch values for the chosen tab (wider range so we can locate header row)
    let values: string[][] = [];
    try {
      const range = `${quoteTab(tabUsed)}!A1:Z2000`;
      const res = await gatewayFetch(
        `/spreadsheets/${sid}/values:batchGet?ranges=${encodeURIComponent(range)}`,
      );
      const valueRanges: Array<{ values?: string[][] }> = res?.valueRanges || [];
      values = valueRanges[0]?.values || [];
    } catch (e) {
      return json({ ok: true, results: { clients: { created: 0, updated: 0, skipped: 0, errors: [formatSheetsImportError(e)], tab_used: tabUsed, available_tabs: availableTabs } } });
    }

    const r: any = { created: 0, updated: 0, skipped: 0, errors: [] as string[], tab_used: tabUsed, available_tabs: availableTabs, rows_read: 0 };

    if (values.length < 2) {
      r.errors.push(`Tab "${tabUsed}" kosong atau hanya berisi header. Tambahkan data mulai baris 2. Tab tersedia: ${availableTabs.join(", ") || "(tidak ada)"}.`);
      return json({ ok: true, results: { clients: r } });
    }

    // Locate header row: override wins, else scan first 15 rows for a row recognizing both case_number & full_name
    let headerRowIdx = -1;
    if (headerRowOverride > 0 && headerRowOverride <= values.length) {
      headerRowIdx = headerRowOverride - 1;
    } else {
      const scanLimit = Math.min(15, values.length);
      for (let i = 0; i < scanLimit; i++) {
        const row = (values[i] || []).map((h) => String(h || "").trim());
        if (!row.some((c) => c)) continue;
        const c = pickHeaderIndex(row, HEADER_ALIASES.case_number);
        const n = pickHeaderIndex(row, HEADER_ALIASES.full_name);
        if (c >= 0 && n >= 0) { headerRowIdx = i; break; }
      }
    }

    if (headerRowIdx < 0) {
      const preview = values.slice(0, 10)
        .map((row, i) => `Baris ${i + 1}: [${(row || []).map((c) => String(c || "").trim()).filter(Boolean).slice(0, 8).join(" | ") || "(kosong)"}]`)
        .join(" ; ");
      r.errors.push(`Tidak menemukan baris header di tab "${tabUsed}". 10 baris teratas: ${preview}. Isi field "Baris header" dengan nomor baris yang berisi judul kolom (mis. 1, 2, atau 3).`);
      return json({ ok: true, results: { clients: r } });
    }

    const headers = (values[headerRowIdx] || []).map((h) => String(h || "").trim());
    r.headers_found = headers;
    r.header_row = headerRowIdx + 1;
    const idxCase = pickHeaderIndex(headers, HEADER_ALIASES.case_number);
    const idxName = pickHeaderIndex(headers, HEADER_ALIASES.full_name);
    const idxPk = pickHeaderIndex(headers, HEADER_ALIASES.pk_name);

    if (idxCase < 0 || idxName < 0) {
      r.errors.push(`Header tidak dikenali pada tab "${tabUsed}" (baris ${headerRowIdx + 1}). Ditemukan: [${headers.join(" | ")}]. Wajib ada kolom "No. Litmas" dan "Nama Lengkap" (opsional: "Pegawai PK").`);
      return json({ ok: true, results: { clients: r } });
    }


    // Lookup pegawai by full_name (case-insensitive)
    const { data: pegProfiles } = await admin.from("profiles").select("user_id, full_name");
    const { data: pegRoles } = await admin.from("user_roles").select("user_id").eq("role", "pegawai");
    const pegIds = new Set((pegRoles || []).map((r: any) => r.user_id));
    const pegByName = new Map(
      (pegProfiles || []).filter((p: any) => pegIds.has(p.user_id))
        .map((p: any) => [String(p.full_name || "").toLowerCase().trim(), p.user_id]),
    );

    const dataRows = values.slice(1);
    for (let i = 0; i < dataRows.length; i++) {
      const raw = dataRows[i];
      const case_number = String(raw[idxCase] ?? "").trim();
      const full_name = String(raw[idxName] ?? "").trim();
      const pkNameRaw = idxPk >= 0 ? String(raw[idxPk] ?? "").trim() : "";
      const pkName = pkNameRaw.toLowerCase();

      if (!case_number && !full_name && !pkNameRaw) continue; // skip empty row silently

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
