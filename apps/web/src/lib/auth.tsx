import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearStoredMessages } from "../features/chat/chat-storage";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface AuthUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: "admin" | "employee";
}

interface AuthState {
  readonly user: AuthUser | null;
  readonly token: string | null;
  readonly loading: boolean;
  readonly login: (username: string, password: string) => Promise<void>;
  readonly logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

const TOKEN_KEY = "rag-demo-token";

export const AuthProvider = ({ children }: { readonly children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("invalid");
        return res.json() as Promise<{ user: AuthUser }>;
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (username: string, password: string): Promise<void> => {
    const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Login failed" })) as { error?: string };
      throw new Error(body.error ?? "Login failed");
    }
    const data = (await res.json()) as { token: string; user: AuthUser };
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = (): void => {
    // Clear conversation data for current user before removing token
    if (user?.id) {
      localStorage.removeItem(`rag-demo-conv-${user.id}`);
      clearStoredMessages(user.id);
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => useContext(AuthContext);
