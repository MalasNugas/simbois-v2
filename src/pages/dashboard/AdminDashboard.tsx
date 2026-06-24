import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Users, ShieldCheck, CheckCircle2, AlertCircle, UserPlus, Loader2, Trash2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];

export default function AdminDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [pegawai, setPegawai] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [newPegawaiOpen, setNewPegawaiOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [pegForm, setPegForm] = useState({ email: '', password: '', full_name: '', phone: '' });
  const [cliForm, setCliForm] = useState({ full_name: '', case_number: '', phone: '', assigned_pk_id: '' });

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  useEffect(() => {
    if (loading) return;
    if (!user || role !== 'admin') { navigate('/login'); return; }
    load();
  }, [user, role, loading]);

  const load = async () => {
    const [{ data: cls }, { data: pegs }, { data: reps }, { data: perms }] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.rpc('get_pegawai_list'),
      supabase.from('monthly_reports').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('reporting_permissions').select('*').order('granted_at', { ascending: false }).limit(500),
    ]);
    const allIds = [...new Set([...(cls||[]).map((c:any)=>c.user_id), ...(cls||[]).map((c:any)=>c.assigned_pk_id).filter(Boolean)])];
    const { data: profs } = allIds.length
      ? await supabase.from('profiles').select('user_id, full_name, phone').in('user_id', allIds)
      : { data: [] as any[] };
    const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));
    const enriched = (cls || []).map((c: any) => ({
      ...c,
      profiles: pmap.get(c.user_id) || null,
      assigned: c.assigned_pk_id ? pmap.get(c.assigned_pk_id) || null : null,
    }));
    setClients(enriched);
    setPegawai(pegs || []);
    setReports(reps || []);
    setPermissions(perms || []);
  };

  const createPegawai = async () => {
    if (!pegForm.email || !pegForm.password || !pegForm.full_name) {
      toast.error('Email, password, dan nama wajib diisi'); return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('create-pegawai', { body: pegForm });
    setSubmitting(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message); return; }
    toast.success('Pegawai PK berhasil dibuat');
    setNewPegawaiOpen(false);
    setPegForm({ email: '', password: '', full_name: '', phone: '' });
    load();
  };

  const createClient = async () => {
    if (!cliForm.full_name || !cliForm.case_number) { toast.error('Nama dan No. Litmas wajib'); return; }
    setSubmitting(true);
    // Create dummy auth user for client (no login though)
    const tmpEmail = `client.${cliForm.case_number.toLowerCase().replace(/[^a-z0-9]/g,'')}.${Date.now()}@simbois.local`;
    const { data: auth, error: aerr } = await supabase.auth.signUp({
      email: tmpEmail, password: crypto.randomUUID(),
      options: { data: { full_name: cliForm.full_name } },
    });
    if (aerr || !auth.user) { setSubmitting(false); toast.error(aerr?.message || 'Gagal'); return; }

    await supabase.from('user_roles').insert({ user_id: auth.user.id, role: 'klien' });
    if (cliForm.phone) await supabase.from('profiles').update({ phone: cliForm.phone }).eq('user_id', auth.user.id);
    await supabase.from('clients').insert({
      user_id: auth.user.id,
      case_number: cliForm.case_number,
      assigned_pk_id: cliForm.assigned_pk_id || null,
    });
    setSubmitting(false);
    toast.success('Klien ditambahkan');
    setNewClientOpen(false);
    setCliForm({ full_name: '', case_number: '', phone: '', assigned_pk_id: '' });
    load();
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Hapus klien ini?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Klien dihapus'); load();
  };

  // Stats
  const reportedThisMonth = reports.filter(r => r.report_year === curYear && r.report_month === curMonth);
  const sudahLaporIds = new Set(reportedThisMonth.map(r => r.client_id));
  const sudahLapor = sudahLaporIds.size;
  const belumLapor = clients.length - sudahLapor;

  // Chart 12 bulan terakhir
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(curYear, curMonth - 1 - (11 - i), 1);
    const y = d.getFullYear(), m = d.getMonth() + 1;
    const count = reports.filter(r => r.report_year === y && r.report_month === m).length;
    return { label: `${MONTHS[m-1]} ${String(y).slice(2)}`, jumlah: count };
  });

  // Per pegawai
  const pegStats = pegawai.map((p: any) => {
    const binaan = clients.filter(c => c.assigned_pk_id === p.user_id);
    const lapor = binaan.filter(c => sudahLaporIds.has(c.id)).length;
    return { ...p, binaan: binaan.length, lapor, belum: binaan.length - lapor };
  });

  const exportCSV = () => {
    const rows = [['Nama','No.Litmas','Pegawai PK','Status Lapor Bulan Ini']];
    clients.forEach((c: any) => {
      rows.push([
        c.profiles?.full_name || '-',
        c.case_number || '-',
        c.assigned?.full_name || '-',
        sudahLaporIds.has(c.id) ? 'Sudah' : 'Belum',
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wajib-lapor-${curYear}-${curMonth}.csv`;
    a.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Admin</h1>
            <p className="text-muted-foreground">Periode: {MONTHS[curMonth-1]} {curYear}</p>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" /> Export CSV</Button>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total Klien" value={clients.length} color="text-primary" />
          <StatCard icon={ShieldCheck} label="Total Pegawai PK" value={pegawai.length} color="text-blue-400" />
          <StatCard icon={CheckCircle2} label="Sudah Lapor" value={sudahLapor} color="text-green-500" />
          <StatCard icon={AlertCircle} label="Belum Lapor" value={belumLapor} color="text-yellow-500" />
        </div>

        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="font-semibold mb-4">Grafik Wajib Lapor 12 Bulan Terakhir</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="jumlah" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Tabs defaultValue="clients">
          <TabsList>
            <TabsTrigger value="clients">Klien</TabsTrigger>
            <TabsTrigger value="pegawai">Pegawai PK</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="stats">Statistik Pegawai</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-4">
            <div className="flex justify-end mb-3">
              <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
                <DialogTrigger asChild><Button className="gap-2"><UserPlus className="w-4 h-4" /> Tambah Klien</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Tambah Klien Baru</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nama Lengkap</Label><Input value={cliForm.full_name} onChange={e=>setCliForm({...cliForm,full_name:e.target.value})} /></div>
                    <div><Label>No. Litmas</Label><Input value={cliForm.case_number} onChange={e=>setCliForm({...cliForm,case_number:e.target.value})} /></div>
                    <div><Label>No. Telepon</Label><Input value={cliForm.phone} onChange={e=>setCliForm({...cliForm,phone:e.target.value})} /></div>
                    <div><Label>Pegawai PK</Label>
                      <select className="w-full bg-secondary rounded-md p-2 text-sm" value={cliForm.assigned_pk_id} onChange={e=>setCliForm({...cliForm,assigned_pk_id:e.target.value})}>
                        <option value="">— pilih —</option>
                        {pegawai.map((p:any) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={createClient} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Simpan</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="glass-card rounded-2xl p-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>No. Litmas</TableHead><TableHead>Pegawai PK</TableHead><TableHead>Status Lapor</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {clients.map((c:any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.profiles?.full_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{c.case_number || '-'}</TableCell>
                      <TableCell>{c.assigned?.full_name || '-'}</TableCell>
                      <TableCell>{sudahLaporIds.has(c.id) ? <Badge className="bg-green-500/15 text-green-500">Sudah</Badge> : <Badge variant="outline">Belum</Badge>}</TableCell>
                      <TableCell className="text-right"><Button size="icon" variant="ghost" onClick={()=>deleteClient(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="pegawai" className="mt-4">
            <div className="flex justify-end mb-3">
              <Dialog open={newPegawaiOpen} onOpenChange={setNewPegawaiOpen}>
                <DialogTrigger asChild><Button className="gap-2"><UserPlus className="w-4 h-4" /> Tambah Pegawai PK</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Tambah Pegawai PK</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nama Lengkap</Label><Input value={pegForm.full_name} onChange={e=>setPegForm({...pegForm,full_name:e.target.value})} /></div>
                    <div><Label>Email</Label><Input type="email" value={pegForm.email} onChange={e=>setPegForm({...pegForm,email:e.target.value})} /></div>
                    <div><Label>Password</Label><Input type="password" value={pegForm.password} onChange={e=>setPegForm({...pegForm,password:e.target.value})} /></div>
                    <div><Label>No. Telepon</Label><Input value={pegForm.phone} onChange={e=>setPegForm({...pegForm,phone:e.target.value})} /></div>
                  </div>
                  <DialogFooter><Button onClick={createPegawai} disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Simpan</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="glass-card rounded-2xl p-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Klien Binaan</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pegStats.map((p:any) => (
                    <TableRow key={p.user_id}>
                      <TableCell>{p.full_name}</TableCell>
                      <TableCell>{p.binaan}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="mt-4">
            <div className="glass-card rounded-2xl p-4 overflow-x-auto">
              <h3 className="font-semibold mb-3 text-yellow-500">Klien Belum Lapor Bulan Ini</h3>
              <Table>
                <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>No. Litmas</TableHead><TableHead>Pegawai PK</TableHead></TableRow></TableHeader>
                <TableBody>
                  {clients.filter((c:any) => !sudahLaporIds.has(c.id)).map((c:any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.profiles?.full_name || '-'}</TableCell>
                      <TableCell>{c.case_number || '-'}</TableCell>
                      <TableCell>{c.assigned?.full_name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <div className="glass-card rounded-2xl p-4 overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Pegawai PK</TableHead><TableHead>Binaan</TableHead><TableHead>Sudah Lapor</TableHead><TableHead>Belum Lapor</TableHead><TableHead>% Kepatuhan</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pegStats.map((p:any) => (
                    <TableRow key={p.user_id}>
                      <TableCell>{p.full_name}</TableCell>
                      <TableCell>{p.binaan}</TableCell>
                      <TableCell className="text-green-500">{p.lapor}</TableCell>
                      <TableCell className="text-yellow-500">{p.belum}</TableCell>
                      <TableCell>{p.binaan ? Math.round(p.lapor/p.binaan*100) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
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
