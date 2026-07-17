/**
 * Auth Context
 * Provides authentication state and methods to the entire app.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  login as apiLogin,
  logout as apiLogout,
  isAuthenticated as checkIsAuthenticated,
  getCurrentUser,
  ApiError,
  type UserInfo,
} from '@/api'
import { useAppStore, type DemoRole } from '@/store/appStore'

interface AuthContextValue {
  isLoading: boolean
  isAuthenticated: boolean
  user: UserInfo | null
  error: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { setRole } = useAppStore()

  // Check auth status on mount
  const checkAuth = useCallback(async () => {
    if (!checkIsAuthenticated()) {
      setIsLoading(false)
      setIsAuthenticated(false)
      setUser(null)
      return
    }

    try {
      const userData = await getCurrentUser()
      setUser(userData)
      setIsAuthenticated(true)
      setError(null)

      // Map backend role to frontend role
      const roleMap: Record<string, DemoRole> = {
        admin: 'dean',      // Admin sees dean view (full access)
        dean: 'dean',
        hod: 'hod',
        teacher: 'teacher',
      }
      const frontendRole = roleMap[userData.role] || 'teacher'
      setRole(frontendRole)
    } catch (err) {
      setUser(null)
      setIsAuthenticated(false)
      setError(err instanceof ApiError ? err.message : 'Failed to check auth')
    } finally {
      setIsLoading(false)
    }
  }, [setRole])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await apiLogin(email, password)
      await checkAuth()
      return { success: true }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed'
      setError(message)
      setIsLoading(false)
      return { success: false, error: message }
    }
  }, [checkAuth])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
    setIsAuthenticated(false)
    setError(null)
    setRole('dean') // Reset to default
  }, [setRole])

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, user, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
