// Push DB → Google Sheet (clients, monthly_reports, reporting_permissions)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, requireAdmin, gatewayFetch } from "../_shared/sheets.ts";

type Mapping = Record<string, Record<string, string>>; // { clients: { full_name: 'Nama' } }

function rowsFor(records: any[], mapping: Record<string, string> | undefined, fallbackKeys: string[]) {
  const headers = mapping && Object.keys(mapping).length
    ? Object.values(mapping)
    : fallbackKeys;
  const dbKeys = mapping && Object.keys(mapping).length
    ? Object.keys(mapping)
    : fallbackKeys;
  const rows = records.map((r) =>
    dbKeys.map((k) => {
      const v = r[k];
      if (v == null) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    })
  );
  return [headers, ...rows];
}

async function pushTab(spreadsheet_id: string, tab: string, values: any[][]) {
  const quoted = `'${tab.replace(/'/g, "''")}'`;
  // Clear existing values
  await gatewayFetch(`/spreadsheets/${spreadsheet_id}/values/${quoted}:clear`, {
    method: "POST",
    body: "{}",
  });
  // Write new values
  await gatewayFetch(
    `/spreadsheets/${spreadsheet_id}/values/${quoted}!A1?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values, majorDimension: "ROWS" }) },
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

    const mapping = (settings.column_mapping || {}) as Mapping;

    // Pull data with joined profile names for readability
    const [{ data: clients }, { data: reports }, { data: perms }, { data: profiles }] = await Promise.all([
      admin.from("clients").select("*"),
      admin.from("monthly_reports").select("*").order("report_year", { ascending: false }).order("report_month", { ascending: false }),
      admin.from("reporting_permissions").select("*").order("granted_at", { ascending: false }),
      admin.from("profiles").select("user_id, full_name, phone"),
    ]);
    const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const clientRows = (clients || []).map((c: any) => ({
      id: c.id,
      full_name: pmap.get(c.user_id)?.full_name ?? "",
      case_number: c.case_number,
      phone: pmap.get(c.user_id)?.phone ?? "",
      assigned_pk_name: c.assigned_pk_id ? (pmap.get(c.assigned_pk_id)?.full_name ?? "") : "",
      address: c.address ?? "",
      status: c.status ?? "",
      created_at: c.created_at,
    }));
    const reportRows = (reports || []).map((r: any) => {
      const cli = (clients || []).find((c: any) => c.id === r.client_id);
      return {
        id: r.id,
        client_name: cli ? pmap.get(cli.user_id)?.full_name ?? "" : "",
        case_number: cli?.case_number ?? "",
        report_year: r.report_year,
        report_month: r.report_month,
        job_status: r.job_status ?? "",
        lat: r.lat ?? "",
        lng: r.lng ?? "",
        submitted_via: r.submitted_via ?? "",
        created_at: r.created_at,
      };
    });
    const permRows = (perms || []).map((p: any) => {
      const cli = (clients || []).find((c: any) => c.id === p.client_id);
      return {
        id: p.id,
        client_name: cli ? pmap.get(cli.user_id)?.full_name ?? "" : "",
        case_number: cli?.case_number ?? "",
        pegawai_name: p.pegawai_id ? pmap.get(p.pegawai_id)?.full_name ?? "" : "",
        period_year: p.period_year,
        period_month: p.period_month,
        granted_at: p.granted_at,
        revoked_at: p.revoked_at ?? "",
        note: p.note ?? "",
      };
    });

    const clientKeys = ["id", "full_name", "case_number", "phone", "assigned_pk_name", "address", "status", "created_at"];
    const reportKeys = ["id", "client_name", "case_number", "report_year", "report_month", "job_status", "lat", "lng", "submitted_via", "created_at"];
    const permKeys = ["id", "client_name", "case_number", "pegawai_name", "period_year", "period_month", "granted_at", "revoked_at", "note"];

    const results: Record<string, { rows: number; ok: boolean; error?: string }> = {};

    for (const job of [
      { tab: settings.clients_sheet_name, rows: clientRows, keys: clientKeys, mapKey: "clients" },
      { tab: settings.reports_sheet_name, rows: reportRows, keys: reportKeys, mapKey: "reports" },
      { tab: settings.permissions_sheet_name, rows: permRows, keys: permKeys, mapKey: "permissions" },
    ]) {
      try {
        const values = rowsFor(job.rows, mapping[job.mapKey], job.keys);
        await pushTab(settings.spreadsheet_id, job.tab, values);
        results[job.mapKey] = { rows: job.rows.length, ok: true };
      } catch (e) {
        results[job.mapKey] = { rows: job.rows.length, ok: false, error: (e as Error).message };
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
