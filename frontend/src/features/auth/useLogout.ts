import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/toast-context';
import { useAuth } from './auth-context';

export function useLogout(): () => void {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  return useCallback(() => {
    logout();
    toast({
      title: 'Kamu telah keluar',
      description: 'Sampai jumpa lagi di SakuCampus.',
      variant: 'info',
    });
    navigate('/login', { replace: true });
  }, [logout, navigate, toast]);
}
