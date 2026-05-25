import { Bot, Loader2 } from "lucide-react";
import { useState } from "react";

import { useAuth } from "../lib/auth";

export const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-lg backdrop-blur"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-slate-950 text-white">
            <Bot className="size-6" />
          </div>
          <h1 className="text-xl font-black tracking-tight">HR Assistant</h1>
          <p className="text-sm text-slate-500">Đăng nhập để tiếp tục</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="username">
              Tài khoản
            </label>
            <input
              id="username"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin hoặc employee"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Đăng nhập"}
        </button>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          Demo: admin / admin123 hoặc employee / employee123
        </p>
      </form>
    </div>
  );
};
