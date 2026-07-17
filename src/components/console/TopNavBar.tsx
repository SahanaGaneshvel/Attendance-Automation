import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Calendar, Download, ChevronDown, ChevronRight, Sun, Moon, LogOut, User } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { workingDays, departments, getAllDepartmentStats, getCollegeStats } from '@/data/store'
import { getSummaryCsvUrl, downloadWithAuth } from '@/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { SPRING } from '@/lib/motion'

interface ScopeLevel {
  type: 'institution' | 'department' | 'section'
  id: string
  name: string
  percentage?: number
}

export function TopNavBar() {
  const {
    selectedDate,
    setSelectedDate,
    role,
    theme,
    toggleTheme,
    threshold,
    showToast,
  } = useAppStore()
  const { user, logout } = useAuthContext()

  const prefersReducedMotion = useReducedMotion()
  const [scopeOpen, setScopeOpen] = useState(false)
  const [currentScope, setCurrentScope] = useState<ScopeLevel>({
    type: 'institution',
    id: 'college',
    name: 'All Departments',
  })
  const scopeRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (scopeRef.current && !scopeRef.current.contains(event.target as Node)) {
        setScopeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async () => {
    try {
      const url = getSummaryCsvUrl(selectedDate)
      await downloadWithAuth(url, `summary_${selectedDate}.csv`)
      showToast('CSV exported successfully', 'success')
    } catch (error) {
      showToast('Export failed', 'error')
    }
  }

  // Get department stats for dropdown
  const deptStats = getAllDepartmentStats(selectedDate)
  const collegeStats = getCollegeStats(selectedDate)

  const handleScopeSelect = (scope: ScopeLevel) => {
    setCurrentScope(scope)
    setScopeOpen(false)
  }

  return (
    <nav className="top-nav">
      {/* Logo & Brand */}
      <div className="top-nav-logo">A</div>
      <span className="top-nav-brand">Attendance</span>

      <div className="top-nav-divider" />

      {/* Scope Selector (Breadcrumb Dropdown) */}
      <div className="scope-selector" ref={scopeRef} onClick={() => setScopeOpen(!scopeOpen)} data-open={scopeOpen}>
        <div className="scope-selector-level">
          <span>College</span>
          <ChevronRight className="w-3 h-3 opacity-50" />
        </div>
        <div className="scope-selector-level current">
          <span>{currentScope.name}</span>
        </div>
        <ChevronDown className="w-4 h-4 scope-selector-chevron" />

        {/* Dropdown */}
        <AnimatePresence>
          {scopeOpen && (
            <motion.div
              className="scope-dropdown"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={prefersReducedMotion ? { duration: 0 } : SPRING.snappy}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="scope-dropdown-header">Select Scope</div>
              <div className="scope-dropdown-list">
                {/* Institution level */}
                <div
                  className={cn(
                    'scope-dropdown-item',
                    currentScope.type === 'institution' && 'active'
                  )}
                  onClick={() => handleScopeSelect({
                    type: 'institution',
                    id: 'college',
                    name: 'All Departments',
                    percentage: collegeStats.overallPercentage,
                  })}
                >
                  <span className="scope-dropdown-item-name">All Departments</span>
                  <span className={cn(
                    'scope-dropdown-item-value',
                    collegeStats.overallPercentage >= threshold ? 'pass' : 'fail'
                  )}>
                    {Math.round(collegeStats.overallPercentage)}%
                  </span>
                </div>

                {/* Departments */}
                {departments.map((dept) => {
                  const stats = deptStats.find((s) => s.departmentId === dept.id)
                  const pct = stats?.averagePercentage ?? 0
                  return (
                    <div
                      key={dept.id}
                      className={cn(
                        'scope-dropdown-item',
                        currentScope.type === 'department' && currentScope.id === dept.id && 'active'
                      )}
                      onClick={() => handleScopeSelect({
                        type: 'department',
                        id: dept.id,
                        name: dept.name,
                        percentage: pct,
                      })}
                    >
                      <span className="scope-dropdown-item-name">{dept.name}</span>
                      <span className={cn(
                        'scope-dropdown-item-value',
                        pct >= threshold ? 'pass' : 'fail'
                      )}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="top-nav-spacer" />

      {/* User Info & Role */}
      <div className="user-info">
        <User className="w-3.5 h-3.5 text-muted" />
        <span className="user-name">{user?.name || 'User'}</span>
        <span className="user-role">{role.toUpperCase()}</span>
      </div>

      {/* Date Selector */}
      <Select value={selectedDate} onValueChange={setSelectedDate}>
        <SelectTrigger className="pill-btn w-auto">
          <Calendar className="h-3.5 w-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[var(--z-dropdown)]">
          {workingDays
            .slice()
            .reverse()
            .map((date) => (
              <SelectItem key={date} value={date}>
                {formatDate(date)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Theme Toggle */}
      <button
        className="pill-btn"
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? (
          <Moon className="h-3.5 w-3.5" />
        ) : (
          <Sun className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Export Button */}
      <button className="export-btn" onClick={handleExport}>
        <Download className="h-3.5 w-3.5" />
        Export
      </button>

      {/* Logout Button */}
      <button
        className="pill-btn text-fail hover:bg-fail/10"
        onClick={() => {
          logout()
          window.location.href = '/login'
        }}
        title="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </nav>
  )
}

// KPI Strip component - shows key metrics below nav
export function KPIStrip() {
  const { selectedDate, threshold } = useAppStore()
  const collegeStats = getCollegeStats(selectedDate)

  return (
    <div className="kpi-strip">
      <div className="kpi-strip-item">
        <span className="kpi-strip-label">Overall</span>
        <span className={cn(
          'kpi-strip-value',
          collegeStats.overallPercentage >= threshold ? 'pass' : 'fail'
        )}>
          {collegeStats.overallPercentage.toFixed(1)}%
        </span>
      </div>
      <div className="kpi-strip-item">
        <span className="kpi-strip-label">Below {threshold}%</span>
        <span className={cn(
          'kpi-strip-value',
          collegeStats.classesBelow75Count > 0 ? 'fail' : ''
        )}>
          {collegeStats.classesBelow75Count}
        </span>
      </div>
      <div className="kpi-strip-item">
        <span className="kpi-strip-label">Total Present</span>
        <span className="kpi-strip-value">
          {collegeStats.totalPresent.toLocaleString()}
        </span>
      </div>
      <div className="kpi-strip-item">
        <span className="kpi-strip-label">Classes</span>
        <span className="kpi-strip-value">
          {collegeStats.totalClasses}
        </span>
      </div>
    </div>
  )
}
