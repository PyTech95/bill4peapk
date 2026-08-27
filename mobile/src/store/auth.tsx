import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '@/api/auth';
import { getToken, setUnauthorizedHandler } from '@/api/client';

type AuthState = {
  user: authApi.User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: authApi.RegisterPayload) => Promise<void>;
  otpVerify: (phone: string, otp: string, name?: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null);
  const [ready, setReady] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      const t = await getToken();
      if (t) setUser(await authApi.me());
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await authApi.login(email, password));
  }, []);

  const register = useCallback(async (p: authApi.RegisterPayload) => {
    setUser(await authApi.register(p));
  }, []);

  const otpVerify = useCallback(async (phone: string, otp: string, name?: string) => {
    setUser(await authApi.otpVerify(phone, otp, name));
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, ready, login, register, otpVerify, refresh, logout }}>
      {children}
    </Ctx.Provider>
  );
}
