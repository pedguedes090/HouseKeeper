import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  apiFetch,
  clearTokens,
  getRefreshToken,
  hydrateTokens,
  saveTokens,
} from '@/lib/api';
import { clearProtectedImageCache } from '@/lib/protected-image-loader';
import { TokenPair, User } from '@/lib/types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const resetPrivateCaches = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await Promise.allSettled([
      clearProtectedImageCache(),
      Image.clearMemoryCache(),
      Image.clearDiskCache(),
    ]);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const nextUser = await apiFetch<User>('/auth/me');
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const hasTokens = await hydrateTokens();
        if (!hasTokens) {
          if (active) setStatus('anonymous');
          return;
        }
        const nextUser = await apiFetch<User>('/auth/me');
        if (active) {
          setUser(nextUser);
          setStatus('authenticated');
        }
      } catch {
        await clearTokens();
        await resetPrivateCaches();
        if (active) {
          setUser(null);
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [resetPrivateCaches]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiFetch<TokenPair>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false,
    );
    await resetPrivateCaches();
    await saveTokens(tokens);
    const nextUser = await apiFetch<User>('/auth/me');
    setUser(nextUser);
    setStatus('authenticated');
  }, [resetPrivateCaches]);

  const register = useCallback(async (input: RegisterInput) => {
    const tokens = await apiFetch<TokenPair>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      false,
    );
    await resetPrivateCaches();
    await saveTokens(tokens);
    const nextUser = await apiFetch<User>('/auth/me');
    setUser(nextUser);
    setStatus('authenticated');
  }, [resetPrivateCaches]);

  const logout = useCallback(async () => {
    const token = getRefreshToken();
    try {
      if (token) {
        await apiFetch<void>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: token }),
        });
      }
    } finally {
      await resetPrivateCaches();
      await clearTokens();
      setUser(null);
      setStatus('anonymous');
    }
  }, [resetPrivateCaches]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout, refreshUser }),
    [status, user, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
