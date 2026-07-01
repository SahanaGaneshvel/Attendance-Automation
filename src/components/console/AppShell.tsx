import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { AnimatedRail } from './AnimatedRail'
import { TopBar } from './TopBar'
import { DeanView } from './views/DeanView'
import { HodView } from './views/HodView'
import { TeacherView } from './views/TeacherView'
import { Toast } from '@/components/layout/Toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SPRING } from '@/lib/motion'

export function AppShell() {
  const { theme, role, railCollapsed } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Render the appropriate view based on role
  const renderView = () => {
    switch (role) {
      case 'teacher':
        return <TeacherView />
      case 'hod':
        return <HodView />
      case 'dean':
      default:
        return <DeanView />
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="app-shell">
        {/* Animated Left Rail */}
        <motion.aside
          className="rail overflow-visible"
          animate={{ width: railCollapsed ? 64 : 248 }}
          transition={prefersReducedMotion ? { duration: 0 } : SPRING.smooth}
        >
          <AnimatedRail />
        </motion.aside>

        {/* Main Content */}
        <main className="main-content">
          <TopBar />
          <div className="scroll-content">
            {/* Animate view transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <Toast />
    </TooltipProvider>
  )
}
