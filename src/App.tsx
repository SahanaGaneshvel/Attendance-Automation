import { Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from '@/contexts/DataContext'
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext'
import { AppShell } from '@/components/console'
import { LoginPage } from '@/pages/Login'
import { Loader2 } from 'lucide-react'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ground">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  )
}

function ProtectedRoutes() {
  const { isLoading, isAuthenticated } = useAuthContext()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  )
}

function AppRoutes() {
  const { isLoading, isAuthenticated } = useAuthContext()

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage onSuccess={() => window.location.href = '/'} />
          )
        }
      />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
