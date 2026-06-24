import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;

    const { spreadsheet_id } = await req.json();
    if (!spreadsheet_id) return json({ error: "spreadsheet_id wajib" }, 400);

    // Get spreadsheet metadata (sheet names only — single API call)
    const meta = await gatewayFetch(
      `/spreadsheets/${spreadsheet_id}?fields=spreadsheetId,properties.title,sheets(properties(sheetId,title))`,
    );

    const sheets = (meta.sheets || []) as any[];
    const titles = sheets.map((s) => s.properties?.title).filter(Boolean);

    // Batch-fetch all headers in ONE call to avoid 429 rate limit
    let headersByTitle = new Map<string, string[]>();
    if (titles.length > 0) {
      try {
        const ranges = titles.map((t) => `ranges=${encodeURIComponent(`'${t.replace(/'/g, "''")}'!1:1`)}`).join("&");
        const batch = await gatewayFetch(`/spreadsheets/${spreadsheet_id}/values:batchGet?${ranges}`);
        const valueRanges = batch.valueRanges || [];
        valueRanges.forEach((vr: any, i: number) => {
          headersByTitle.set(titles[i], (vr.values?.[0] || []).map((h: any) => String(h ?? "")));
        });
      } catch (_e) { /* ignore — headers optional */ }
    }

    const tabs = sheets.map((s) => ({
      title: s.properties?.title,
      sheetId: s.properties?.sheetId,
      headers: headersByTitle.get(s.properties?.title) || [],
    })).filter((t) => t.title);

    return json({
      spreadsheet_title: meta.properties?.title ?? null,
      tabs,
    });
  } catch (e) {
    const msg = (e as Error).message || "";
    // Rate-limited or transient — return 200 with structured warning so UI doesn't crash
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return json({
        tabs: [],
        warning: "rate_limited",
        error: "Google Sheets sedang membatasi permintaan (429). Coba lagi dalam 1 menit.",
      });
    }
    return json({ error: msg }, 500);
  }
});
