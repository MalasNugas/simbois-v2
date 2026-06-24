import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, CheckCircle2, AlertCircle, Calendar, ShieldCheck, ShieldOff, Eye, Loader2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DailyReportStats from '@/components/dashboard/DailyReportStats';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

type Client = { id: string; user_id: string; case_number: string | null; full_name: string; phone: string | null };
type PermRow = { id: string; client_id: string; period_year: number; period_month: number; granted_at: string; revoked_at: string | null; used_at: string | null; note: string | null };
type Report = { id: string; client_id: string; report_date: string; report_year: number; report_month: number; selfie_url: string | null; lat: number | null; lng: number | null; notes: string | null; job_status: string | null; operational_status: string | null };

export default function PegawaiDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [permissions, setPermissions] = useState<PermRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewSelfie, setPreviewSelfie] = useState<{ url: string; report: Report } | null>(null);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  useEffect(() => {
    if (loading) return;
    if (!user || role !== 'pegawai') { navigate('/login'); return; }
    load();
  }, [user, role, loading]);

  const load = async () => {
    const { data: cls } = await supabase
      .from('clients')
      .select('id, user_id, case_number')
      .eq('assigned_pk_id', user!.id);

    const userIds = (cls || []).map((c: any) => c.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from('profiles').select('user_id, full_name, phone').in('user_id', userIds)
      : { data: [] as any[] };
    const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));

    const mapped: Client[] = (cls || []).map((c: any) => ({
      id: c.id, user_id: c.user_id, case_number: c.case_number,
      full_name: pmap.get(c.user_id)?.full_name || '-', phone: pmap.get(c.user_id)?.phone || null,
    }));
    setClients(mapped);

    const ids = mapped.map(c => c.id);
    if (ids.length) {
      const { data: perms } = await supabase
        .from('reporting_permissions')
        .select('*').in('client_id', ids).order('granted_at', { ascending: false });
      setPermissions((perms as PermRow[]) || []);

      const { data: reps } = await supabase
        .from('monthly_reports')
        .select('*').in('client_id', ids).order('created_at', { ascending: false });
      setReports((reps as Report[]) || []);
    }
  };

  const grantPermission = async (clientId: string) => {
    setBusy(clientId);
    const { error } = await supabase.from('reporting_permissions').insert({
      client_id: clientId,
      pegawai_id: user!.id,
      period_year: curYear,
      period_month: curMonth,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Izin wajib lapor diberikan');
    load();
  };

  const revokePermission = async (permId: string) => {
    setBusy(permId);
    const { error } = await supabase.from('reporting_permissions').update({ revoked_at: new Date().toISOString() }).eq('id', permId);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Izin dicabut');
    load();
  };

  const viewSelfie = async (r: Report) => {
    if (!r.selfie_url) return;
    const { data, error } = await supabase.functions.invoke('get-selfie-url', { body: { path: r.selfie_url } });
    if (error || (data as any)?.error) { toast.error('Gagal memuat foto'); return; }
    setPreviewSelfie({ url: (data as any).url, report: r });
  };

  // Stats
  const reportedThisMonth = reports.filter(r => r.report_year === curYear && r.report_month === curMonth).map(r => r.client_id);
  const sudahLapor = reportedThisMonth.length;
  const belumLapor = clients.length - sudahLapor;
  const izinDiberikan = permissions.filter(p => p.period_year === curYear && p.period_month === curMonth && !p.revoked_at).length;

  const permFor = (clientId: string) => permissions.find(p => p.client_id === clientId && p.period_year === curYear && p.period_month === curMonth && !p.revoked_at);
  const sudahLaporFor = (clientId: string) => reportedThisMonth.includes(clientId);

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard Pegawai PK</h1>
          <p className="text-muted-foreground">Periode: {MONTHS[curMonth-1]} {curYear}</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Klien Binaan" value={clients.length} color="text-primary" />
          <StatCard icon={CheckCircle2} label="Sudah Lapor" value={sudahLapor} color="text-green-500" />
          <StatCard icon={AlertCircle} label="Belum Lapor" value={belumLapor} color="text-yellow-500" />
          <StatCard icon={ShieldCheck} label="Izin Aktif" value={izinDiberikan} color="text-blue-400" />
        </div>

        <DailyReportStats reports={reports} clients={clients} title="Wajib Lapor Harian (Klien Saya)" scopeLabel="Hanya klien yang ditugaskan kepada Anda" />



        <Tabs defaultValue="clients">
          <TabsList>
            <TabsTrigger value="clients">Klien Binaan</TabsTrigger>
            <TabsTrigger value="history">Riwayat Wajib Lapor</TabsTrigger>
            <TabsTrigger value="permissions">Riwayat Izin</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-4">
            <div className="glass-card rounded-2xl p-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nama</TableHead><TableHead>No. Litmas</TableHead>
                  <TableHead>Status Lapor</TableHead><TableHead>Izin Bulan Ini</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {clients.map(c => {
                    const perm = permFor(c.id);
                    const sudah = sudahLaporFor(c.id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{c.case_number || '-'}</TableCell>
                        <TableCell>
                          {sudah ? <Badge className="bg-green-500/15 text-green-500">Sudah Lapor</Badge> : <Badge variant="outline">Belum Lapor</Badge>}
                        </TableCell>
                        <TableCell>
                          {perm ? <Badge className="bg-blue-500/15 text-blue-400">Diizinkan</Badge> : <Badge variant="outline" className="border-yellow-500/40 text-yellow-500">Belum Diizinkan</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {!perm ? (
                            <Button size="sm" disabled={busy === c.id} onClick={() => grantPermission(c.id)} className="gap-1">
                              <ShieldCheck className="w-3 h-3" /> Berikan Izin
                            </Button>
                          ) : !sudah ? (
                            <Button size="sm" variant="outline" disabled={busy === perm.id} onClick={() => revokePermission(perm.id)} className="gap-1">
                              <ShieldOff className="w-3 h-3" /> Cabut Izin
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sudah terpakai</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {clients.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Belum ada klien binaan.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="glass-card rounded-2xl p-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tgl Lapor</TableHead><TableHead>Klien</TableHead><TableHead>Periode</TableHead>
                  <TableHead>Status Kerja</TableHead><TableHead>Lokasi</TableHead><TableHead>Catatan</TableHead><TableHead>Selfie</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {reports.map(r => {
                    const c = clients.find(x => x.id === r.client_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.report_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{c?.full_name || '-'}</TableCell>
                        <TableCell>{MONTHS[r.report_month-1]} {r.report_year}</TableCell>
                        <TableCell className="capitalize">{r.job_status?.replace('_',' ') || '-'}</TableCell>
                        <TableCell>{r.lat && r.lng ? <a className="text-primary inline-flex items-center gap-1 text-xs" target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${r.lat},${r.lng}`}><MapPin className="w-3 h-3" /> Peta</a> : '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">{r.notes || '-'}</TableCell>
                        <TableCell>{r.selfie_url ? <Button size="sm" variant="ghost" onClick={() => viewSelfie(r)}><Eye className="w-4 h-4" /></Button> : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {reports.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Belum ada laporan.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <div className="glass-card rounded-2xl p-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tgl Izin</TableHead><TableHead>Klien</TableHead><TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead><TableHead>Dipakai</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {permissions.map(p => {
                    const c = clients.find(x => x.id === p.client_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{format(new Date(p.granted_at), 'dd MMM yyyy HH:mm')}</TableCell>
                        <TableCell>{c?.full_name || '-'}</TableCell>
                        <TableCell>{MONTHS[p.period_month-1]} {p.period_year}</TableCell>
                        <TableCell>{p.revoked_at ? <Badge variant="destructive">Dicabut</Badge> : <Badge className="bg-blue-500/15 text-blue-400">Aktif</Badge>}</TableCell>
                        <TableCell>{p.used_at ? <Badge className="bg-green-500/15 text-green-500">Sudah</Badge> : <Badge variant="outline">Belum</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                  {permissions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Belum ada izin diberikan.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!previewSelfie} onOpenChange={o => !o && setPreviewSelfie(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bukti Wajib Lapor</DialogTitle></DialogHeader>
          {previewSelfie && (
            <div className="space-y-3">
              <img src={previewSelfie.url} alt="Selfie" className="w-full rounded-lg" />
              <p className="text-xs text-muted-foreground">Diambil: {format(new Date(previewSelfie.report.report_date), 'dd MMM yyyy')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <Icon className={`w-6 h-6 ${color} mb-2`} />
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
