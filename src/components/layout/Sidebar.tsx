import { useState } from 'react'
import { motion } from 'motion/react'
import {
  LayoutDashboard,
  Building2,
  Users2,
  GraduationCap,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Sun,
  Moon,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useAppStore, type DemoRole } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface NavItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  dot?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// Nav content per role - each key maps to a specific view/page
const NAV_BY_ROLE: Record<DemoRole, NavGroup[]> = {
  dean: [
    {
      label: 'Overview',
      items: [
        { key: 'overview', label: 'School Overview', icon: LayoutDashboard, dot: 'var(--accent)' },
        { key: 'departments', label: 'Department Rankings', icon: Building2, dot: 'var(--info)' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { key: 'trends', label: 'Monthly Trends', icon: BarChart3, dot: 'var(--cyan)' },
        { key: 'alerts', label: 'Alerts', icon: AlertTriangle, dot: 'var(--warn)' },
      ],
    },
  ],
  hod: [
    {
      label: 'Department',
      items: [
        { key: 'overview', label: 'Department Attendance', icon: LayoutDashboard, dot: 'var(--accent)' },
        { key: 'sections', label: 'Section Comparison', icon: Users2, dot: 'var(--info)' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { key: 'faculty', label: 'Faculty Performance', icon: GraduationCap, dot: 'var(--cyan)' },
        { key: 'alerts', label: 'Low Attendance Alerts', icon: AlertTriangle, dot: 'var(--warn)' },
      ],
    },
  ],
  teacher: [
    {
      label: 'My Classes',
      items: [
        { key: 'overview', label: "Today's Attendance", icon: LayoutDashboard, dot: 'var(--accent)' },
        { key: 'entry', label: 'Pending Attendance', icon: ClipboardList, dot: 'var(--warn)' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { key: 'history', label: 'Attendance History', icon: BarChart3, dot: 'var(--cyan)' },
      ],
    },
  ],
  admin: [
    {
      label: 'Overview',
      items: [
        { key: 'overview', label: 'System Overview', icon: LayoutDashboard, dot: 'var(--accent)' },
      ],
    },
  ],
}

export function Sidebar() {
  const { role, theme, toggleTheme, activeNavKey, setActiveNavKey } = useAppStore()
  const { user } = useAuthContext()
  const [collapsed, setCollapsed] = useState(false)
  const groups = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.dean

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">A</div>
        {!collapsed && (
          <div>
            <div className="sidebar-brand-text">Attendance</div>
            <div className="sidebar-brand-sub">HITS · Analytics</div>
          </div>
        )}
      </div>

      {groups.map((group) => (
        <div className="sidebar-section" key={group.label}>
          {!collapsed && <div className="sidebar-section-label">{group.label}</div>}
          <nav className="sidebar-nav">
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = activeNavKey === item.key
              return (
                <motion.div
                  key={item.key}
                  className={cn('sidebar-item', isActive && 'active')}
                  onClick={() => setActiveNavKey(item.key)}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="sidebar-item-icon" />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {!collapsed && item.dot && (
                    <span className="sidebar-item-dot" style={{ background: item.dot }} />
                  )}
                </motion.div>
              )
            })}
          </nav>
        </div>
      ))}

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="min-w-0">
              <div className="sidebar-user-name">{user?.name ?? 'Demo User'}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-1">
          <button
            onClick={toggleTheme}
            className="sidebar-item flex-1 justify-center"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="sidebar-item-icon" /> : <Sun className="sidebar-item-icon" />}
            {!collapsed && <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="sidebar-item justify-center"
            title="Collapse sidebar"
          >
            {collapsed ? <ChevronsRight className="sidebar-item-icon" /> : <ChevronsLeft className="sidebar-item-icon" />}
          </button>
        </div>
      </div>
    </aside>
  )
}

export { NAV_BY_ROLE }
