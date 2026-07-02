import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png?url';
import markerIcon from 'leaflet/dist/images/marker-icon.png?url';
import markerShadow from 'leaflet/dist/images/marker-shadow.png?url';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

// Fix Leaflet default icon paths for Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

type Report = {
  id: string; client_id: string; report_date: string;
  report_year: number; report_month: number;
  selfie_url: string | null; lat: number | null; lng: number | null;
  notes: string | null; job_status: string | null;
};
type Client = { id: string; full_name: string; case_number: string | null };

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

function SelfiePopup({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.functions.invoke('get-selfie-url', { body: { path } }).then(({ data }) => {
      if (alive && (data as any)?.url) setUrl((data as any).url);
    });
    return () => { alive = false; };
  }, [path]);
  if (!url) return <div className="text-xs text-muted-foreground">Memuat foto…</div>;
  return <img src={url} alt="selfie" className="w-full h-32 object-cover rounded" />;
}

export default function ReportsMap({ reports, clients }: { reports: Report[]; clients: Client[] }) {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear()]);
    reports.forEach(r => set.add(r.report_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [reports]);

  const filtered = useMemo(
    () => reports.filter(r => r.report_year === year && r.report_month === month && r.lat != null && r.lng != null),
    [reports, year, month]
  );

  const points: [number, number][] = filtered.map(r => [r.lat!, r.lng!]);
  const clientById = new Map(clients.map(c => [c.id, c]));

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{filtered.length} titik lokasi</span>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-[500px] rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={[-7.98, 112.63]}
          zoom={10}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          {filtered.map(r => {
            const c = clientById.get(r.client_id);
            return (
              <Marker key={r.id} position={[r.lat!, r.lng!]}>
                <Popup>
                  <div className="space-y-1 min-w-[180px]">
                    <p className="font-semibold text-sm">{c?.full_name || 'Klien'}</p>
                    <p className="text-xs text-gray-600">No. Litmas: {c?.case_number || '-'}</p>
                    <p className="text-xs text-gray-600">Lapor: {format(new Date(r.report_date), 'dd MMM yyyy')}</p>
                    {r.job_status && <p className="text-xs capitalize">Kerja: {r.job_status.replace('_', ' ')}</p>}
                    {r.selfie_url && <div className="mt-2"><SelfiePopup path={r.selfie_url} /></div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Tidak ada laporan dengan lokasi di periode ini.</p>
      )}
    </div>
  );
}
