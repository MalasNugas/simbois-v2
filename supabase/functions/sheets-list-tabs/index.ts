import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;

    const { spreadsheet_id } = await req.json();
    if (!spreadsheet_id) return json({ error: "spreadsheet_id wajib" }, 400);

    // Get spreadsheet metadata (sheet names + grid sizes)
    const meta = await gatewayFetch(
      `/spreadsheets/${spreadsheet_id}?fields=spreadsheetId,properties.title,sheets(properties(sheetId,title,gridProperties))`,
    );

    const tabs: { title: string; sheetId: number; headers: string[] }[] = [];
    for (const s of meta.sheets || []) {
      const title = s.properties?.title;
      if (!title) continue;
      // Fetch first row (headers). Wrap in single quotes for safety.
      const range = `'${title.replace(/'/g, "''")}'!1:1`;
      let headers: string[] = [];
      try {
        const v = await gatewayFetch(`/spreadsheets/${spreadsheet_id}/values/${range}`);
        headers = (v.values?.[0] || []).map((h: any) => String(h ?? ""));
      } catch (_e) { /* ignore empty tab */ }
      tabs.push({ title, sheetId: s.properties.sheetId, headers });
    }

    return json({
      spreadsheet_title: meta.properties?.title ?? null,
      tabs,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
