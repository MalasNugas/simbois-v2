import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface StatistikDashboardProps {
  clients: any[];
  monthlyReports: any[];
}

const COLORS = ['hsl(43, 72%, 55%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)', 'hsl(210, 100%, 56%)'];

export default function StatistikDashboard({ clients, monthlyReports }: StatistikDashboardProps) {
  const employmentData = useMemo(() => {
    const belum = clients.filter(c => c.employment_status === 'belum_bekerja').length;
    const pelatihan = clients.filter(c => c.employment_status === 'sedang_pelatihan').length;
    const sudah = clients.filter(c => c.employment_status === 'sudah_bekerja').length;
    return [
      { name: 'Belum Bekerja', value: belum },
      { name: 'Pelatihan', value: pelatihan },
      { name: 'Sudah Bekerja', value: sudah },
    ];
  }, [clients]);

  const guidanceData = useMemo(() => {
    const aktif = clients.filter(c => c.guidance_status === 'aktif').length;
    const selesai = clients.filter(c => c.guidance_status === 'selesai').length;
    const tidakAktif = clients.filter(c => c.guidance_status === 'tidak_aktif').length;
    return [
      { name: 'Aktif', value: aktif },
      { name: 'Selesai', value: selesai },
      { name: 'Tidak Aktif', value: tidakAktif },
    ];
  }, [clients]);

  const monthlyComplianceData = useMemo(() => {
    const now = new Date();
    const months: { month: string; lapor: number; belum: number }[] = [];
    const activeClients = clients.filter(c => c.guidance_status === 'aktif').length;

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const reported = new Set(
        monthlyReports.filter(r => r.report_month === m && r.report_year === y).map(r => r.client_id)
      ).size;
      months.push({
        month: `${monthNames[m - 1]} ${y}`,
        lapor: reported,
        belum: Math.max(0, activeClients - reported),
      });
    }
    return months;
  }, [clients, monthlyReports]);

  const statusData = useMemo(() => {
    const aktif = clients.filter(c => (c.client_status || 'aktif') === 'aktif').length;
    const meninggal = clients.filter(c => c.client_status === 'meninggal').length;
    const luarWilayah = clients.filter(c => c.client_status === 'di_luar_wilayah').length;
    return [
      { name: 'Aktif', value: aktif },
      { name: 'Meninggal', value: meninggal },
      { name: 'Di Luar Wilayah', value: luarWilayah },
    ];
  }, [clients]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Laporan & Statistik</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Compliance Bar Chart */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Kepatuhan Wajib Lapor (6 Bulan Terakhir)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyComplianceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 55%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 55%)' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(220, 22%, 12%)', border: '1px solid hsl(220, 15%, 20%)', borderRadius: 8 }}
                labelStyle={{ color: 'hsl(45, 30%, 90%)' }}
              />
              <Bar dataKey="lapor" name="Sudah Lapor" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="belum" name="Belum Lapor" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Employment Pie */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Status Pekerjaan Klien</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={employmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {employmentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(220, 22%, 12%)', border: '1px solid hsl(220, 15%, 20%)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Guidance Status Pie */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Status Bimbingan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={guidanceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {guidanceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(220, 22%, 12%)', border: '1px solid hsl(220, 15%, 20%)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Client Status Pie */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Status Klien</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(220, 22%, 12%)', border: '1px solid hsl(220, 15%, 20%)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
