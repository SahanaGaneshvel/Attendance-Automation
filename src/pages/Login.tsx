/**
 * Login Page
 * Production-grade authentication UI.
 */
import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface LoginPageProps {
  onSuccess?: () => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuthContext()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsSubmitting(true)

    const result = await login(email, password)
    setIsSubmitting(false)

    if (result.success) {
      onSuccess?.()
    } else {
      setLocalError(result.error || 'Login failed')
    }
  }

  const error = localError

  return (
    <div className="min-h-screen flex items-center justify-center bg-ground p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent text-white text-2xl font-bold mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-ink">First-Hour Attendance</h1>
          <p className="text-muted mt-2">Sign in to access the dashboard</p>
        </div>

        {/* Login Form */}
        <div className="panel">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 p-3 bg-fail/10 border border-fail/20 rounded-lg text-fail text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                required
                className={cn(
                  'w-full px-3 py-2 rounded-lg border transition-colors',
                  'bg-panel text-ink placeholder:text-muted',
                  'border-line focus:border-accent focus:ring-2 focus:ring-accent/20',
                  'outline-none'
                )}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className={cn(
                  'w-full px-3 py-2 rounded-lg border transition-colors',
                  'bg-panel text-ink placeholder:text-muted',
                  'border-line focus:border-accent focus:ring-2 focus:ring-accent/20',
                  'outline-none'
                )}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full py-2.5 px-4 rounded-lg font-medium transition-all',
                'bg-accent text-white',
                'hover:bg-accent/90 active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo Mode Notice */}
          <div className="mt-6 pt-4 border-t border-line">
            <p className="text-xs text-muted text-center">
              Demo mode: Use the role selector in the dashboard header to switch views
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-6">
          First-Hour Attendance Dashboard v2.0
        </p>
      </motion.div>
    </div>
  )
}

export default LoginPage
