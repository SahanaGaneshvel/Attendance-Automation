import { Bell, Download, LogOut, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useRef, useEffect } from 'react'
import { useAppStore, type DemoRole } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { DatePicker } from '@/components/console/DatePicker'
import { getSummaryCsvUrl, downloadWithAuth } from '@/api'
import { cn } from '@/lib/utils'

const ROLES: DemoRole[] = ['dean', 'hod', 'teacher']

interface DashboardHeaderProps {
  title: string
  subtitle?: string
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { selectedDate, setSelectedDate, role, setRole, showToast } = useAppStore()
  const { user, logout } = useAuthContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const handleExport = async () => {
    try {
      const url = getSummaryCsvUrl(selectedDate)
      await downloadWithAuth(url, `summary_${selectedDate}.csv`)
      showToast('CSV exported successfully', 'success')
    } catch {
      showToast('Export failed', 'error')
    }
  }

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>

      <div className="topbar-spacer" />

      {/* Demo role switcher — swaps which role's dashboard is shown */}
      <div className="role-pill-group" title="Switch dashboard role (demo)">
        {ROLES.map((r) => (
          <button
            key={r}
            className={cn('role-pill', role === r && 'active')}
            onClick={() => setRole(r)}
          >
            {r}
          </button>
        ))}
      </div>

      <DatePicker value={selectedDate} onChange={setSelectedDate} />

      <button className="topbar-icon-btn" title="Notifications">
        <Bell className="w-4 h-4" />
      </button>

      <button className="topbar-btn-primary" onClick={handleExport}>
        <Download className="w-3.5 h-3.5" />
        Export
      </button>

      <div className="relative" ref={menuRef}>
        <button
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-line bg-surface hover:bg-surface-2 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="sidebar-user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
            {initials}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-[calc(100%+8px)] min-w-[190px] bg-surface border border-line rounded-[var(--radius-sm)] shadow-lg overflow-hidden z-50"
            >
              <div className="px-3.5 py-3 border-b border-line">
                <div className="text-sm font-semibold text-ink truncate">{user?.name ?? 'Demo User'}</div>
                <div className="text-xs text-muted truncate">{user?.email ?? ''}</div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-fail hover:bg-fail-bg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
