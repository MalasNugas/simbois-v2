import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Save, Download, PlugZap, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : input.trim();
}

export default function IntegrasiSpreadsheet() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [creatingTabs, setCreatingTabs] = useState(false);
  const [pullResult, setPullResult] = useState<any>(null);
  const [canWrite, setCanWrite] = useState<boolean | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const [settings, setSettings] = useState<any>(null);
  const [urlInput, setUrlInput] = useState('');
  const [clientsTab, setClientsTab] = useState('');


  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== 'admin') { navigate('/login'); return; }
    load();
  }, [user, role, authLoading]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('sheet_integration_settings').select('*').limit(1).maybeSingle();
    if (data) {
      setSettings(data);
      setUrlInput(data.spreadsheet_url || `https://docs.google.com/spreadsheets/d/${data.spreadsheet_id}`);
    }
    setLoading(false);
  };

  const handleTest = async () => {
    const id = extractSpreadsheetId(urlInput);
    if (!id) { toast.error('URL/ID spreadsheet kosong'); return; }
    setTesting(true);
    setCanWrite(null);
    setWriteError(null);
    const { data, error } = await supabase.functions.invoke('sheets-test-connection', { body: { spreadsheet_id: id } });
    setTesting(false);
    if (error || !(data as any)?.ok) {
      toast.error((data as any)?.error || error?.message || 'Koneksi gagal');
      return;
    }
    const d = data as any;
    setCanWrite(!!d.can_write);
    setWriteError(d.write_error || null);
    if (d.can_write) {
      toast.success(`Terhubung sebagai Editor: ${d.title}`);
    } else {
      toast.warning(`Terhubung tapi BUKAN Editor: ${d.title}. Share sebagai Editor dulu.`);
    }
  };

  const handleSave = async () => {
    const spreadsheet_id = extractSpreadsheetId(urlInput);
    if (!spreadsheet_id) { toast.error('URL/ID spreadsheet wajib'); return; }
    setSaving(true);
    const payload = {
      spreadsheet_id,
      spreadsheet_url: urlInput,
      clients_sheet_name: 'Clients Import',
      reports_sheet_name: 'WajibLapor',
      permissions_sheet_name: 'Permissions',
      column_mapping: {},
      auto_sync: false,
    };
    let res;
    if (settings?.id) {
      res = await supabase.from('sheet_integration_settings').update(payload).eq('id', settings.id).select().maybeSingle();
    } else {
      res = await supabase.from('sheet_integration_settings').insert({ ...payload, created_by: user?.id }).select().maybeSingle();
    }
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    setSettings(res.data);
    toast.success('Pengaturan disimpan');
  };

  const extractFnError = async (error: any, data: any) => {
    if (data?.error) return data.error;
    try { const body = await error?.context?.json?.(); if (body?.error) return body.error; } catch { /* */ }
    try { const txt = await error?.context?.text?.(); if (txt) return txt; } catch { /* */ }
    return error?.message || 'Terjadi kesalahan';
  };

  const handleCreateTemplate = async () => {
    if (!settings?.id) { toast.error('Simpan pengaturan dulu'); return; }
    setCreatingTabs(true);
    const { data, error } = await supabase.functions.invoke('sheets-create-import-tabs', { body: {} });
    setCreatingTabs(false);
    if (error || (data as any)?.error) {
      toast.error(await extractFnError(error, data));
    } else {
      toast.success('Template tab "Clients Import" siap di spreadsheet');
    }
  };

  const handlePull = async () => {
    if (!settings?.id) { toast.error('Simpan pengaturan dulu'); return; }
    setPulling(true);
    setPullResult(null);
    const { data, error } = await supabase.functions.invoke('sheets-sync-pull', { body: { clients_tab: clientsTab.trim() || undefined } });

    setPulling(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Import gagal');
    } else {
      setPullResult((data as any).results);
      toast.success('Import selesai — periksa ringkasan di bawah');
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen pt-20 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Integrasi Spreadsheet</h1>
            <p className="text-sm text-muted-foreground">Import data Client (Nama, No. Litmas, Pegawai PK) dari Google Sheets</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard/admin')}>← Kembali ke Dashboard</Button>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <PlugZap className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold">Connector Google Sheets</p>
                <p className="text-xs text-muted-foreground">Terhubung melalui akun Google milik admin workspace.</p>
              </div>
            </div>
            <Badge variant="secondary">Terhubung</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <strong>Penting:</strong> share Spreadsheet target ke akun Google connector dengan akses <em>Editor</em>.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Spreadsheet Target</h2>
          <div className="space-y-2">
            <Label htmlFor="url">URL atau ID Spreadsheet</Label>
            <div className="flex gap-2 flex-wrap">
              <Input id="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..." className="flex-1 min-w-[260px]" />
              <Button onClick={handleTest} disabled={testing} variant="outline">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2">Test Akses</span>
              </Button>
            </div>
            {urlInput && (
              <a href={urlInput} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                Buka di Google Sheets <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {canWrite === false && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/40 text-xs">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">Akun connector Google belum punya akses Editor.</p>
                <p>Buka spreadsheet → <strong>Share</strong> → tambahkan email akun connector sebagai <strong>Editor</strong>, lalu klik <strong>Test Akses</strong> lagi.</p>
                {writeError && <p className="text-muted-foreground break-all">Detail: {writeError}</p>}
              </div>
            </div>
          )}
          {canWrite === true && (
            <div className="text-xs p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400">
              ✓ Akses Editor terverifikasi — semua aksi tersedia.
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Pengaturan
          </Button>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Import Client dari Spreadsheet</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Buat tab <strong>Clients Import</strong> di spreadsheet dengan 3 kolom berikut, lalu klik <strong>Tarik dari Sheet</strong>:</p>
            <div className="text-xs p-3 rounded-lg bg-muted/30 font-mono">
              No. Litmas | Nama Lengkap | Pegawai PK
            </div>
            <ul className="text-xs space-y-1 pl-4 list-disc">
              <li><strong>No. Litmas</strong> dipakai untuk mencocokkan klien yang sudah ada.</li>
              <li><strong>Nama Lengkap</strong> akan meng-update nama profil klien.</li>
              <li><strong>Pegawai PK</strong> diisi nama lengkap pegawai (harus sudah punya akun pegawai di sistem).</li>
            </ul>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <span>Import ini hanya meng-update klien yang sudah ada. Untuk klien baru, tambahkan lewat dashboard admin terlebih dahulu (butuh akun login).</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCreateTemplate} disabled={creatingTabs || !settings?.id || canWrite === false} variant="outline" className="gap-2">
              {creatingTabs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Buat Template Tab
            </Button>
            <Button onClick={handlePull} disabled={pulling || !settings?.id || canWrite === false} variant="secondary" className="gap-2">
              {pulling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Tarik dari Sheet
            </Button>
          </div>

          {pullResult && (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Ringkasan Import:</p>
              {Object.entries(pullResult).map(([k, v]: any) => (
                <div key={k} className="p-3 rounded-lg bg-muted/30 space-y-1">
                  <p className="font-medium capitalize">{k}</p>
                  <p className="text-xs">
                    Dibuat: <strong>{v.created || 0}</strong> · Di-update: <strong>{v.updated || 0}</strong> · Di-skip: <strong>{v.skipped || 0}</strong>
                  </p>
                  {(v.tab_used || v.rows_read !== undefined) && (
                    <p className="text-xs text-muted-foreground">
                      Tab: <strong>{v.tab_used || '-'}</strong> · Baris terbaca: <strong>{v.rows_read ?? '-'}</strong>
                      {v.available_tabs?.length ? <> · Tab tersedia: <em>{v.available_tabs.join(', ')}</em></> : null}
                    </p>
                  )}
                  {v.headers_found?.length > 0 && (
                    <p className="text-xs text-muted-foreground">Header: <em>{v.headers_found.join(' | ')}</em></p>
                  )}
                  {v.errors?.length > 0 && (
                    <ul className="text-xs text-destructive list-disc pl-4 space-y-0.5">
                      {v.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </div>
              ))}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
