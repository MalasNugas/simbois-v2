import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CalendarCheck, CalendarClock, CalendarX } from 'lucide-react';

type Report = { client_id: string; report_date?: string | null; created_at?: string | null };
type Client = { id: string };

interface Props {
  reports: Report[];
  clients: Client[];
  title?: string;
  scopeLabel?: string;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const ymd = (d: Date) => d.toISOString().slice(0,10);

export default function DailyReportStats({ reports, clients, title = 'Aktivitas Wajib Lapor', scopeLabel }: Props) {
  const { todayCount, monthCount, notReportedThisMonth, chart } = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const dateOf = (r: Report) => {
      const s = r.report_date || r.created_at;
      return s ? startOfDay(new Date(s)) : null;
    };

    const todayClients = new Set<string>();
    const monthClients = new Set<string>();

    for (const r of reports) {
      const d = dateOf(r);
      if (!d) continue;
      if (d.getTime() === today.getTime()) todayClients.add(r.client_id);
      if (d >= monthStart) monthClients.add(r.client_id);
    }

    // 30-day bar chart: unique clients per day
    const buckets = new Map<string, Set<string>>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      buckets.set(ymd(d), new Set());
    }
    for (const r of reports) {
      const d = dateOf(r);
      if (!d) continue;
      const key = ymd(d);
      if (buckets.has(key)) buckets.get(key)!.add(r.client_id);
    }
    const chart = Array.from(buckets.entries()).map(([k, set]) => {
      const dt = new Date(k);
      return {
        label: `${dt.getDate()}/${dt.getMonth() + 1}`,
        jumlah: set.size,
      };
    });

    return {
      todayCount: todayClients.size,
      monthCount: monthClients.size,
      notReportedThisMonth: Math.max(0, clients.length - monthClients.size),
      chart,
    };
  }, [reports, clients]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 mb-8"
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {scopeLabel && <p className="text-xs text-muted-foreground">{scopeLabel}</p>}
        </div>
        <p className="text-xs text-muted-foreground">30 hari terakhir</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <MiniStat icon={CalendarCheck} label="Lapor Hari Ini" value={todayCount} accent="text-green-500" />
        <MiniStat icon={CalendarClock} label="Lapor Bulan Ini" value={monthCount} accent="text-primary" />
        <MiniStat icon={CalendarX} label="Belum Lapor Bulan Ini" value={notReportedThisMonth} accent="text-yellow-500" />
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chart}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            formatter={(v: any) => [`${v} klien`, 'Lapor']}
            labelFormatter={(l) => `Tanggal ${l}`}
          />
          <Bar dataKey="jumlah" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

function MiniStat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-4 bg-muted/30 flex items-center gap-3">
      <Icon className={`w-8 h-8 ${accent}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
