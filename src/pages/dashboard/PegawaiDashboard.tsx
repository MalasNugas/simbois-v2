import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Users, BookOpen, Briefcase, MapPin, Plus, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClientMapView from '@/components/ClientMapView';

export default function PegawaiDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [newProgram, setNewProgram] = useState({
    name: '', description: '', program_type: 'kepribadian', quota: 20, trainer_name: '', schedule_date: '',
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [clientsRes, programsRes, regsRes] = await Promise.all([
      supabase.from('clients').select('*, profiles!clients_user_id_fkey(*)'),
      supabase.from('programs').select('*').order('created_at', { ascending: false }),
      supabase.from('program_registrations').select('*, programs(*), profiles:client_id(full_name)'),
    ]);
    setClients(clientsRes.data || []);
    setPrograms(programsRes.data || []);
    setRegistrations(regsRes.data || []);
  };

  const stats = {
    total: clients.length,
    aktifBimbingan: clients.filter(c => c.guidance_status === 'aktif').length,
    sudahBekerja: clients.filter(c => c.employment_status === 'sudah_bekerja').length,
    belumBekerja: clients.filter(c => c.employment_status === 'belum_bekerja').length,
  };

  const createProgram = async () => {
    if (!newProgram.name.trim()) { toast.error('Nama program wajib diisi'); return; }
    const { error } = await supabase.from('programs').insert({
      ...newProgram,
      quota: Number(newProgram.quota),
      schedule_date: newProgram.schedule_date || null,
      is_open: true,
      created_by: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Program berhasil dibuat');
    setDialogOpen(false);
    setNewProgram({ name: '', description: '', program_type: 'kepribadian', quota: 20, trainer_name: '', schedule_date: '' });
    loadData();
  };

  const updateRegistration = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('program_registrations').update({
      status, reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`Pendaftaran ${status === 'approved' ? 'disetujui' : 'ditolak'}`); loadData(); }
  };

  const verifyClient = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Klien berhasil diverifikasi'); loadData(); }
  };

  const referToDisnaker = async (userId: string) => {
    const { error } = await supabase.from('clients').update({ referred_to_disnaker: true }).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Klien dirujuk ke Disnaker'); loadData(); }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Dashboard Pegawai PK</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowMap(!showMap)}>
              <MapPin className="w-4 h-4 mr-2" /> {showMap ? 'Tutup Peta' : 'Monitoring Lokasi'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Buat Program</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Buat Program Bimbingan</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nama Program</Label>
                    <Input value={newProgram.name} onChange={e => setNewProgram(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Deskripsi</Label>
                    <Textarea value={newProgram.description} onChange={e => setNewProgram(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipe</Label>
                      <Select value={newProgram.program_type} onValueChange={v => setNewProgram(p => ({ ...p, program_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kepribadian">Kepribadian</SelectItem>
                          <SelectItem value="kemandirian">Kemandirian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Kuota</Label>
                      <Input type="number" value={newProgram.quota} onChange={e => setNewProgram(p => ({ ...p, quota: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Jadwal</Label>
                    <Input type="datetime-local" value={newProgram.schedule_date} onChange={e => setNewProgram(p => ({ ...p, schedule_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Pelatih (opsional)</Label>
                    <Input value={newProgram.trainer_name} onChange={e => setNewProgram(p => ({ ...p, trainer_name: e.target.value }))} />
                  </div>
                  <Button onClick={createProgram} className="w-full">Simpan Program</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Klien', value: stats.total, icon: Users, color: 'text-primary' },
            { label: 'Bimbingan Aktif', value: stats.aktifBimbingan, icon: BookOpen, color: 'text-info' },
            { label: 'Sudah Bekerja', value: stats.sudahBekerja, icon: CheckCircle, color: 'text-success' },
            { label: 'Belum Bekerja', value: stats.belumBekerja, icon: Briefcase, color: 'text-warning' },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-5">
              <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Map */}
        {showMap && (
          <div className="glass-card rounded-2xl p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Monitoring Lokasi Klien</h2>
            <ClientMapView />
          </div>
        )}

        {/* Programs */}
        <div>
          <h2 className="text-xl font-bold mb-4">Program Bimbingan</h2>
          {programs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada program.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map(p => (
                <div key={p.id} className="glass-card rounded-xl p-5 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Badge variant={p.is_open ? 'default' : 'secondary'}>{p.is_open ? 'Dibuka' : 'Ditutup'}</Badge>
                  </div>
                  <Badge variant="outline" className="capitalize">{p.program_type}</Badge>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <p className="text-xs text-muted-foreground">Kuota: {p.quota} {p.trainer_name && `• Pelatih: ${p.trainer_name}`}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Registrations */}
        <div>
          <h2 className="text-xl font-bold mb-4">Pendaftaran Bimbingan</h2>
          {registrations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada pendaftaran.</p>
          ) : (
            <div className="space-y-3">
              {registrations.map(r => (
                <div key={r.id} className="glass-card rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-medium text-sm">{(r as any).programs?.name || 'Program'}</p>
                    <p className="text-xs text-muted-foreground">
                      Klien: {(r as any).profiles?.full_name || r.client_id} • {format(new Date(r.created_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'pending' ? (
                      <>
                        <Button size="sm" onClick={() => updateRegistration(r.id, 'approved')}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateRegistration(r.id, 'rejected')}>
                          <XCircle className="w-4 h-4 mr-1" /> Tolak
                        </Button>
                      </>
                    ) : (
                      <Badge variant={r.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{r.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Data Klien</h2>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada data klien.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-muted-foreground font-medium">Nama</th>
                    <th className="pb-3 text-muted-foreground font-medium">No. Kasus</th>
                    <th className="pb-3 text-muted-foreground font-medium">Bimbingan</th>
                    <th className="pb-3 text-muted-foreground font-medium">Pekerjaan</th>
                    <th className="pb-3 text-muted-foreground font-medium">Verifikasi</th>
                    <th className="pb-3 text-muted-foreground font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-3">{(c as any).profiles?.full_name || '-'}</td>
                      <td className="py-3">{c.case_number || '-'}</td>
                      <td className="py-3"><Badge variant="outline" className="capitalize">{c.guidance_status}</Badge></td>
                      <td className="py-3 capitalize">{c.employment_status?.replace('_', ' ')}</td>
                      <td className="py-3">{(c as any).profiles?.is_verified ? <Badge variant="default">✓</Badge> : <Badge variant="secondary">✗</Badge>}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {!(c as any).profiles?.is_verified && (
                            <Button size="sm" variant="outline" onClick={() => verifyClient(c.user_id)}>Verifikasi</Button>
                          )}
                          {c.employment_status === 'belum_bekerja' && !c.referred_to_disnaker && (
                            <Button size="sm" variant="outline" onClick={() => referToDisnaker(c.user_id)}>Rujuk Disnaker</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
