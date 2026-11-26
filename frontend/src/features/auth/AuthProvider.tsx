import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isMockApiEnabled } from '@/lib/config';
import {
  getAccessToken,
  setOnUnauthorizedHandler,
} from '@/services/api-client';
import {
  changePassword as changePasswordRequest,
  fetchCurrentUser,
  getStoredUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  updateProfile as updateProfileRequest,
} from '@/services/auth.service';
import type { UserUpdate } from '@/services/auth.service';
import type { ChangePasswordInput, RegisterInput, User } from '@/types';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isInitializing, setIsInitializing] = useState<boolean>(
    () => !isMockApiEnabled() && Boolean(getAccessToken()),
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      setUser(null);
    });

    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    if (isMockApiEnabled()) {
      setIsInitializing(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsInitializing(false);
      return;
    }

    let cancelled = false;
    setIsInitializing(true);

    fetchCurrentUser()
      .then((freshUser) => {
        if (!cancelled) {
          setUser(freshUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          logoutRequest();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoggingIn(true);

    try {
      const authenticatedUser = await loginRequest(email, password);
      setUser(authenticatedUser);
      return authenticatedUser;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const registeredUser = await registerRequest(input);
    setUser(registeredUser);
    return registeredUser;
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: UserUpdate) => {
    const updatedUser = await updateProfileRequest(updates);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    await changePasswordRequest(input);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await fetchCurrentUser();
      setUser(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      isLoggingIn,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    }),
    [
      user,
      isInitializing,
      isLoggingIn,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
