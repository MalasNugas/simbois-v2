import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Camera, MapPin, CheckCircle2, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type ClientResult = { id: string; full_name: string; case_number: string | null; assigned_pk_name: string | null };
type PermissionStatus = {
  client_id: string;
  full_name: string;
  case_number: string | null;
  assigned_pk_name: string | null;
  has_permission: boolean;
  already_reported: boolean;
  period_year: number;
  period_month: number;
};

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function WajibLapor() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PermissionStatus | null>(null);
  const [stage, setStage] = useState<'search' | 'status' | 'camera' | 'form' | 'done'>('search');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [opStatus, setOpStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Search
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.rpc('search_clients_public', { _q: query.trim() });
      setResults((data as ClientResult[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const pickClient = async (c: ClientResult) => {
    const { data } = await supabase.rpc('get_client_permission_status', { _client_id: c.id });
    const row = (data as PermissionStatus[])?.[0];
    if (row) {
      setSelected(row);
      setStage('status');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      setStage('camera');
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);

      // ask GPS in parallel
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => { /* ignore */ },
          { timeout: 5000 }
        );
      }
    } catch {
      toast.error('Tidak dapat mengakses kamera. Mohon izinkan akses kamera.');
    }
  };

  const capture = () => {
    if (!videoRef.current) return;
    const c = document.createElement('canvas');
    c.width = videoRef.current.videoWidth;
    c.height = videoRef.current.videoHeight;
    c.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    const data = c.toDataURL('image/jpeg', 0.85);
    setSelfie(data);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStage('form');
  };

  const retake = () => {
    setSelfie(null);
    startCamera();
  };

  const submit = async () => {
    if (!selected || !selfie) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-wajib-lapor', {
        body: {
          client_id: selected.client_id,
          selfie_base64: selfie,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          notes,
          job_status: jobStatus || null,
          operational_status: opStatus || null,
        },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || 'Gagal mengirim laporan');
        setSubmitting(false);
        return;
      }
      setStage('done');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setQuery(''); setResults([]); setSelected(null); setSelfie(null);
    setCoords(null); setNotes(''); setJobStatus(''); setOpStatus(''); setStage('search');
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 gradient-navy">
      <div className="container mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
            <span className="text-gradient-gold">Absen Wajib Lapor</span>
          </h1>
          <p className="text-muted-foreground">Bulan {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</p>
        </motion.div>

        {stage === 'search' && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <Label className="text-sm">Cari Nama / No. Litmas Anda</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ketik minimal 2 huruf nama Anda…"
                className="pl-10"
                autoFocus
              />
            </div>
            {searching && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Mencari…</p>}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map(c => (
                <button
                  key={c.id}
                  onClick={() => pickClient(c)}
                  className="w-full text-left p-4 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
                >
                  <p className="font-semibold">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground">No. Litmas: {c.case_number || '-'} · Pegawai PK: {c.assigned_pk_name || '-'}</p>
                </button>
              ))}
              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">Tidak ditemukan klien dengan nama tersebut.</p>
              )}
            </div>
          </div>
        )}

        {stage === 'status' && selected && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="text-center pb-4 border-b border-border">
              <p className="text-xs text-muted-foreground">Klien</p>
              <h2 className="text-xl font-bold">{selected.full_name}</h2>
              <p className="text-xs text-muted-foreground mt-1">No. Litmas: {selected.case_number || '-'}</p>
              <p className="text-xs text-muted-foreground">Pegawai PK: {selected.assigned_pk_name || '-'}</p>
            </div>

            {selected.already_reported ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-semibold text-green-500">Sudah Wajib Lapor</p>
                <p className="text-sm text-muted-foreground">Anda sudah melakukan wajib lapor untuk bulan ini. Terima kasih.</p>
                <Button variant="outline" onClick={reset}>Selesai</Button>
              </div>
            ) : !selected.has_permission ? (
              <div className="text-center py-6 space-y-3">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
                <p className="font-semibold text-yellow-500">Belum Diizinkan</p>
                <p className="text-sm text-muted-foreground">
                  Anda belum mendapatkan izin wajib lapor untuk bulan ini.<br />
                  Silakan hubungi Pegawai PK/Pembimbing Anda.
                </p>
                <Button variant="outline" onClick={reset}>Kembali</Button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <p className="font-semibold text-primary">Izin Aktif</p>
                <p className="text-sm text-muted-foreground">Anda dapat melakukan wajib lapor. Klik tombol di bawah untuk mengambil foto selfie.</p>
                <Button size="lg" onClick={startCamera} className="gap-2"><Camera className="w-4 h-4" /> Mulai Absen</Button>
                <button onClick={reset} className="block mx-auto text-xs text-muted-foreground hover:text-foreground mt-2">Bukan saya, kembali</button>
              </div>
            )}
          </div>
        )}

        {stage === 'camera' && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <p className="text-sm font-semibold text-center">Ambil Foto Selfie</p>
            <div className="rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { streamRef.current?.getTracks().forEach(t=>t.stop()); setStage('status'); }} className="flex-1">Batal</Button>
              <Button onClick={capture} className="flex-1 gap-2"><Camera className="w-4 h-4" /> Ambil Foto</Button>
            </div>
          </div>
        )}

        {stage === 'form' && selfie && selected && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex gap-4 items-start pb-4 border-b border-border">
              <img src={selfie} alt="selfie" className="w-24 h-24 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-semibold">{selected.full_name}</p>
                <p className="text-xs text-muted-foreground">No. Litmas: {selected.case_number || '-'}</p>
                {coords && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                )}
                <button onClick={retake} className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline">
                  <RotateCcw className="w-3 h-3" /> Foto ulang
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status Pekerjaan</Label>
              <Select value={jobStatus} onValueChange={setJobStatus}>
                <SelectTrigger><SelectValue placeholder="Pilih status…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bekerja">Sedang Bekerja</SelectItem>
                  <SelectItem value="mencari_kerja">Mencari Kerja</SelectItem>
                  <SelectItem value="pelatihan">Mengikuti Pelatihan</SelectItem>
                  <SelectItem value="belum_bekerja">Belum Bekerja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status Operasional</Label>
              <Select value={opStatus} onValueChange={setOpStatus}>
                <SelectTrigger><SelectValue placeholder="Pilih status…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif Bimbingan</SelectItem>
                  <SelectItem value="kondusif">Kondusif</SelectItem>
                  <SelectItem value="perlu_perhatian">Perlu Perhatian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Catatan / Keterangan</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tulis perkembangan singkat bulan ini…" rows={3} />
            </div>

            <Button onClick={submit} disabled={submitting} size="lg" className="w-full gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? 'Mengirim…' : 'Kirim Wajib Lapor'}
            </Button>
          </div>
        )}

        {stage === 'done' && (
          <div className="glass-card rounded-2xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Wajib Lapor Berhasil</h2>
            <p className="text-muted-foreground">Terima kasih. Laporan Anda telah tersimpan dan diteruskan ke Pegawai PK.</p>
            <Button onClick={reset} size="lg">Selesai</Button>
          </div>
        )}
      </div>
    </div>
  );
}
