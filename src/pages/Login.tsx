import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      // Role will be fetched by AuthProvider, redirect based on role
      const { data } = await supabase.from('user_roles').select('role').maybeSingle();
      if (data?.role === 'pegawai') {
        navigate('/dashboard/pegawai');
      } else {
        navigate('/dashboard/klien');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md glow-gold">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center font-bold text-primary-foreground mx-auto mb-4">SM</div>
          <h1 className="text-2xl font-bold">Masuk ke SIMBOS</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistem Informasi Monitoring & Bimbingan Online</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@contoh.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn className="w-4 h-4" /> {loading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Belum punya akun?{' '}
          <Link to="/register" className="text-primary hover:underline">Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
}
