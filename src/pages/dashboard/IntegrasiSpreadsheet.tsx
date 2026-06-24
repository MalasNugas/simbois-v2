import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Save, Upload, Download, PlugZap, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DB_FIELDS = {
  clients: ['id', 'full_name', 'case_number', 'phone', 'assigned_pk_name', 'address', 'status', 'created_at'],
  reports: ['id', 'client_name', 'case_number', 'report_year', 'report_month', 'job_status', 'lat', 'lng', 'submitted_via', 'created_at'],
  permissions: ['id', 'client_name', 'case_number', 'pegawai_name', 'period_year', 'period_month', 'granted_at', 'revoked_at', 'note'],
} as const;

type Tab = { title: string; sheetId: number; headers: string[] };

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
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [creatingTabs, setCreatingTabs] = useState(false);
  const [pullResult, setPullResult] = useState<any>(null);
  const [pullOpts, setPullOpts] = useState({ pegawai: true, clients: true, reports: false });
  const [tabsLoading, setTabsLoading] = useState(false);
  const [canWrite, setCanWrite] = useState<boolean | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);




  const [settings, setSettings] = useState<any>(null);
  const [urlInput, setUrlInput] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [clientsTab, setClientsTab] = useState('');
  const [reportsTab, setReportsTab] = useState('');
  const [permsTab, setPermsTab] = useState('');
  const [mapping, setMapping] = useState<Record<string, Record<string, string>>>({
    clients: {}, reports: {}, permissions: {},
  });
  const [autoSync, setAutoSync] = useState(false);

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
      setClientsTab(data.clients_sheet_name);
      setReportsTab(data.reports_sheet_name);
      setPermsTab(data.permissions_sheet_name);
      setMapping((data.column_mapping as any) || { clients: {}, reports: {}, permissions: {} });
      setAutoSync(data.auto_sync);
      await fetchTabs(data.spreadsheet_id);
    }
    setLoading(false);
  };

  const fetchTabs = async (spreadsheetId: string) => {
    if (!spreadsheetId) return;
    setTabsLoading(true);
    const { data, error } = await supabase.functions.invoke('sheets-list-tabs', { body: { spreadsheet_id: spreadsheetId } });
    setTabsLoading(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Gagal memuat tab');
      return;
    }
    setTabs((data as any).tabs || []);
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
      toast.success(`Terhubung sebagai Editor: ${d.title} (${d.sheet_count} tab)`);
    } else {
      toast.warning(`Terhubung tapi BUKAN Editor: ${d.title}. Share sebagai Editor dulu.`);
    }
    await fetchTabs(id);
  };


  const handleSave = async () => {
    const spreadsheet_id = extractSpreadsheetId(urlInput);
    if (!spreadsheet_id) { toast.error('URL/ID spreadsheet wajib'); return; }
    setSaving(true);
    const payload = {
      spreadsheet_id,
      spreadsheet_url: urlInput,
      clients_sheet_name: clientsTab || 'Clients',
      reports_sheet_name: reportsTab || 'WajibLapor',
      permissions_sheet_name: permsTab || 'Permissions',
      column_mapping: mapping,
      auto_sync: autoSync,
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

  const handlePush = async () => {
    if (!settings?.id) { toast.error('Simpan pengaturan dulu'); return; }
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke('sheets-sync-push', { body: {} });
    setSyncing(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Sinkronisasi gagal');
    } else {
      toast.success('Data berhasil dikirim ke Spreadsheet');
    }
    await load();
  };

  const extractFnError = async (error: any, data: any) => {
    if (data?.error) return data.error;
    try {
      const body = await error?.context?.json?.();
      if (body?.error) return body.error;
    } catch { /* ignore */ }
    try {
      const txt = await error?.context?.text?.();
      if (txt) return txt;
    } catch { /* ignore */ }
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
      toast.success('Template tab berhasil dibuat di spreadsheet');
    }
  };



  const handlePull = async () => {

    if (!settings?.id) { toast.error('Simpan pengaturan dulu'); return; }
    if (!pullOpts.pegawai && !pullOpts.clients && !pullOpts.reports) {
      toast.error('Pilih minimal satu tab untuk di-import'); return;
    }
    const ok = window.confirm(
      'Import akan membuat akun login dari Spreadsheet.\n\nPastikan tab dan kolom (Email, Password Awal, No. Litmas) sudah benar.\n\nLanjutkan?'
    );
    if (!ok) return;
    setPulling(true);
    setPullResult(null);
    const { data, error } = await supabase.functions.invoke('sheets-sync-pull', { body: pullOpts });
    setPulling(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Import gagal');
    } else {
      setPullResult((data as any).results);
      toast.success('Import selesai — periksa ringkasan di bawah');
    }
  };


  const updateMap = (group: keyof typeof DB_FIELDS, field: string, header: string) => {
    setMapping((m) => ({ ...m, [group]: { ...(m[group] || {}), [field]: header === '__none__' ? '' : header } }));
  };

  const headersFor = (tabName: string) => tabs.find((t) => t.title === tabName)?.headers || [];

  if (authLoading || loading) {
    return <div className="min-h-screen pt-20 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Integrasi Spreadsheet</h1>
            <p className="text-sm text-muted-foreground">Pengaturan sinkronisasi data Wajib Lapor ke Google Sheets</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard/admin')}>← Kembali ke Dashboard</Button>
        </div>

        {/* Connector status */}
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
            <strong>Penting:</strong> share Spreadsheet target ke akun Google connector dengan akses <em>Editor</em> agar push berhasil.
          </p>
        </div>

        {/* Spreadsheet target */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Spreadsheet Target</h2>
          <div className="space-y-2">
            <Label htmlFor="url">URL atau ID Spreadsheet</Label>
            <div className="flex gap-2 flex-wrap">
              <Input id="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..." className="flex-1 min-w-[260px]" />
              <Button onClick={handleTest} disabled={testing} variant="outline">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2">Test & Muat Tab</span>
              </Button>
            </div>
            {urlInput && (
              <a href={urlInput} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                Buka di Google Sheets <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Tabs yang akan dibuat otomatis */}
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold">Struktur Data (6 Tab Otomatis)</h2>
          <p className="text-sm text-muted-foreground">
            Saat "Push Sekarang" ditekan, sistem otomatis membuat tab berikut di spreadsheet bila belum ada,
            dan mengisinya dengan data terkini. Header sudah dalam Bahasa Indonesia.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {[
              { name: 'Clients', desc: 'Data lengkap klien + Pegawai PK yang ditugaskan' },
              { name: 'Wajib Lapor', desc: 'Riwayat lapor + Pegawai PK + hari ke-berapa + status lokasi' },
              { name: 'Izin Lapor', desc: 'Izin lapor yang diberikan Pegawai PK' },
              { name: 'Pegawai PK', desc: 'Daftar pegawai + klien aktif/selesai + sudah/belum lapor' },
              { name: 'Rekap Bulanan', desc: 'Agregasi 12 bulan terakhir' },
              { name: 'Tracking Lokasi', desc: '1000 titik GPS terbaru (geofencing Malang)' },
              { name: 'Lapor Harian', desc: '30 hari terakhir: total lapor & % kepatuhan per hari' },
              { name: 'Kepatuhan Klien', desc: 'Per-klien: sudah/belum lapor bulan ini + hari sejak terakhir' },
              { name: 'Kinerja Pegawai PK', desc: 'KPI kepatuhan klien per pegawai (bulan berjalan)' },

            ].map((t) => (
              <li key={t.name} className="flex gap-2 p-2 rounded-lg bg-muted/30">
                <Badge variant="outline" className="shrink-0">{t.name}</Badge>
                <span className="text-xs text-muted-foreground">{t.desc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sync controls */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Sinkronisasi</h2>
          <div className="flex items-center gap-3">
            <Switch checked={autoSync} onCheckedChange={setAutoSync} id="auto" />
            <Label htmlFor="auto" className="cursor-pointer">Auto-sync (akan aktif setelah cron diaktifkan)</Label>
          </div>
          {settings?.last_sync_at && (
            <div className="text-sm space-y-1">
              <p>Terakhir sync: <span className="text-muted-foreground">{format(new Date(settings.last_sync_at), 'dd MMM yyyy HH:mm')}</span></p>
              <p>Status: <Badge variant={settings.last_sync_status === 'success' ? 'default' : 'destructive'}>{settings.last_sync_status}</Badge></p>
              {settings.last_sync_error && <p className="text-xs text-destructive break-all">{settings.last_sync_error}</p>}
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Pengaturan
            </Button>
            <Button onClick={handlePush} disabled={syncing || !settings?.id} variant="secondary" className="gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Push Sekarang
            </Button>
          </div>
        </div>

        {/* Import (Pull) from Sheet → DB */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Tarik dari Spreadsheet (Import ke Database)</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Buat tab berikut di spreadsheet dengan kolom yang dibutuhkan, lalu klik <strong>Tarik dari Sheet</strong>:</p>
            <ul className="text-xs space-y-1 pl-4 list-disc">
              <li><strong>Pegawai PK Import</strong>: <code>Nama Pegawai | Email | Password Awal | Telepon</code></li>
              <li><strong>Clients Import</strong>: <code>No. Litmas | Nama Lengkap | Email | Password Awal | Jenis Kelamin | Tempat Lahir | Tgl Lahir | Telepon | Alamat | Status Bimbingan | Status Pekerjaan | Detail Pekerjaan | Mulai Bimbingan | Akhir Bimbingan | Pegawai PK</code></li>
              <li><strong>Wajib Lapor Import</strong> (opsional): <code>No. Litmas | Periode (YYYY-MM) | Tanggal Lapor | Status Pekerjaan | Status Operasional | Latitude | Longitude | Catatan</code></li>
            </ul>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <span>Setelah import berhasil, <strong>hapus kolom Password Awal</strong> dari spreadsheet untuk keamanan. Mode upsert: data dengan No. Litmas/Email yang sama akan di-update, bukan diduplikasi.</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { key: 'pegawai', label: 'Pegawai PK Import' },
              { key: 'clients', label: 'Clients Import' },
              { key: 'reports', label: 'Wajib Lapor Import' },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(pullOpts as any)[opt.key]}
                  onChange={(e) => setPullOpts({ ...pullOpts, [opt.key]: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCreateTemplate} disabled={creatingTabs || !settings?.id} variant="outline" className="gap-2">
              {creatingTabs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Buat Template Tab
            </Button>
            <Button onClick={handlePull} disabled={pulling || !settings?.id} variant="secondary" className="gap-2">
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
