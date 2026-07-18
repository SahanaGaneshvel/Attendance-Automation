import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { DeanView } from './views/DeanView'
import { HodView } from './views/HodView'
import { TeacherView } from './views/TeacherView'
import { Toast } from '@/components/layout/Toast'
import { TooltipProvider } from '@/components/ui/tooltip'

const HEADER_COPY = {
  dean: { title: 'School Overview', subtitle: 'Institution-wide attendance analytics' },
  hod: { title: 'Department Dashboard', subtitle: 'Faculty & section attendance for your department' },
  teacher: { title: 'My Classes', subtitle: "Today's attendance and history" },
  admin: { title: 'System Overview', subtitle: 'Administration console' },
}

export function AppShell() {
  const { theme, role } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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

  const copy = HEADER_COPY[role] ?? HEADER_COPY.dean

  return (
    <TooltipProvider delayDuration={200}>
      <div className="app-shell-v2">
        <Sidebar />
        <div className="app-main">
          <DashboardHeader title={copy.title} subtitle={copy.subtitle} />
          <main className="page">
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
          </main>
        </div>
      </div>
      <Toast />
    </TooltipProvider>
  )
}
