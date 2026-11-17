import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  changePassword as changePasswordRequest,
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
