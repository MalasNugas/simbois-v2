import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'klien' | 'pegawai'>('klien');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin
      }
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Assign role
      const { error: roleError } = await supabase.from('user_roles').insert({ user_id: data.user.id, role });
      if (roleError) {
        toast.error('Gagal menetapkan peran: ' + roleError.message);
      }

      // If klien, create client record
      if (role === 'klien') {
        await supabase.from('clients').insert({ user_id: data.user.id });
      }

      toast.success('Registrasi berhasil! Silakan cek email untuk verifikasi.');
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md glow-gold">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center font-bold text-primary-foreground mx-auto mb-4">SM</div>
          <h1 className="text-2xl font-bold">Daftar Akun SIMBOIS</h1>
          <p className="text-sm text-muted-foreground mt-1">Buat akun baru untuk memulai</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama lengkap" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@contoh.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required />
          </div>
          <div className="space-y-2">
            <Label>Daftar Sebagai</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('klien')}
                className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${
                role === 'klien' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50'}`
                }>
                
                Klien
              </button>
              <button
                type="button"
                onClick={() => setRole('pegawai')}
                className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${
                role === 'pegawai' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50'}`
                }>
                
                Pegawai PK
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <UserPlus className="w-4 h-4" /> {loading ? 'Memproses...' : 'Daftar'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-primary hover:underline">Masuk</Link>
        </p>
      </div>
    </div>);

}