import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, BookOpen, MapPin, Briefcase, Calendar, CheckCircle, Clock, XCircle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function KlienDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [pkName, setPkName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [profileRes, clientRes, programsRes, regsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('clients').select('*').eq('user_id', user!.id).maybeSingle(),
      supabase.from('programs').select('*').eq('is_open', true).order('schedule_date', { ascending: true }),
      supabase.from('program_registrations').select('*, programs(*)').eq('client_id', user!.id),
    ]);
    setProfile(profileRes.data);
    setClient(clientRes.data);
    setPrograms(programsRes.data || []);
    setRegistrations(regsRes.data || []);

    // Fetch assigned PK name
    if (clientRes.data?.assigned_pk_id) {
      const { data: pkProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', clientRes.data.assigned_pk_id)
        .maybeSingle();
      setPkName(pkProfile?.full_name || null);
    } else {
      setPkName(null);
    }
  };

  const registerProgram = async (programId: string) => {
    const { error } = await supabase.from('program_registrations').insert({
      program_id: programId,
      client_id: user!.id,
    });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Anda sudah terdaftar di program ini' : error.message);
    } else {
      toast.success('Pendaftaran berhasil! Menunggu persetujuan.');
      loadData();
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung Geolocation');
      return;
    }
    navigator.geolocation.watchPosition(
      async (pos) => {
        await supabase.from('location_tracking').insert({
          user_id: user!.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => toast.error('Gagal mendapatkan lokasi: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 60000 }
    );
    setTrackingEnabled(true);
    toast.success('Tracking lokasi diaktifkan');
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

  const employmentLabel: Record<string, string> = {
    belum_bekerja: 'Belum Bekerja',
    sedang_pelatihan: 'Sedang Pelatihan',
    sudah_bekerja: 'Sudah Bekerja',
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        <h1 className="text-3xl font-bold">Dashboard Klien</h1>

        {/* Profile & Status Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Profil</h2>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Nama:</span> {profile?.full_name}</p>
              <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
              <p><span className="text-muted-foreground">Telepon:</span> {profile?.phone || '-'}</p>
              <p><span className="text-muted-foreground">Verifikasi:</span> {profile?.is_verified ? <Badge variant="default">Terverifikasi</Badge> : <Badge variant="secondary">Belum</Badge>}</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Status</h2>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Bimbingan:</span> <Badge variant="outline" className="capitalize">{client?.guidance_status || '-'}</Badge></p>
              <p><span className="text-muted-foreground">Pekerjaan:</span> {employmentLabel[client?.employment_status] || '-'}</p>
              <p><span className="text-muted-foreground">No. Kasus:</span> {client?.case_number || '-'}</p>
              {client?.referred_to_disnaker && <p className="text-primary text-xs">✓ Telah dirujuk ke Disnaker</p>}
            </div>
          </div>

          {/* Pembimbing PK Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Pembimbing Kemasyarakatan</h2>
            </div>
            {pkName ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-lg">{pkName}</p>
                <Badge variant="default">Telah Ditugaskan</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada Pembimbing PK yang ditugaskan untuk Anda.</p>
            )}
          </div>
        </div>

        {/* GPS Card - moved below */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Lokasi GPS</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Aktifkan tracking lokasi untuk monitoring oleh petugas.</p>
          <Button onClick={startTracking} disabled={trackingEnabled} size="sm">
            {trackingEnabled ? '✓ Tracking Aktif' : 'Aktifkan Tracking'}
          </Button>
        </div>

        {/* Available Programs */}
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
                    {p.trainer_name && <p className="text-xs text-muted-foreground">Pelatih: {p.trainer_name}</p>}
                    <Button
                      size="sm"
                      variant={registered ? 'secondary' : 'default'}
                      disabled={registered}
                      onClick={() => registerProgram(p.id)}
                      className="w-full"
                    >
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
      </div>
    </div>
  );
}
