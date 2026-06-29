import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const colors = {
  success: 'bg-pass-bg text-pass border-pass/20',
  error: 'bg-fail-bg text-fail border-fail/20',
  info: 'bg-surface-2 text-ink border-line',
}

export function Toast() {
  const { toast, clearToast } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${colors[toast.type]}`}
        >
          {(() => {
            const Icon = icons[toast.type]
            return <Icon className="h-5 w-5" />
          })()}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={clearToast}
            className="ml-2 rounded p-1 hover:bg-black/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
