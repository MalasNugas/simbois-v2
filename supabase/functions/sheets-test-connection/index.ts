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

    // Probe write access via a no-op batchUpdate: set title to its current value.
    // 200 => Editor; 403 => Viewer/Commenter only.
    let canWrite = false;
    let writeError: string | null = null;
    try {
      await gatewayFetch(`/spreadsheets/${spreadsheet_id}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              updateSpreadsheetProperties: {
                properties: { title: meta.properties?.title ?? "" },
                fields: "title",
              },
            },
          ],
        }),
      });
      canWrite = true;
    } catch (e) {
      const msg = (e as Error).message || "";
      writeError = msg;
      if (!/403|PERMISSION_DENIED/i.test(msg)) {
        // Non-permission failure — surface but don't block: maybe quota; treat as unknown
        canWrite = false;
      }
    }

    return json({
      ok: true,
      title: meta.properties?.title ?? null,
      sheet_count: (meta.sheets || []).length,
      sheet_names: (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean),
      can_write: canWrite,
      write_error: canWrite ? null : writeError,
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
