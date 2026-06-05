import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth';
import { isManager } from '../types';

export default function ProtectedRoute({
  children,
  requireManager = false,
}: {
  children: ReactNode;
  requireManager?: boolean;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireManager && !isManager(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
