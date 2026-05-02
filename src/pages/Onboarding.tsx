import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, UserCheck, LogIn, UserPlus, MapPin, BookOpen,
  CheckCircle2, FileText, Settings, Bell, ClipboardCheck, ArrowRight,
  Lock, MailCheck, Smartphone, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Role = 'admin' | 'pegawai' | 'klien';

interface Step {
  icon: any;
  title: string;
  desc: string;
  tips?: string[];
}

const steps: Record<Role, Step[]> = {
  klien: [
    { icon: UserPlus, title: '1. Registrasi Akun', desc: 'Buat akun baru dengan memilih peran "Klien". Lengkapi nama, email, dan kata sandi (minimal 6 karakter).', tips: ['Gunakan email aktif yang dapat diverifikasi', 'Simpan kata sandi dengan aman'] },
    { icon: MailCheck, title: '2. Verifikasi Email', desc: 'Cek inbox/spam email Anda. Klik tautan verifikasi untuk mengaktifkan akun sebelum login.', tips: ['Tautan verifikasi berlaku terbatas waktu'] },
    { icon: LogIn, title: '3. Login ke SIMBOIS', desc: 'Masuk menggunakan email & kata sandi yang telah didaftarkan.', tips: ['Tekan "Lupa Sandi" jika lupa kata sandi'] },
    { icon: UserCheck, title: '4. Lengkapi Profil', desc: 'Isi data diri lengkap: nomor telepon, alamat, tempat & tanggal lahir, jenis kelamin, dan unggah foto profil.', tips: ['Data ini diperlukan untuk pembimbingan'] },
    { icon: Users, title: '5. Pilih Pegawai PK', desc: 'Pilih Pembimbing Kemasyarakatan (Pegawai PK) yang akan mendampingi proses bimbingan Anda.', tips: ['Pilihan Pegawai PK dapat dilihat di dashboard'] },
    { icon: Smartphone, title: '6. Izinkan Akses GPS', desc: 'Saat masuk dashboard, browser akan meminta izin lokasi. Pilih "Allow / Izinkan" agar sistem dapat memantau lokasi Anda.', tips: ['GPS wajib aktif selama masa bimbingan', 'Hindari memakai VPN/lokasi palsu'] },
    { icon: Navigation, title: '7. Aktivasi Pelacakan Lokasi', desc: 'Sistem otomatis melacak lokasi Anda di area Malang Raya. Jika berada di luar wilayah, status otomatis berubah menjadi "Di Luar Wilayah".', tips: ['Pastikan layanan lokasi HP aktif', 'Sinyal GPS lebih akurat di luar ruangan'] },
    { icon: BookOpen, title: '8. Daftar Program Bimbingan', desc: 'Telusuri program yang tersedia dan ajukan pendaftaran. Tunggu persetujuan dari Pegawai PK.', tips: ['Cek notifikasi untuk status pendaftaran'] },
    { icon: ClipboardCheck, title: '9. Lapor Bulanan', desc: 'Lakukan wajib lapor setiap bulan melalui menu Wajib Lapor di dashboard.', tips: ['Sistem akan mengingatkan Anda otomatis'] },
  ],
  pegawai: [
    { icon: UserPlus, title: '1. Registrasi sebagai Pegawai PK', desc: 'Daftarkan akun dengan memilih peran "Pegawai PK". Gunakan email institusi/resmi.', tips: ['Email institusi memudahkan verifikasi'] },
    { icon: MailCheck, title: '2. Verifikasi Email', desc: 'Buka email verifikasi yang dikirim sistem dan klik tautan aktivasi.' },
    { icon: LogIn, title: '3. Login Pegawai', desc: 'Masuk ke SIMBOIS menggunakan kredensial yang telah dibuat.' },
    { icon: UserCheck, title: '4. Lengkapi Profil', desc: 'Tambahkan nama lengkap, nomor telepon, dan foto profil pada halaman profil pegawai.', tips: ['Profil lengkap memudahkan klien mengenali Anda'] },
    { icon: Users, title: '5. Tinjau Daftar Klien', desc: 'Buka tab "Klien" untuk melihat klien yang menugaskan Anda atau klien yang belum memiliki Pegawai PK.', tips: ['Anda hanya melihat klien terkait Anda'] },
    { icon: BookOpen, title: '6. Kelola Program Bimbingan', desc: 'Buat program baru, atur jadwal, kuota, dan unggah materi PDF. Setujui/tolak pendaftaran klien.', tips: ['Materi PDF dapat diunduh klien'] },
    { icon: MapPin, title: '7. Monitoring Lokasi Klien', desc: 'Pantau posisi GPS klien secara realtime di tab "Peta". Klien di luar wilayah akan otomatis ditandai.', tips: ['Refresh peta untuk data terbaru'] },
    { icon: FileText, title: '8. Verifikasi Laporan & Pengakhiran', desc: 'Tinjau laporan bulanan klien dan ajukan Surat Pengakhiran ke Admin saat masa bimbingan selesai.', tips: ['Surat Pengakhiran perlu disetujui Admin'] },
    { icon: Bell, title: '9. Komunikasi & Notifikasi', desc: 'Gunakan fitur Chat untuk berkomunikasi dengan klien dan pantau notifikasi penting.' },
  ],
  admin: [
    { icon: Shield, title: '1. Akun Admin Telah Disediakan', desc: 'Akun Admin tidak melalui registrasi publik. Kredensial akan diberikan oleh tim teknis BAPAS.', tips: ['Hubungi tim IT bila belum menerima akses'] },
    { icon: LogIn, title: '2. Login Admin', desc: 'Masuk melalui halaman login menggunakan kredensial Admin yang diterima.', tips: ['Segera ganti kata sandi setelah login pertama'] },
    { icon: Lock, title: '3. Aktivasi Akun & Keamanan', desc: 'Verifikasi akun melalui email institusi. Pastikan kata sandi kuat dan unik.', tips: ['Gunakan kombinasi huruf, angka, simbol'] },
    { icon: Settings, title: '4. Akses Dashboard Admin', desc: 'Setelah login, sistem otomatis mengarahkan ke Dashboard Admin dengan akses penuh.' },
    { icon: Users, title: '5. Kelola Pengguna', desc: 'Pantau daftar Klien, Pegawai PK, dan profil seluruh pengguna sistem.', tips: ['Hanya Admin yang dapat mengubah No. Litmas'] },
    { icon: ClipboardCheck, title: '6. Atur Masa Bimbingan', desc: 'Tetapkan tanggal mulai & akhir Masa Bimbingan untuk setiap klien.', tips: ['Hak eksklusif Admin'] },
    { icon: FileText, title: '7. Setujui Surat Pengakhiran', desc: 'Tinjau dan setujui pengajuan Surat Pengakhiran Bimbingan dari Pegawai PK.', tips: ['Periksa kelengkapan dokumen sebelum approve'] },
    { icon: BookOpen, title: '8. Pantau Statistik & Laporan', desc: 'Akses statistik global, ekspor data ke PDF, dan evaluasi efektivitas program.', tips: ['Gunakan filter untuk laporan spesifik'] },
  ],
};

const roleMeta: Record<Role, { label: string; icon: any; color: string; desc: string }> = {
  klien: { label: 'Klien', icon: Users, color: 'from-emerald-500 to-teal-600', desc: 'Panduan untuk klien pemasyarakatan' },
  pegawai: { label: 'Pegawai PK', icon: UserCheck, color: 'from-blue-500 to-indigo-600', desc: 'Panduan untuk Pembimbing Kemasyarakatan' },
  admin: { label: 'Admin', icon: Shield, color: 'from-amber-500 to-orange-600', desc: 'Panduan untuk Administrator Sistem' },
};

export default function Onboarding() {
  const [role, setRole] = useState<Role>('klien');
  const navigate = useNavigate();
  const Meta = roleMeta[role];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-3">
            Panduan Penggunaan
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            Onboarding <span className="text-gradient-gold">SIMBOIS</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ikuti langkah awal mulai dari login, verifikasi akun, hingga aktivasi GPS sesuai peran Anda.
          </p>
        </motion.div>

        {/* Role Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          {(Object.keys(roleMeta) as Role[]).map((r) => {
            const M = roleMeta[r];
            const active = role === r;
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`glass-card rounded-xl p-4 text-left transition-all border-2 ${
                  active ? 'border-primary glow-gold' : 'border-transparent hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${M.color} flex items-center justify-center shrink-0`}>
                    <M.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{M.label}</div>
                    <div className="text-xs text-muted-foreground">{M.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="glass-card rounded-2xl p-6 mb-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${Meta.color} flex items-center justify-center`}>
                <Meta.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Alur Onboarding {Meta.label}</h2>
                <p className="text-sm text-muted-foreground">{steps[role].length} langkah utama untuk memulai</p>
              </div>
            </div>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent hidden sm:block" />

              {steps[role].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="relative pl-0 sm:pl-14 mb-4"
                >
                  {/* Step number circle */}
                  <div className="absolute left-0 top-2 w-10 h-10 rounded-full gradient-gold hidden sm:flex items-center justify-center text-primary-foreground font-bold shadow-lg z-10">
                    <step.icon className="w-5 h-5" />
                  </div>

                  <div className="glass-card rounded-xl p-5 hover:glow-gold transition-all">
                    <div className="flex items-start gap-3 sm:hidden mb-3">
                      <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shrink-0">
                        <step.icon className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                    <h3 className="font-bold text-base md:text-lg text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{step.desc}</p>
                    {step.tips && step.tips.length > 0 && (
                      <ul className="space-y-1.5">
                        {step.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-card rounded-2xl p-6 md:p-8 text-center mt-8 glow-gold"
            >
              <h3 className="text-xl font-bold mb-2">Siap Memulai?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                {role === 'admin'
                  ? 'Login menggunakan kredensial Admin yang telah disediakan.'
                  : 'Daftar akun baru atau login jika sudah memiliki akses.'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {role !== 'admin' && (
                  <Button onClick={() => navigate('/register')} className="gap-2">
                    <UserPlus className="w-4 h-4" /> Daftar Sekarang
                  </Button>
                )}
                <Button variant={role === 'admin' ? 'default' : 'outline'} onClick={() => navigate('/login')} className="gap-2">
                  <LogIn className="w-4 h-4" /> Masuk <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
