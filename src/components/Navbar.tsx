import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, ClipboardCheck } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useState } from 'react';

export default function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const dashboardLink = role === 'admin' ? '/dashboard/admin' : '/dashboard/pegawai';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="SIMBOIS Logo" className="w-9 h-9" />
          <span className="font-bold text-lg text-foreground">
            SIMBOIS <span className="text-primary text-sm font-medium hidden sm:inline">BAPAS KELAS I MALANG</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Beranda</Link>
          <Link to="/wajib-lapor" className="text-sm text-primary font-semibold hover:opacity-80 transition-opacity inline-flex items-center gap-1">
            <ClipboardCheck className="w-4 h-4" /> Wajib Lapor
          </Link>
          {user && (
            <Link to={dashboardLink} className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
          )}
          {!user ? (
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Masuk Petugas</Button>
          ) : (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <span className="text-xs text-muted-foreground capitalize px-2 py-1 rounded-full bg-secondary">{role}</span>
              <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="w-4 h-4" /></Button>
            </div>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass-card border-t border-border p-4 space-y-3">
          <Link to="/" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>Beranda</Link>
          <Link to="/wajib-lapor" className="block text-sm text-primary font-semibold" onClick={() => setOpen(false)}>Wajib Lapor</Link>
          {user && <Link to={dashboardLink} className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>Dashboard</Link>}
          {!user ? (
            <Button variant="ghost" size="sm" onClick={() => { navigate('/login'); setOpen(false); }}>Masuk Petugas</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => { handleSignOut(); setOpen(false); }}>
              <LogOut className="w-4 h-4 mr-2" /> Keluar
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
