import { Navigate, Outlet, useLocation } from 'react-router'
import type { UserRole } from '@/api/types'
import { useAuth } from './AuthContext'

export function RequireAuth({ requiredRole }: { requiredRole?: UserRole }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/experiments" replace />
  return <Outlet />
}
