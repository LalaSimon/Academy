import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { Role } from '@academy/shared';

interface Props {
  allowedRoles?: Role[];
}

export function PrivateRoute({ allowedRoles }: Props) {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
