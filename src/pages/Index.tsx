import { motion } from 'framer-motion';
import { ArrowRight, Users, BookOpen, Target, MapPin, Shield, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const stats = [
{ label: 'Klien Aktif', value: '150+', icon: Users },
{ label: 'Program Bimbingan', value: '12', icon: BookOpen },
{ label: 'Tingkat Keberhasilan', value: '85%', icon: Target }];


const features = [
{ icon: Users, title: 'Monitoring Klien', desc: 'Pantau aktivitas dan perkembangan klien secara real-time melalui dashboard terintegrasi.' },
{ icon: BookOpen, title: 'Bimbingan Online', desc: 'Program bimbingan kepribadian dan kemandirian yang dapat diakses kapan saja.' },
{ icon: MapPin, title: 'Tracking Lokasi', desc: 'Monitoring lokasi klien berbasis GPS untuk memastikan kepatuhan program reintegrasi.' },
{ icon: Shield, title: 'Keamanan Data', desc: 'Data klien dilindungi dengan sistem keamanan berlapis dan enkripsi modern.' },
{ icon: BarChart3, title: 'Laporan & Statistik', desc: 'Dashboard analitik lengkap untuk evaluasi efektivitas program bimbingan.' }];


const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 gradient-navy" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />

        <div className="container mx-auto px-4 pt-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
              <motion.p variants={fadeUp} custom={0} className="text-primary font-semibold text-sm tracking-widest uppercase mb-4">
                Sistem Informasi Monitoring & Bimbingan Online
              </motion.p>
              <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Selamat Datang di{' '}
                <span className="text-gradient-gold">SIMBOIS</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg mb-8 max-w-lg">
                Transformasi digital pembimbingan Klien Pemasyarakatan Bapas Malang menuju reintegrasi sosial yang lebih manusiawi, terukur, dan berkelanjutan.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate('/register')} className="gap-2">
                  Mulai Sekarang <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                  Masuk
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="hidden lg:block">
              
              <div className="glass-card rounded-2xl p-8 glow-gold space-y-6">
                {[
                { icon: Users, title: 'Mudah Diakses di Semua Platform', desc: 'Layanan pembimbingan yang dapat diakses kapan pun dan di mana pun.' },
                { icon: BookOpen, title: 'Pembimbingan Personal', desc: 'Pendampingan individual terfokus untuk setiap klien.' },
                { icon: Target, title: 'Terukur & Transparan', desc: 'Progres bimbingan yang dapat dipantau secara realtime.' }].
                map((item, i) =>
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-12">
            
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-2">Statistik Platform</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground">Data pencapaian SIMBOIS BAPAS KELAS I MALANG </motion.p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {stats.map((s, i) =>
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="glass-card rounded-2xl p-8 text-center glow-gold">
              
                <s.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="text-3xl font-extrabold text-primary mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-2">Fitur Unggulan</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-2xl mx-auto">
              Sistem terintegrasi untuk mendukung proses pembimbingan dan monitoring klien pemasyarakatan
            </motion.p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) =>
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="glass-card rounded-2xl p-6 hover:glow-gold transition-shadow group">
              
                <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="glass-card rounded-2xl p-8 md:p-12">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold mb-4 text-gradient-gold">Tentang SIMBOIS</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground mb-6 leading-relaxed">
              <strong className="text-foreground">SIMBOIS (Sistem Informasi Monitoring dan Bimbingan Online Integrasi Sosial)</strong> adalah inovasi digital dari Balai Pemasyarakatan Malang untuk mendukung proses pembimbingan klien pemasyarakatan berbasis teknologi informasi. Platform ini dirancang untuk memfasilitasi pembimbingan yang lebih terukur, terpantau, dan berkelanjutan.
            </motion.p>
            <motion.blockquote variants={fadeUp} custom={2} className="border-l-4 border-primary pl-4 italic text-muted-foreground">
              "Bukan tentang kontrol, tetapi koneksi. Bukan tentang hukuman, tetapi harapan. Kami percaya bahwa setiap manusia berhak untuk bertumbuh dan memulai kembali."
            </motion.blockquote>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center font-bold text-sm text-primary-foreground mx-auto mb-4">SM</div>
          <p className="text-sm text-muted-foreground">© 2026 SIMBOIS — Balai Pemasyarakatan Kelas I Malang        </p>
          <p className="text-xs text-muted-foreground mt-1">Sistem Informasi Monitoring dan Bimbingan Online Integrasi Sosial    
 </p>
        </div>
      </footer>
    </div>);
}