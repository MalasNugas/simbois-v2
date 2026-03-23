import { useMemo } from 'react';
import { Users, Briefcase, GraduationCap, ShieldCheck, FileText, UserX, MapPin } from 'lucide-react';

interface StatistikDashboardProps {
  clients: any[];
  monthlyReports: any[];
}

export default function StatistikDashboard({ clients, monthlyReports }: StatistikDashboardProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const totalClien = clients.length;
    const aktif = clients.filter(c => (c.client_status || 'aktif') === 'aktif').length;
    const meninggal = clients.filter(c => c.client_status === 'meninggal').length;
    const luarWilayah = clients.filter(c => c.client_status === 'di_luar_wilayah').length;

    const bimbinganAktif = clients.filter(c => c.guidance_status === 'aktif').length;
    const bimbinganSelesai = clients.filter(c => c.guidance_status === 'selesai').length;
    const bimbinganTidakAktif = clients.filter(c => c.guidance_status === 'tidak_aktif').length;

    const belumBekerja = clients.filter(c => c.employment_status === 'belum_bekerja').length;
    const pelatihan = clients.filter(c => c.employment_status === 'sedang_pelatihan').length;
    const sudahBekerja = clients.filter(c => c.employment_status === 'sudah_bekerja').length;

    const sudahLapor = new Set(
      monthlyReports.filter(r => r.report_month === currentMonth && r.report_year === currentYear).map(r => r.client_id)
    ).size;
    const belumLapor = Math.max(0, bimbinganAktif - sudahLapor);

    return {
      totalClien, aktif, meninggal, luarWilayah,
      bimbinganAktif, bimbinganSelesai, bimbinganTidakAktif,
      belumBekerja, pelatihan, sudahBekerja,
      sudahLapor, belumLapor,
    };
  }, [clients, monthlyReports]);

  const cards = [
    { label: 'Total Klien', value: stats.totalClien, icon: Users, color: 'text-primary' },
    { label: 'Klien Aktif', value: stats.aktif, icon: ShieldCheck, color: 'text-green-400' },
    { label: 'Meninggal', value: stats.meninggal, icon: UserX, color: 'text-destructive' },
    { label: 'Di Luar Wilayah', value: stats.luarWilayah, icon: MapPin, color: 'text-yellow-400' },
    { label: 'Bimbingan Aktif', value: stats.bimbinganAktif, icon: ShieldCheck, color: 'text-green-400' },
    { label: 'Bimbingan Selesai', value: stats.bimbinganSelesai, icon: GraduationCap, color: 'text-blue-400' },
    { label: 'Bimbingan Tidak Aktif', value: stats.bimbinganTidakAktif, icon: UserX, color: 'text-muted-foreground' },
    { label: 'Belum Bekerja', value: stats.belumBekerja, icon: Briefcase, color: 'text-yellow-400' },
    { label: 'Sedang Pelatihan', value: stats.pelatihan, icon: GraduationCap, color: 'text-blue-400' },
    { label: 'Sudah Bekerja', value: stats.sudahBekerja, icon: Briefcase, color: 'text-green-400' },
    { label: 'Sudah Lapor (Bulan Ini)', value: stats.sudahLapor, icon: FileText, color: 'text-green-400' },
    { label: 'Belum Lapor (Bulan Ini)', value: stats.belumLapor, icon: FileText, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Laporan & Statistik</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
