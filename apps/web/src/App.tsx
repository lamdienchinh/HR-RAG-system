import { Link, Outlet, useMatches, useNavigate } from '@tanstack/react-router';
import { Bot, LogOut } from 'lucide-react';
import { useEffect } from 'react';

import { useAuth } from './lib/auth';
import { T } from './vi';

const App = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const matches = useMatches();
  const isLoginPage = matches.some((m) => m.fullPath === '/login');

  // Redirect to login if not authenticated, or away from login if authenticated
  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) {
      void navigate({ to: '/login' });
    } else if (user && isLoginPage) {
      void navigate({ to: '/' });
    }
  }, [loading, user, isLoginPage, navigate]);

  // On login page, just render the outlet (LoginPage) without header
  if (isLoginPage) {
    return (
      <main className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),linear-gradient(135deg,#f8fafc,#eef2ff_55%,#f8fafc)] text-slate-950">
        <Outlet />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Đang tải...</div>
      </main>
    );
  }

  if (!user) return null;

  const handleLogout = (): void => {
    logout();
    void navigate({ to: '/login' });
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),linear-gradient(135deg,#f8fafc,#eef2ff_55%,#f8fafc)] text-slate-950">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-2.5 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">HR Assistant</h1>
            <p className="text-xs text-slate-500">Chat chính sách nhân sự với truy xuất bằng chứng</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex rounded-full bg-slate-100 p-1 text-sm font-semibold">
            <Link
              activeProps={{ className: 'bg-white text-slate-950 shadow-sm' }}
              className="rounded-full px-4 py-1.5 text-slate-500 transition"
              to="/"
            >
              {T.navChat}
            </Link>
            {user.role === 'admin' && (
              <Link
                activeProps={{ className: 'bg-white text-slate-950 shadow-sm' }}
                className="rounded-full px-4 py-1.5 text-slate-500 transition"
                to="/policies"
              >
                {T.navPolicies}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
            <span className="text-xs font-semibold text-slate-700">{user.displayName}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {user.role}
            </span>
            <button
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </main>
  );
};

export default App;
