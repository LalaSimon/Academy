import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { Role } from '@academy/shared';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
    isMinor: boolean;
    firstName: string;
    lastName: string;
    needsChildSetup?: boolean;
  };
}

export function useLogin() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api.post<LoginResponse>('/auth/login', credentials).then((r) => r.data),
    onSuccess: ({ accessToken, user }) => {
      login(accessToken, user);
      if (user.needsChildSetup) {
        navigate('/parent/setup');
      } else {
        navigate(getDashboardPath(user.role));
      }
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      logout();
      navigate('/login');
    },
  });
}

function getDashboardPath(role: Role): string {
  const paths: Record<Role, string> = {
    ADMIN: '/admin',
    TEACHER: '/teacher',
    STUDENT: '/student',
    PARENT: '/parent',
  };
  return paths[role] ?? '/';
}
