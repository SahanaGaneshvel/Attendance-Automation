import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, X, Bell } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  sections,
  getDailyClassAttendance,
  getBiggestSingleDayDrop,
  getChronicOffenders,
} from '@/data/store'
import { cn } from '@/lib/utils'
import { SPRING, TIMING } from '@/lib/motion'

type AlertSeverity = 'critical' | 'warn' | 'info'

interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  timestamp: string
}

// Generate alerts based on current data
function generateAlerts(date: string, threshold: number): Alert[] {
  const alerts: Alert[] = []
  const now = new Date()
  const formatTime = (minAgo: number) => {
    const d = new Date(now.getTime() - minAgo * 60000)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Check for unreported classes (simplified)
  let unreportedCount = 0
  sections.forEach((section) => {
    const attendance = getDailyClassAttendance(section.id, date)
    if (!attendance && Math.random() > 0.85) {
      unreportedCount++
    }
  })

  if (unreportedCount > 0) {
    alerts.push({
      id: 'unreported',
      severity: 'critical',
      title: `${unreportedCount} Unreported`,
      description: 'Classes past deadline',
      timestamp: formatTime(25),
    })
  }

  // Check for big drops
  const biggestDrop = getBiggestSingleDayDrop(date)
  if (biggestDrop && biggestDrop.drop > 10) {
    alerts.push({
      id: 'biggest-drop',
      severity: 'warn',
      title: `${biggestDrop.department.code} Drop`,
      description: `${Math.round(biggestDrop.drop)}% vs yesterday`,
      timestamp: formatTime(5),
    })
  }

  // Chronic offenders
  const offenders = getChronicOffenders(3, threshold)
  if (offenders.length > 0) {
    alerts.push({
      id: 'chronic',
      severity: 'warn',
      title: `${offenders.length} Chronic`,
      description: `Below ${threshold}% for 3+ days`,
      timestamp: formatTime(10),
    })
  }

  // Sort by severity
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warn: 1, info: 2 }
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

const severityConfig: Record<AlertSeverity, { color: string; bg: string }> = {
  critical: {
    color: 'bg-fail',
    bg: 'bg-fail-bg',
  },
  warn: {
    color: 'bg-warn',
    bg: 'bg-warn-bg',
  },
  info: {
    color: 'bg-accent',
    bg: 'bg-accent-soft',
  },
}

export function AlertsPanel() {
  const { selectedDate, threshold, role } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const alerts = useMemo(() => {
    return generateAlerts(selectedDate, threshold).filter(
      (alert) => !dismissedIds.has(alert.id)
    )
  }, [selectedDate, threshold, dismissedIds])

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))
  }, [])

  // Only show to Dean and HOD
  if (role !== 'dean' && role !== 'hod') {
    return null
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length

  return (
    <div className="panel alerts">
      <div className="panel-header" style={{ marginBottom: '8px' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted" />
          <span className="panel-title">Alerts</span>
        </div>
        {criticalCount > 0 && (
          <span className="stat-tag fail">{criticalCount} critical</span>
        )}
      </div>

      <div className="panel-body">
        <AnimatePresence initial={false}>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4 text-muted text-xs"
            >
              <CheckCircle className="w-5 h-5 mx-auto mb-1.5 opacity-50" />
              All clear
            </motion.div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  index={index}
                  onDismiss={() => handleDismiss(alert.id)}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function AlertItem({
  alert,
  index,
  onDismiss,
  prefersReducedMotion,
}: {
  alert: Alert
  index: number
  onDismiss: () => void
  prefersReducedMotion: boolean
}) {
  const config = severityConfig[alert.severity]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              ...SPRING.snappy,
              delay: index * TIMING.stagger,
            }
      }
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border border-line',
        config.bg
      )}
    >
      {/* Severity dot */}
      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.color)} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-ink truncate">
            {alert.title}
          </span>
          <span className="text-[10px] text-faint">{alert.timestamp}</span>
        </div>
        <p className="text-[10px] text-muted truncate">{alert.description}</p>
      </div>

      {/* Dismiss */}
      <button
        className="flex-shrink-0 p-0.5 rounded hover:bg-line text-muted hover:text-ink"
        onClick={onDismiss}
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  )
}
