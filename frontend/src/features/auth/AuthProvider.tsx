import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MOCK_API_ENABLED } from '@/lib/config';
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  getStoredUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  updateProfile as updateProfileRequest,
} from '@/services/auth.service';
import type { UserUpdate } from '@/services/auth.service';
import type { RegisterInput, User } from '@/types';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (MOCK_API_ENABLED) {
      return;
    }

    let active = true;

    void getCurrentUser().then((restoredUser) => {
      if (!active) {
        return;
      }

      setUser(restoredUser);
    });

    return () => {
      active = false;
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
    void logoutRequest().catch(() => undefined);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: UserUpdate) => {
    const updatedUser = await updateProfileRequest(updates);
    setUser(updatedUser);

    return updatedUser;
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordRequest(currentPassword, newPassword);
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoggingIn,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [
      user,
      isLoggingIn,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
