import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Users, BookOpen, Briefcase, MapPin, Plus, CheckCircle, XCircle, Filter, Search, Pencil, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import ClientMapView from '@/components/ClientMapView';

export default function PegawaiDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [showOnlyMyClients, setShowOnlyMyClients] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProgram, setNewProgram] = useState({
    name: '', description: '', program_type: 'kepribadian', quota: 20, schedule_date: '',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [clientsRes, programsRes, regsRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('programs').select('*').order('created_at', { ascending: false }),
      supabase.from('program_registrations').select('*, programs(*)'),
    ]);

    const clientsData = clientsRes.data || [];
    if (clientsData.length > 0) {
      const userIds = clientsData.map(c => c.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      clientsData.forEach(c => { (c as any).profile = profileMap.get(c.user_id) || null; });
    }

    const regsData = regsRes.data || [];
    if (regsData.length > 0) {
      const clientIds = regsData.map(r => r.client_id);
      const { data: regProfiles } = await supabase.from('profiles').select('*').in('user_id', clientIds);
      const regProfileMap = new Map((regProfiles || []).map(p => [p.user_id, p]));
      regsData.forEach(r => { (r as any).client_profile = regProfileMap.get(r.client_id) || null; });
    }

    setClients(clientsData);
    setPrograms(programsRes.data || []);
    setRegistrations(regsData);
  };

  const uploadPdf = async (file: File): Promise<string | null> => {
    if (file.type !== 'application/pdf') { toast.error('Hanya file PDF yang diizinkan'); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Ukuran file maksimal 10MB'); return null; }
    setUploadingPdf(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('program-files').upload(fileName, file);
    setUploadingPdf(false);
    if (error) { toast.error('Gagal upload: ' + error.message); return null; }
    const { data: urlData } = supabase.storage.from('program-files').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const displayedClients = clients
    .filter(c => !c.assigned_pk_id || c.assigned_pk_id === user?.id)
    .filter(c => !showOnlyMyClients || c.assigned_pk_id === user?.id)
    .filter(c => {
      if (!searchQuery.trim()) return true;
      const name = ((c as any).profile?.full_name || '').toLowerCase();
      const caseNum = (c.case_number || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || caseNum.includes(q);
    });

  const clientStatusLabel: Record<string, string> = {
    aktif: 'Aktif',
    meninggal: 'Meninggal',
    di_luar_wilayah: 'Di Luar Wilayah',
  };

  const clientStatusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    aktif: 'default',
    meninggal: 'destructive',
    di_luar_wilayah: 'secondary',
  };

  const stats = {
    total: displayedClients.length,
    aktifBimbingan: displayedClients.filter(c => c.guidance_status === 'aktif').length,
    sudahBekerja: displayedClients.filter(c => c.employment_status === 'sudah_bekerja').length,
    belumBekerja: displayedClients.filter(c => c.employment_status === 'belum_bekerja').length,
  };

  const updateClientStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from('clients').update({ client_status: status } as any).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Status klien diperbarui'); loadData(); }
  };

  const createProgram = async () => {
    if (!newProgram.name.trim()) { toast.error('Nama program wajib diisi'); return; }

    let fileUrl: string | null = null;
    if (fileInputRef.current?.files?.[0]) {
      fileUrl = await uploadPdf(fileInputRef.current.files[0]);
      if (fileUrl === null && fileInputRef.current.files[0]) return;
    }

    const { error } = await supabase.from('programs').insert({
      ...newProgram,
      quota: Number(newProgram.quota),
      schedule_date: newProgram.schedule_date || null,
      is_open: true,
      created_by: user!.id,
      file_url: fileUrl,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Program berhasil dibuat');
    setDialogOpen(false);
    setNewProgram({ name: '', description: '', program_type: 'kepribadian', quota: 20, schedule_date: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    loadData();
  };

  const openEditProgram = (program: any) => {
    setEditingProgram({
      ...program,
      schedule_date: program.schedule_date ? program.schedule_date.slice(0, 16) : '',
    });
    setEditDialogOpen(true);
  };

  const updateProgram = async () => {
    if (!editingProgram) return;

    let fileUrl = editingProgram.file_url;
    if (editFileInputRef.current?.files?.[0]) {
      const url = await uploadPdf(editFileInputRef.current.files[0]);
      if (url === null) return;
      fileUrl = url;
    }

    const { error } = await supabase.from('programs').update({
      name: editingProgram.name,
      description: editingProgram.description,
      program_type: editingProgram.program_type,
      quota: Number(editingProgram.quota),
      schedule_date: editingProgram.schedule_date || null,
      is_open: editingProgram.is_open,
      file_url: fileUrl,
    } as any).eq('id', editingProgram.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Program berhasil diperbarui');
    setEditDialogOpen(false);
    setEditingProgram(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
    loadData();
  };

  const confirmDeleteProgram = (program: any) => {
    setProgramToDelete(program);
    setDeleteDialogOpen(true);
  };

  const deleteProgram = async () => {
    if (!programToDelete) return;
    const { error } = await supabase.from('programs').delete().eq('id', programToDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Program berhasil dihapus');
    setDeleteDialogOpen(false);
    setProgramToDelete(null);
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

  const programForm = (values: any, onChange: (v: any) => void, inputRef?: React.RefObject<HTMLInputElement>) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nama Program</Label>
        <Input value={values.name} onChange={e => onChange({ ...values, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Deskripsi</Label>
        <Textarea value={values.description || ''} onChange={e => onChange({ ...values, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipe</Label>
          <Select value={values.program_type} onValueChange={v => onChange({ ...values, program_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kepribadian">Kepribadian</SelectItem>
              <SelectItem value="kemandirian">Kemandirian</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kuota</Label>
          <Input type="number" value={values.quota} onChange={e => onChange({ ...values, quota: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Jadwal</Label>
        <Input type="datetime-local" value={values.schedule_date || ''} onChange={e => onChange({ ...values, schedule_date: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>File PDF (opsional)</Label>
        <div className="flex items-center gap-2">
          <Input type="file" accept=".pdf" ref={inputRef as any} className="file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground" />
          {values.file_url && (
            <a href={values.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <Badge variant="outline" className="gap-1"><FileText className="w-3 h-3" /> PDF</Badge>
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Dashboard Pegawai PK</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowMap(!showMap)}>
              <MapPin className="w-4 h-4 mr-2" /> {showMap ? 'Tutup Peta' : 'Monitoring Lokasi'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Buat Program</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Buat Program Bimbingan</DialogTitle></DialogHeader>
                {programForm(newProgram, setNewProgram, fileInputRef)}
                <Button onClick={createProgram} disabled={uploadingPdf} className="w-full">
                  {uploadingPdf ? 'Mengupload...' : 'Simpan Program'}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Tampilkan hanya klien saya</span>
            <Switch checked={showOnlyMyClients} onCheckedChange={setShowOnlyMyClients} />
            <span className="text-xs text-muted-foreground ml-2">
              {showOnlyMyClients ? `${displayedClients.length} klien Anda` : `${displayedClients.length} klien`}
            </span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama atau no. litmas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
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
                  <p className="text-xs text-muted-foreground">Kuota: {p.quota}</p>
                  {p.schedule_date && (
                    <p className="text-xs text-muted-foreground">Jadwal: {format(new Date(p.schedule_date), 'dd MMM yyyy HH:mm')}</p>
                  )}
                  {(p as any).file_url && (
                    <a href={(p as any).file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">
                      <FileText className="w-3 h-3" /> Lihat PDF
                    </a>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEditProgram(p)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => confirmDeleteProgram(p)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Hapus
                    </Button>
                  </div>
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
                      Klien: {(r as any).client_profile?.full_name || r.client_id} • {format(new Date(r.created_at), 'dd MMM yyyy')}
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
          {displayedClients.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {searchQuery ? 'Tidak ditemukan klien dengan pencarian tersebut.' : showOnlyMyClients ? 'Belum ada klien yang memilih Anda sebagai PK.' : 'Belum ada data klien.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-muted-foreground font-medium">Nama</th>
                    <th className="pb-3 text-muted-foreground font-medium">Jenis Kelamin</th>
                    <th className="pb-3 text-muted-foreground font-medium">Alamat</th>
                    <th className="pb-3 text-muted-foreground font-medium">No. Telepon</th>
                    <th className="pb-3 text-muted-foreground font-medium">No. Litmas</th>
                    <th className="pb-3 text-muted-foreground font-medium">Bimbingan</th>
                    <th className="pb-3 text-muted-foreground font-medium">Pekerjaan</th>
                    <th className="pb-3 text-muted-foreground font-medium">Status Klien</th>
                    <th className="pb-3 text-muted-foreground font-medium">Verifikasi</th>
                    <th className="pb-3 text-muted-foreground font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedClients.map(c => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-3">{(c as any).profile?.full_name || '-'}</td>
                      <td className="py-3 capitalize">{(c as any).profile?.gender || '-'}</td>
                      <td className="py-3 max-w-[200px] truncate" title={(c as any).profile?.address || ''}>{(c as any).profile?.address || '-'}</td>
                      <td className="py-3">{(c as any).profile?.phone || '-'}</td>
                      <td className="py-3">{c.case_number || '-'}</td>
                      <td className="py-3"><Badge variant="outline" className="capitalize">{c.guidance_status}</Badge></td>
                      <td className="py-3 capitalize">{c.employment_status?.replace('_', ' ')}</td>
                      <td className="py-3">
                        <Select value={(c as any).client_status || 'aktif'} onValueChange={v => updateClientStatus(c.user_id, v)}>
                          <SelectTrigger className="h-8 w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aktif">Aktif</SelectItem>
                            <SelectItem value="meninggal">Meninggal</SelectItem>
                            <SelectItem value="di_luar_wilayah">Di Luar Wilayah</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3">{(c as any).profile?.is_verified ? <Badge variant="default">✓</Badge> : <Badge variant="secondary">✗</Badge>}</td>
                      <td className="py-3">
                        <div className="flex gap-1 flex-wrap">
                          {!(c as any).profile?.is_verified && (
                            <Button size="sm" variant="outline" onClick={() => verifyClient(c.user_id)}>Verifikasi</Button>
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

        {/* Edit Program Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Program</DialogTitle></DialogHeader>
            {editingProgram && (
              <>
                {programForm(editingProgram, setEditingProgram, editFileInputRef)}
                <div className="flex items-center gap-3 pt-2">
                  <Label>Status Program</Label>
                  <Switch checked={editingProgram.is_open} onCheckedChange={v => setEditingProgram((p: any) => ({ ...p, is_open: v }))} />
                  <span className="text-sm text-muted-foreground">{editingProgram.is_open ? 'Dibuka' : 'Ditutup'}</span>
                </div>
                <Button onClick={updateProgram} disabled={uploadingPdf} className="w-full">
                  {uploadingPdf ? 'Mengupload...' : 'Simpan Perubahan'}
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Program Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Hapus Program</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus program <strong>{programToDelete?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
              <Button variant="destructive" onClick={deleteProgram}>Hapus</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
