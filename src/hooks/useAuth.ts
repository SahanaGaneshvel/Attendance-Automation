/**
 * Authentication Hook
 * Manages auth state, login/logout, and role detection.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  login as apiLogin,
  logout as apiLogout,
  isAuthenticated,
  getCurrentUser,
  ApiError,
  type UserInfo,
} from '@/api'
import { useAppStore, type DemoRole } from '@/store/appStore'

interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  user: UserInfo | null
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null,
  })

  const { setRole } = useAppStore()

  // Check auth status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = useCallback(async () => {
    if (!isAuthenticated()) {
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      })
      return
    }

    try {
      const user = await getCurrentUser()
      setState({
        isLoading: false,
        isAuthenticated: true,
        user,
        error: null,
      })

      // Map backend role to frontend role
      // Backend uses: teacher, hod, dean, admin
      const roleMap: Record<string, DemoRole> = {
        admin: 'dean',      // Admin sees dean view (full access)
        dean: 'dean',
        hod: 'hod',
        teacher: 'teacher',
      }
      const frontendRole = roleMap[user.role] || 'teacher'
      setRole(frontendRole)
    } catch (error) {
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: error instanceof ApiError ? error.message : 'Failed to check auth',
      })
    }
  }, [setRole])

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      await apiLogin(email, password)
      await checkAuth()
      return { success: true }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Login failed'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
      return { success: false, error: message }
    }
  }, [checkAuth])

  const logout = useCallback(() => {
    apiLogout()
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      error: null,
    })
    setRole('dean') // Reset to default
  }, [setRole])

  return {
    ...state,
    login,
    logout,
    checkAuth,
  }
}
