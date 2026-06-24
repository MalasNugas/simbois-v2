import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && role) {
      navigate(role === 'admin' ? '/dashboard/admin' : '/dashboard/pegawai');
    }
  }, [user, role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Berhasil masuk');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 gradient-navy">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/favicon.svg" alt="SIMBOIS" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Masuk Petugas</h1>
          <p className="text-sm text-muted-foreground">Khusus Admin & Pegawai PK</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Masuk
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-6">
          Klien tidak perlu login. <a href="/wajib-lapor" className="text-primary">Klik di sini untuk wajib lapor.</a>
        </p>
      </div>
    </div>
  );
}
