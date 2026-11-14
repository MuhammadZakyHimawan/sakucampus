import { createContext, useContext } from 'react';
import type { RegisterInput, User } from '@/types';
import type { UserUpdate } from '@/services/auth.service';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  updateProfile: (updates: UserUpdate) => User;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }

  return context;
}
