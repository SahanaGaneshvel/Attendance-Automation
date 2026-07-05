import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { TopNavBar, KPIStrip } from './TopNavBar'
import { DeanView } from './views/DeanView'
import { HodView } from './views/HodView'
import { TeacherView } from './views/TeacherView'
import { Toast } from '@/components/layout/Toast'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppShell() {
  const { theme, role } = useAppStore()
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
        {/* Top Navigation Bar - full width */}
        <TopNavBar />

        {/* KPI Strip - contextual metrics */}
        <KPIStrip />

        {/* Main Content - full width, scrollable */}
        <main className="main-content">
          <div className="scroll-content">
            {/* Animate view transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 12 }}
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
