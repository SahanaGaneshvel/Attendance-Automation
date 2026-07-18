/**
 * Login Page
 * Rounded gradient-bordered card (form left, brand visual right) —
 * attendance-automation themed, using the app's indigo/violet design system.
 */
import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, AlertCircle, Eye, EyeOff, CalendarCheck2, TrendingUp } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface LoginPageProps {
  onSuccess?: () => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(true)
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #EDE9FE 0%, #E0E7FF 45%, #F5F3FF 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
        className="w-full max-w-[980px] rounded-[28px] p-2"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(139,92,246,0.35))',
          boxShadow: '0 30px 80px -20px rgba(76, 61, 219, 0.35)',
        }}
      >
        <div className="rounded-[22px] overflow-hidden bg-surface flex min-h-[560px]">
          {/* LEFT — Form */}
          <div className="w-full lg:w-[46%] flex items-center justify-center px-8 py-10 sm:px-12">
            <div className="w-full max-w-[360px]">
              {/* Brand mark */}
              <div className="flex items-center gap-2.5 mb-9">
                <div className="w-9 h-9 rounded-[10px] grid place-items-center text-white font-display font-bold text-sm flex-shrink-0" style={{ background: 'var(--accent-gradient)' }}>
                  A
                </div>
                <div className="leading-tight">
                  <div className="font-display text-[14px] font-semibold text-ink tracking-[-0.01em]">Attendance</div>
                  <div className="text-[10.5px] text-muted tracking-wide uppercase">Automation Console</div>
                </div>
              </div>

              <h1 className="font-display text-[22px] font-semibold text-ink tracking-[-0.01em] mb-1">
                Log in
              </h1>
              <p className="text-[13px] text-muted mb-7">
                First-hour attendance, live across the institution
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                {/* Email */}
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  autoComplete="email"
                  className={cn(
                    'w-full h-12 px-4 rounded-[12px] border bg-surface-2 text-ink text-[13.5px]',
                    'placeholder:text-faint border-line outline-none',
                    'transition-[border-color,box-shadow] duration-150',
                    'focus:border-accent focus:ring-4 focus:ring-accent-ring/30 focus:bg-surface'
                  )}
                />

                {/* Password */}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    className={cn(
                      'w-full h-12 pl-4 pr-11 rounded-[12px] border bg-surface-2 text-ink text-[13.5px]',
                      'placeholder:text-faint border-line outline-none',
                      'transition-[border-color,box-shadow] duration-150',
                      'focus:border-accent focus:ring-4 focus:ring-accent-ring/30 focus:bg-surface'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-0 top-0 h-12 w-11 flex items-center justify-center text-muted hover:text-ink-2 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Keep logged in + forgot password */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 text-[12px] text-ink-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-[var(--accent)]"
                    />
                    Keep me logged in
                  </label>
                  <button type="button" className="text-[12px] font-medium text-accent-ink hover:underline">
                    Forgot password?
                  </button>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {localError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5 text-[12px] text-fail overflow-hidden"
                    >
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{localError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full h-12 rounded-[12px] font-semibold text-[13.5px] transition-all duration-150 mt-1',
                    'text-white active:scale-[0.99]',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-ring/40'
                  )}
                  style={{ background: 'var(--accent-gradient)', boxShadow: '0 10px 24px -8px rgba(99,102,241,0.55)' }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Log in'
                  )}
                </button>
              </form>

              <p className="text-[12.5px] text-muted text-center mt-5">
                Don't have an account?{' '}
                <button type="button" className="text-accent-ink font-medium hover:underline">
                  Register
                </button>
              </p>

              <p className="text-[10.5px] text-faint text-center mt-8">
                Terms of Use &nbsp;·&nbsp; Privacy Policy
              </p>
            </div>
          </div>

          {/* RIGHT — Brand visual panel (hidden on mobile) */}
          <div
            className="hidden lg:flex w-[54%] relative overflow-hidden items-center justify-center"
            style={{ background: 'linear-gradient(160deg, #4338CA 0%, #6366F1 45%, #8B5CF6 100%)' }}
          >
            {/* dot grid texture */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="loginDots" width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="1.4" cy="1.4" r="1.4" fill="#FFFFFF" />
                </pattern>
              </defs>
              <rect width="400" height="400" fill="url(#loginDots)" />
            </svg>

            {/* soft glow blobs */}
            <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full opacity-30 blur-3xl" style={{ background: '#C4B5FD' }} />
            <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full opacity-25 blur-3xl" style={{ background: '#818CF8' }} />

            <div className="relative z-10 px-10 flex flex-col items-center text-center max-w-[380px]">
              {/* Illustrative attendance scene */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative mb-8"
              >
                <AttendanceIllustration />
              </motion.div>

              <h2 className="font-display text-[24px] font-semibold text-white tracking-[-0.02em] leading-tight">
                Attendance, automated
              </h2>
              <p className="text-[13px] text-indigo-100/80 mt-3 leading-relaxed">
                Real-time first-hour attendance across every department,
                section and school — one dashboard for the whole institution.
              </p>

              <div className="flex items-center gap-6 mt-7">
                <div className="flex items-center gap-2 text-white/90 text-[12px]">
                  <CalendarCheck2 className="w-4 h-4" />
                  Daily sync
                </div>
                <div className="flex items-center gap-2 text-white/90 text-[12px]">
                  <TrendingUp className="w-4 h-4" />
                  Live analytics
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/** Small original SVG scene: a person checking in on a tablet + floating stat chips. */
function AttendanceIllustration() {
  return (
    <svg width="220" height="200" viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* stand / kiosk */}
      <rect x="78" y="70" width="64" height="90" rx="10" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.35)" />
      <rect x="86" y="80" width="48" height="60" rx="6" fill="rgba(255,255,255,0.9)" />
      {/* checkmark on screen */}
      <path d="M98 110 L108 120 L124 98" stroke="#6366F1" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="100" y="150" width="20" height="10" rx="3" fill="rgba(255,255,255,0.35)" />

      {/* person silhouette (flat, non-identifiable) */}
      <circle cx="45" cy="72" r="14" fill="rgba(255,255,255,0.9)" />
      <path d="M20 140 C20 112 32 100 45 100 C58 100 70 112 70 140 L70 150 L20 150 Z" fill="rgba(255,255,255,0.9)" />
      <path d="M56 96 L82 108" stroke="rgba(255,255,255,0.9)" strokeWidth="8" strokeLinecap="round" />

      {/* floating stat chip */}
      <g transform="translate(150,20)">
        <rect width="58" height="26" rx="13" fill="rgba(255,255,255,0.95)" />
        <text x="29" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4338CA" fontFamily="Space Grotesk, sans-serif">
          98.2%
        </text>
      </g>
      <g transform="translate(10,20)">
        <rect width="46" height="22" rx="11" fill="rgba(255,255,255,0.22)" />
        <text x="23" y="15" textAnchor="middle" fontSize="9" fontWeight="600" fill="#FFFFFF" fontFamily="Inter, sans-serif">
          Live
        </text>
      </g>
    </svg>
  )
}

export default LoginPage
