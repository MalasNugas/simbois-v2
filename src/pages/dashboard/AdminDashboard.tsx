import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PegawaiData {
  user_id: string;
  full_name: string;
  totalClients: number;
  activeClients: number;
  needsTermination: number;
  terminated: number; // guidance_status 'selesai'
  hasTerminationReport: number; // has filed termination report
  pendingReport: number; // selesai but no report
  clients: ClientDetail[];
}

interface ClientDetail {
  id: string;
  user_id: string;
  full_name: string;
  case_number: string | null;
  guidance_status: string | null;
  guidance_start: string | null;
  guidance_end: string | null;
  client_status: string | null;
  needsTermination: boolean;
  hasReport: boolean;
}

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pegawaiList, setPegawaiList] = useState<PegawaiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPegawai, setExpandedPegawai] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all');

  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      toast.error('Anda tidak memiliki akses ke halaman ini');
      navigate('/');
    }
  }, [authLoading, role, navigate]);

  useEffect(() => {
    if (role === 'admin') {
      loadData();
    }
  }, [role]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: pegawaiUsers }, { data: allClients }, { data: allProfiles }, { data: termReports }] = await Promise.all([
        supabase.rpc('get_pegawai_list'),
        supabase.from('clients').select('*'),
        supabase.from('profiles').select('user_id, full_name'),
        supabase.from('termination_reports' as any).select('*'),
      ]);

      const profileMap = new Map(allProfiles?.map(p => [p.user_id, p.full_name]) || []);
      const termReportClientIds = new Set((termReports || []).map((t: any) => t.client_id));
      const now = new Date();

      const pegawaiData: PegawaiData[] = (pegawaiUsers || []).map((p: any) => {
        const myClients = (allClients || []).filter(c => c.assigned_pk_id === p.user_id);

        const clientDetails: ClientDetail[] = myClients.map(c => {
          const guidanceEndPassed = c.guidance_end && new Date(c.guidance_end) < now;
          const stillActive = c.guidance_status === 'aktif';
          const hasReport = termReportClientIds.has(c.user_id);
          return {
            id: c.id,
            user_id: c.user_id,
            full_name: profileMap.get(c.user_id) || 'Unknown',
            case_number: c.case_number,
            guidance_status: c.guidance_status,
            guidance_start: c.guidance_start,
            guidance_end: c.guidance_end,
            client_status: c.client_status,
            needsTermination: !!(guidanceEndPassed && stillActive),
            hasReport,
          };
        });

        const terminatedClients = myClients.filter(c => c.guidance_status === 'selesai');
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          totalClients: myClients.length,
          activeClients: myClients.filter(c => c.guidance_status === 'aktif').length,
          needsTermination: clientDetails.filter(c => c.needsTermination).length,
          terminated: terminatedClients.length,
          hasTerminationReport: terminatedClients.filter(c => termReportClientIds.has(c.user_id)).length,
          pendingReport: terminatedClients.filter(c => !termReportClientIds.has(c.user_id)).length,
          clients: clientDetails,
        };
      });

      setPegawaiList(pegawaiData);
    } catch (err) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const totalPegawai = pegawaiList.length;
  const totalNeedsTermination = pegawaiList.reduce((sum, p) => sum + p.needsTermination, 0);
  const totalAllClients = pegawaiList.reduce((sum, p) => sum + p.totalClients, 0);
  const totalTerminated = pegawaiList.reduce((sum, p) => sum + p.hasTerminationReport, 0);
  const totalPendingReport = pegawaiList.reduce((sum, p) => sum + p.pendingReport, 0);

  const filteredPegawai = pegawaiList.filter(p => {
    const matchSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === 'pending') return matchSearch && (p.needsTermination > 0 || p.pendingReport > 0);
    if (filterStatus === 'done') return matchSearch && p.needsTermination === 0 && p.pendingReport === 0;
    return matchSearch;
  });

  if (authLoading || (role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-10">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
            <p className="text-sm text-muted-foreground">Pantau seluruh Pegawai PK dan status laporan pengakhiran</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalPegawai}</p>
                <p className="text-xs text-muted-foreground">Total Pegawai PK</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalAllClients}</p>
                <p className="text-xs text-muted-foreground">Total Klien</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalNeedsTermination}</p>
                <p className="text-xs text-muted-foreground">Perlu Pengakhiran</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalTerminated}</p>
                <p className="text-xs text-muted-foreground">Laporan Selesai</p>
              </div>
            </CardContent>
          </Card>
          {totalPendingReport > 0 && (
            <Card className="col-span-2 md:col-span-4 border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-6 h-6 text-destructive" />
                <p className="text-sm text-destructive font-medium">
                  {totalPendingReport} klien sudah selesai bimbingan tapi Pegawai PK belum membuat Laporan Pengakhiran
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filter & Search */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama pegawai..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'pending' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Belum Lapor
              </button>
              <button
                onClick={() => setFilterStatus('done')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'done' ? 'bg-green-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Sudah Selesai
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Pegawai Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar Pegawai PK</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Memuat data...</div>
            ) : filteredPegawai.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Tidak ada data pegawai ditemukan</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama Pegawai PK</TableHead>
                    <TableHead className="text-center">Total Klien</TableHead>
                    <TableHead className="text-center">Klien Aktif</TableHead>
                    <TableHead className="text-center">Perlu Pengakhiran</TableHead>
                    <TableHead className="text-center">Sudah Diakhiri</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPegawai.map((p, idx) => (
                    <>
                      <TableRow
                        key={p.user_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedPegawai(expandedPegawai === p.user_id ? null : p.user_id)}
                      >
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{p.full_name}</TableCell>
                        <TableCell className="text-center">{p.totalClients}</TableCell>
                        <TableCell className="text-center">{p.activeClients}</TableCell>
                        <TableCell className="text-center">
                          {p.needsTermination > 0 ? (
                            <Badge variant="destructive">{p.needsTermination}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{p.terminated}</TableCell>
                        <TableCell className="text-center">
                          {p.needsTermination > 0 ? (
                            <Badge variant="destructive" className="gap-1">
                              <Clock className="w-3 h-3" /> Belum Lengkap
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="w-3 h-3" /> Selesai
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedPegawai === p.user_id && p.clients.length > 0 && (
                        <TableRow key={`${p.user_id}-detail`}>
                          <TableCell colSpan={7} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <p className="text-sm font-semibold text-muted-foreground mb-2">Detail Klien - {p.full_name}</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Nama Klien</TableHead>
                                    <TableHead>No. Litmas</TableHead>
                                    <TableHead>Status Klien</TableHead>
                                    <TableHead>Status Bimbingan</TableHead>
                                    <TableHead>Masa Bimbingan</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {p.clients.map(c => (
                                    <TableRow key={c.id}>
                                      <TableCell>{c.full_name}</TableCell>
                                      <TableCell>{c.case_number || '-'}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="capitalize">{c.client_status || 'aktif'}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={c.guidance_status === 'aktif' ? 'default' : 'secondary'} className="capitalize">
                                          {c.guidance_status || '-'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {c.guidance_start && c.guidance_end
                                          ? `${c.guidance_start} s/d ${c.guidance_end}`
                                          : '-'}
                                      </TableCell>
                                      <TableCell>
                                        {c.needsTermination ? (
                                          <Badge variant="destructive" className="gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Perlu Pengakhiran
                                          </Badge>
                                        ) : c.guidance_status === 'selesai' ? (
                                          <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Sudah Diakhiri
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
