import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoader } from '@/components/ui/Spinner'

export function ProtectedRoute({
  children,
  managerOnly,
  adminOnly,
}: {
  children: ReactNode
  managerOnly?: boolean
  adminOnly?: boolean
}) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <PageLoader label="Checking session…" />
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  if (managerOnly && user.role !== 'admin' && user.role !== 'manager') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}