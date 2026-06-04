import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jellyfinApi } from '@/lib/jellyfin';
import type { ServerConfig } from '@/types/jellyfin';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  config: ServerConfig | null;
  login: (url: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'jellyfin_config';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ServerConfig;
        setConfig(parsed);
        jellyfinApi.setConfig(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (url: string, username: string, password: string) => {
    const normalizedUrl = url.replace(/\/$/, '');
    const result = await jellyfinApi.authenticate(normalizedUrl, username, password);
    const newConfig: ServerConfig = {
      url: normalizedUrl,
      username: result.User.Name,
      userId: result.User.Id,
      accessToken: result.AccessToken,
      serverId: result.ServerId,
    };
    setConfig(newConfig);
    jellyfinApi.setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  }, []);

  const logout = useCallback(() => {
    setConfig(null);
    jellyfinApi.clearConfig();
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!config,
        isLoading,
        config,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
