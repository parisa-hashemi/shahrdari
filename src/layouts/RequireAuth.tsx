import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/** Demo route guard. Real session validation belongs to the backend (FSD-C07). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const authenticated = useAuthStore((s) => s.authenticated);
  const location = useLocation();
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
