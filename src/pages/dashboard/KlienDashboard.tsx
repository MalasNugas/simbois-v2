import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { User, BookOpen, MapPin, Briefcase, Calendar, Clock, ShieldCheck, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Batas wilayah Bapas Malang (Kota/Kab Malang, Probolinggo, Pasuruan, Kota Batu)
const BAPAS_BOUNDS = {
  latMin: -8.6,
  latMax: -7.55,
  lngMin: 112.15,
  lngMax: 113.5,
};

function isInsideBapasArea(lat: number, lng: number) {
  return lat >= BAPAS_BOUNDS.latMin && lat <= BAPAS_BOUNDS.latMax &&
         lng >= BAPAS_BOUNDS.lngMin && lng <= BAPAS_BOUNDS.lngMax;
}

export default function KlienDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [pkName, setPkName] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', gender: '', phone: '', address: '' });
  const [savingEmployment, setSavingEmployment] = useState(false);
  const [pegawaiList, setPegawaiList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [savingPk, setSavingPk] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
    startAutoTracking();
  }, [user]);

  const startAutoTracking = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        await supabase.from('location_tracking').insert({
          user_id: user!.id, latitude, longitude, accuracy,
        });
        // Check if outside Bapas area
        if (!isInsideBapasArea(latitude, longitude)) {
          await supabase.from('clients').update({ client_status: 'di_luar_wilayah' } as any).eq('user_id', user!.id);
        } else {
          // Reset to aktif if back inside
          const { data: cl } = await supabase.from('clients').select('client_status').eq('user_id', user!.id).maybeSingle();
          if ((cl as any)?.client_status === 'di_luar_wilayah') {
            await supabase.from('clients').update({ client_status: 'aktif' } as any).eq('user_id', user!.id);
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 60000 }
    );
  };

  const loadData = async () => {
    const [profileRes, clientRes, programsRes, regsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('clients').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('programs').select('*').eq('is_open', true).order('schedule_date', { ascending: true }),
      supabase.from('program_registrations').select('*, programs(*)').eq('client_id', user!.id),
    ]);
    const p = profileRes.data;
    setProfile(p);
    if (p) setEditForm({ full_name: p.full_name || '', gender: (p as any).gender || '', phone: p.phone || '', address: p.address || '' });
    setClient(clientRes.data);
    setPrograms(programsRes.data || []);
    setRegistrations(regsRes.data || []);

    // Load pegawai list
    const { data: pegawai } = await supabase.rpc('get_pegawai_list');
    setPegawaiList(pegawai || []);

    if (clientRes.data?.assigned_pk_id) {
      const { data: pkProfile } = await supabase.from('profiles').select('full_name').eq('user_id', clientRes.data.assigned_pk_id).maybeSingle();
      setPkName(pkProfile?.full_name || null);
    } else {
      setPkName(null);
    }
  };

  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      gender: editForm.gender || null,
      phone: editForm.phone || null,
      address: editForm.address || null,
    } as any).eq('user_id', user!.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Profil berhasil diperbarui');
    setEditDialogOpen(false);
    loadData();
  };

  const updateEmploymentStatus = async (status: string) => {
    setSavingEmployment(true);
    const { error } = await supabase.from('clients').update({ employment_status: status as any }).eq('user_id', user!.id);
    setSavingEmployment(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Status pekerjaan berhasil diperbarui');
    loadData();
  };

  const selectPk = async (pkId: string) => {
    setSavingPk(true);
    const { error } = await supabase.from('clients').update({ assigned_pk_id: pkId }).eq('user_id', user!.id);
    setSavingPk(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Pembimbing PK berhasil dipilih');
    loadData();
  };

  const registerProgram = async (programId: string) => {
    const { error } = await supabase.from('program_registrations').insert({ program_id: programId, client_id: user!.id });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Anda sudah terdaftar di program ini' : error.message);
    } else {
      toast.success('Pendaftaran berhasil! Menunggu persetujuan.');
      loadData();
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Menunggu' },
      approved: { variant: 'default', label: 'Disetujui' },
      rejected: { variant: 'destructive', label: 'Ditolak' },
    };
    const s = map[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const genderLabel: Record<string, string> = {
    laki_laki: 'Laki-laki', perempuan: 'Perempuan',
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        <h1 className="text-3xl font-bold">Dashboard Klien</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Profil</h2>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditDialogOpen(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Nama:</span> {profile?.full_name}</p>
              <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
              <p><span className="text-muted-foreground">Jenis Kelamin:</span> {genderLabel[(profile as any)?.gender] || '-'}</p>
              <p><span className="text-muted-foreground">Telepon:</span> {profile?.phone || '-'}</p>
              <p><span className="text-muted-foreground">Alamat:</span> {profile?.address || '-'}</p>
              <p><span className="text-muted-foreground">Verifikasi:</span> {profile?.is_verified ? <Badge variant="default">Terverifikasi</Badge> : <Badge variant="secondary">Belum</Badge>}</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Status</h2>
            </div>
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Bimbingan:</span> <Badge variant="outline" className="capitalize">{client?.guidance_status || '-'}</Badge></p>
              <div>
                <Label className="text-muted-foreground text-xs">Status Pekerjaan</Label>
                <Select value={client?.employment_status || ''} onValueChange={updateEmploymentStatus} disabled={savingEmployment}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih status pekerjaan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belum_bekerja">Belum Bekerja</SelectItem>
                    <SelectItem value="sedang_pelatihan">Sedang Pelatihan</SelectItem>
                    <SelectItem value="sudah_bekerja">Sudah Bekerja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p><span className="text-muted-foreground">No. Litmas:</span> {client?.case_number || '-'}</p>
            </div>
          </div>

          {/* PK Selection Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Pembimbing Kemasyarakatan</h2>
            </div>
            {client?.assigned_pk_id ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-lg">{pkName}</p>
                <Badge variant="default">Telah Ditugaskan</Badge>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Pilih Pembimbing PK Anda:</p>
                <Select onValueChange={selectPk} disabled={savingPk}>
                  <SelectTrigger><SelectValue placeholder="Pilih Pembimbing PK" /></SelectTrigger>
                  <SelectContent>
                    {pegawaiList.map(pk => (
                      <SelectItem key={pk.user_id} value={pk.user_id}>{pk.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* GPS Status */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Lokasi GPS</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Tracking lokasi aktif secara otomatis untuk monitoring oleh petugas.
          </p>
          <Badge variant="default" className="mt-2">✓ Tracking Aktif</Badge>
        </div>

        {/* Programs */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Program Bimbingan Tersedia
          </h2>
          {programs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada program bimbingan yang dibuka.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {programs.map(p => {
                const registered = registrations.some(r => r.program_id === p.id);
                return (
                  <div key={p.id} className="glass-card rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{p.name}</h3>
                        <Badge variant="outline" className="mt-1 capitalize">{p.program_type}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">Kuota: {p.quota}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                    {p.schedule_date && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(new Date(p.schedule_date), 'dd MMM yyyy HH:mm')}
                      </p>
                    )}
                    {(p as any).file_url && (
                      <a href={(p as any).file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">📄 Lihat Dokumen PDF</a>
                    )}
                    <Button size="sm" variant={registered ? 'secondary' : 'default'} disabled={registered} onClick={() => registerProgram(p.id)} className="w-full">
                      {registered ? 'Sudah Terdaftar' : 'Daftar Program'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Registration History */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Riwayat Pendaftaran
          </h2>
          {registrations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada riwayat pendaftaran.</p>
          ) : (
            <div className="space-y-3">
              {registrations.map(r => (
                <div key={r.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{(r as any).programs?.name || 'Program'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy')}</p>
                  </div>
                  {statusBadge(r.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Edit Profil</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Select value={editForm.gender} onValueChange={v => setEditForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laki_laki">Laki-laki</SelectItem>
                    <SelectItem value="perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>No. Telepon</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Textarea value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Masukkan alamat lengkap" />
              </div>
              <Button onClick={saveProfile} className="w-full">Simpan Profil</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
