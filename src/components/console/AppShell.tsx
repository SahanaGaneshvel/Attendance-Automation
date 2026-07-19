import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { Toast } from '@/components/layout/Toast'
import { TooltipProvider } from '@/components/ui/tooltip'

// Teacher views
import { TeacherView } from './views/TeacherView'
import { TeacherPendingView, TeacherHistoryView } from './views/teacher'

// HOD views
import { HodView } from './views/HodView'
import { HodSectionsView, HodFacultyView, HodAlertsView } from './views/hod'

// Dean views
import { DeanView } from './views/DeanView'
import { DeanRankingsView, DeanTrendsView, DeanAlertsView } from './views/dean'

// Header copy based on role and active nav
const HEADER_CONFIG: Record<string, Record<string, { title: string; subtitle: string }>> = {
  teacher: {
    overview: { title: "Today's Attendance", subtitle: 'View and submit attendance for your class' },
    entry: { title: 'Pending Attendance', subtitle: 'Submit attendance for your assigned section' },
    history: { title: 'Attendance History', subtitle: 'View past attendance records and trends' },
  },
  hod: {
    overview: { title: 'Department Dashboard', subtitle: 'Overview of all sections in your department' },
    sections: { title: 'Section Comparison', subtitle: 'Compare attendance across all sections' },
    faculty: { title: 'Faculty Performance', subtitle: 'Class teacher reporting status and metrics' },
    alerts: { title: 'Low Attendance Alerts', subtitle: 'Sections and classes needing attention' },
  },
  dean: {
    overview: { title: 'School Overview', subtitle: 'Institution-wide attendance analytics' },
    departments: { title: 'Department Rankings', subtitle: 'Compare departments by attendance' },
    trends: { title: 'Monthly Trends', subtitle: 'Historical attendance patterns and analysis' },
    alerts: { title: 'Alerts & Attention', subtitle: 'School-wide alerts and action items' },
  },
  admin: {
    overview: { title: 'System Overview', subtitle: 'Administration console' },
  },
}

export function AppShell() {
  const { theme, role, activeNavKey } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Render the appropriate view based on role and activeNavKey
  const renderView = () => {
    // Teacher views
    if (role === 'teacher') {
      switch (activeNavKey) {
        case 'entry':
          return <TeacherPendingView />
        case 'history':
          return <TeacherHistoryView />
        case 'overview':
        default:
          return <TeacherView />
      }
    }

    // HOD views
    if (role === 'hod') {
      switch (activeNavKey) {
        case 'sections':
          return <HodSectionsView />
        case 'faculty':
          return <HodFacultyView />
        case 'alerts':
          return <HodAlertsView />
        case 'overview':
        default:
          return <HodView />
      }
    }

    // Dean/Admin views
    switch (activeNavKey) {
      case 'departments':
        return <DeanRankingsView />
      case 'trends':
        return <DeanTrendsView />
      case 'alerts':
        return <DeanAlertsView />
      case 'overview':
      default:
        return <DeanView />
    }
  }

  // Get header copy based on role and active nav
  const roleConfig = HEADER_CONFIG[role] ?? HEADER_CONFIG.dean
  const headerCopy = roleConfig[activeNavKey] ?? roleConfig.overview ?? { title: 'Dashboard', subtitle: '' }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="app-shell-v2">
        <Sidebar />
        <div className="app-main">
          <DashboardHeader title={headerCopy.title} subtitle={headerCopy.subtitle} />
          <main className="page">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${role}-${activeNavKey}`}
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
