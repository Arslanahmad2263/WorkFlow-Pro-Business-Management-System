import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { TasksPage } from '@/pages/TasksPage'
import { TeamPage } from '@/pages/TeamPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function RootRedirect() {
  const { user, initializing } = useAuth()
  if (initializing) return null
  return <Navigate to={user ? '/' : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route
            path="/reports"
            element={
              <ProtectedRoute managerOnly>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute adminOnly>
                <TeamPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  )
}