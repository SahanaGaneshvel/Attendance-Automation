import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { RoleRail } from './RoleRail'
import { TopBar } from './TopBar'
import { DeanView } from './views/DeanView'
import { HodView } from './views/HodView'
import { TeacherView } from './views/TeacherView'
import { Toast } from '@/components/layout/Toast'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppShell() {
  const { theme, role } = useAppStore()

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
        {/* Left Rail */}
        <aside className="rail">
          <RoleRail />
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <TopBar />
          <div className="scroll-content">
            {renderView()}
          </div>
        </main>
      </div>
      <Toast />
    </TooltipProvider>
  )
}
