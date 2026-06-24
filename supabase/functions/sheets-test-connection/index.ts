import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;

    const { spreadsheet_id } = await req.json();
    if (!spreadsheet_id) return json({ error: "spreadsheet_id wajib" }, 400);

    const meta = await gatewayFetch(
      `/spreadsheets/${spreadsheet_id}?fields=spreadsheetId,properties.title,sheets.properties.title`,
    );
    return json({
      ok: true,
      title: meta.properties?.title ?? null,
      sheet_count: (meta.sheets || []).length,
      sheet_names: (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean),
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
