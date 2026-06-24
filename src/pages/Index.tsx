import { motion } from 'framer-motion';
import { ArrowRight, Users, ClipboardCheck, ShieldCheck, MapPin, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
  { icon: ClipboardCheck, title: 'Absen Wajib Lapor', desc: 'Klien melaporkan diri tiap bulan secara online dengan validasi izin Pegawai PK dan verifikasi foto selfie.' },
  { icon: ShieldCheck, title: 'Izin Bulanan', desc: 'Pegawai PK memberikan izin wajib lapor tiap awal bulan; izin dapat dicabut bila diperlukan.' },
  { icon: Users, title: 'Manajemen Klien & Pegawai', desc: 'Pendataan dan pengelolaan klien beserta pegawai pembimbing dalam satu sistem.' },
  { icon: MapPin, title: 'Pencatatan Lokasi', desc: 'Lokasi GPS klien saat melakukan wajib lapor tercatat otomatis sebagai bukti pendukung.' },
  { icon: BarChart3, title: 'Monitoring & Laporan', desc: 'Dashboard real-time kepatuhan wajib lapor, statistik per pegawai, dan ekspor laporan.' },
  { icon: Calendar, title: 'Riwayat Bulanan', desc: 'Histori wajib lapor klien tersusun rapi per periode untuk evaluasi pembimbingan.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 gradient-navy" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />

        <div className="container mx-auto px-4 pt-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
              <motion.p variants={fadeUp} custom={0} className="text-primary font-semibold text-sm tracking-widest uppercase mb-4">
                Sistem Wajib Lapor & Monitoring Klien
              </motion.p>
              <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Selamat Datang di <span className="text-gradient-gold">SIMBOIS</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg mb-8 max-w-lg">
                Platform wajib lapor bulanan Klien Pemasyarakatan Bapas Kelas I Malang — sederhana, terukur, dan akuntabel.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate('/wajib-lapor')} className="gap-2">
                  Mulai Wajib Lapor <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/login')}>Masuk Petugas</Button>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="hidden lg:block">
              <div className="glass-card rounded-2xl p-8 glow-gold space-y-4">
                <div className="text-center pb-4 border-b border-border">
                  <ClipboardCheck className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h3 className="font-bold">Cara Wajib Lapor</h3>
                </div>
                {[
                  { n: '1', t: 'Cari Nama', d: 'Ketik nama Anda di halaman Wajib Lapor.' },
                  { n: '2', t: 'Cek Izin', d: 'Sistem memeriksa izin Pegawai PK bulan ini.' },
                  { n: '3', t: 'Ambil Selfie', d: 'Foto selfie untuk verifikasi identitas.' },
                  { n: '4', t: 'Kirim', d: 'Laporan tersimpan dan diteruskan ke Pegawai PK.' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                    <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center font-bold text-primary-foreground shrink-0">{s.n}</div>
                    <div>
                      <p className="font-semibold text-sm">{s.t}</p>
                      <p className="text-xs text-muted-foreground">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-2">Fitur Utama</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-2xl mx-auto">
              Fokus pada kepatuhan wajib lapor, manajemen klien dan pegawai, serta monitoring kepatuhan.
            </motion.p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="glass-card rounded-2xl p-6 hover:glow-gold transition-shadow group">
                <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <img src="/favicon.svg" alt="SIMBOIS Logo" className="w-12 h-12 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">© 2026 SIMBOIS — Balai Pemasyarakatan Kelas I Malang</p>
          <p className="text-xs text-muted-foreground mt-1">Sistem Informasi Monitoring dan Bimbingan Online Integrasi Sosial</p>
        </div>
      </footer>
    </div>
  );
}
