import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, AlertCircle, CheckCircle, X, Flag, Bell } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  sections,
  getDailyClassAttendance,
  getBiggestSingleDayDrop,
  getChronicOffenders,
  getDepartmentById,
} from '@/data/store'
import { cn } from '@/lib/utils'
import { SPRING, TIMING, alertVariants } from '@/lib/motion'

type AlertSeverity = 'critical' | 'warn' | 'info'

interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  timestamp: string
  actionable: boolean
  sectionId?: string
  deptId?: string
}

// Generate alerts based on current data
function generateAlerts(date: string, threshold: number): Alert[] {
  const alerts: Alert[] = []
  const now = new Date()
  const formatTime = (minAgo: number) => {
    const d = new Date(now.getTime() - minAgo * 60000)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Check for unreported classes (after 9 AM)
  sections.forEach((section) => {
    const attendance = getDailyClassAttendance(section.id, date)
    const dept = getDepartmentById(section.departmentId)

    // Mock: some sections are "not reported"
    if (!attendance && Math.random() > 0.7) {
      alerts.push({
        id: `unreported-${section.id}`,
        severity: 'critical',
        title: `${dept?.code ?? 'DEPT'} · ${section.name}`,
        description: 'First hour not reported, deadline passed 25 min ago',
        timestamp: formatTime(25),
        actionable: true,
        sectionId: section.id,
        deptId: section.departmentId,
      })
    }
  })

  // Check for big drops
  const biggestDrop = getBiggestSingleDayDrop(date)
  if (biggestDrop && biggestDrop.drop > 10) {
    alerts.push({
      id: 'biggest-drop',
      severity: 'warn',
      title: `${biggestDrop.department.code} · ${biggestDrop.section.name}`,
      description: `${Math.round(biggestDrop.drop)}% single-day drop vs yesterday`,
      timestamp: formatTime(5),
      actionable: true,
      sectionId: biggestDrop.section.id,
      deptId: biggestDrop.department.id,
    })
  }

  // Chronic offenders
  const offenders = getChronicOffenders(3, threshold)
  offenders.slice(0, 2).forEach((offender) => {
    alerts.push({
      id: `chronic-${offender.sectionId}`,
      severity: 'warn',
      title: `${offender.department.code} · ${offender.section.name}`,
      description: `Below ${threshold}% for ${offender.consecutiveDaysBelow75} consecutive days`,
      timestamp: formatTime(10),
      actionable: true,
      sectionId: offender.sectionId,
      deptId: offender.department.id,
    })
  })

  // System info
  alerts.push({
    id: 'sync-status',
    severity: 'info',
    title: 'Gateway Sync',
    description: 'All systems operational, last sync 2 min ago',
    timestamp: formatTime(2),
    actionable: false,
  })

  // Sort by severity
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warn: 1, info: 2 }
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: {
    icon: AlertTriangle,
    color: 'text-fail',
    bg: 'bg-fail-bg',
  },
  warn: {
    icon: AlertCircle,
    color: 'text-warn',
    bg: 'bg-warn-bg',
  },
  info: {
    icon: CheckCircle,
    color: 'text-accent',
    bg: 'bg-accent-soft',
  },
}

export function AlertsPanel() {
  const { selectedDate, threshold, role, showToast } = useAppStore()
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

  const handleAction = useCallback((alert: Alert, action: 'notify' | 'flag') => {
    const actionText = action === 'notify' ? 'Notification sent to HOD' : 'Flagged for review'
    showToast(actionText, 'success')
    handleDismiss(alert.id)
  }, [showToast, handleDismiss])

  // Only show to Dean and HOD
  if (role !== 'dean' && role !== 'hod') {
    return null
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted" />
          <span className="panel-title">System Alerts</span>
        </div>
        <span className="panel-subtitle">
          {alerts.filter((a) => a.severity === 'critical').length} critical
        </span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence initial={false}>
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-muted text-sm"
            >
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              All clear — no alerts
            </motion.div>
          ) : (
            alerts.map((alert, index) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                index={index}
                onDismiss={() => handleDismiss(alert.id)}
                onAction={handleAction}
                canAction={role === 'dean' || role === 'hod'}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))
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
  onAction,
  canAction,
  prefersReducedMotion,
}: {
  alert: Alert
  index: number
  onDismiss: () => void
  onAction: (alert: Alert, action: 'notify' | 'flag') => void
  canAction: boolean
  prefersReducedMotion: boolean
}) {
  const config = severityConfig[alert.severity]
  // Icon is available via config.icon if needed for future use

  return (
    <motion.div
      layout
      variants={alertVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              ...SPRING.smooth,
              delay: index * TIMING.stagger,
            }
      }
      className={cn(
        'relative rounded-lg border p-3',
        config.bg,
        'border-line'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Severity dot with pulse */}
        <div className="relative flex-shrink-0 mt-0.5">
          <motion.div
            className={cn(
              'w-2 h-2 rounded-full',
              alert.severity === 'critical' && 'bg-fail',
              alert.severity === 'warn' && 'bg-warn',
              alert.severity === 'info' && 'bg-accent'
            )}
            animate={
              alert.severity === 'critical' && !prefersReducedMotion
                ? {
                    scale: [1, 1.5, 1],
                    opacity: [1, 0.5, 1],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-ink truncate">
              {alert.title}
            </span>
            <span className="text-xs text-faint">{alert.timestamp}</span>
          </div>
          <p className="text-xs text-muted">{alert.description}</p>

          {/* Action buttons */}
          {alert.actionable && canAction && (
            <div className="flex gap-2 mt-2">
              <motion.button
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-ink"
                onClick={() => onAction(alert, 'notify')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Bell className="w-3 h-3" />
                Notify HOD
              </motion.button>
              <motion.button
                className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
                onClick={() => onAction(alert, 'flag')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Flag className="w-3 h-3" />
                Flag
              </motion.button>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <motion.button
          className="flex-shrink-0 p-1 rounded hover:bg-line text-muted hover:text-ink"
          onClick={onDismiss}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  )
}

// Inline action for table rows
export function InlineAction({
  percentage,
  threshold,
}: {
  sectionId: string
  percentage: number
  threshold: number
}) {
  const { showToast, role } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  if (percentage >= threshold || (role !== 'dean' && role !== 'hod')) {
    return null
  }

  return (
    <motion.button
      className="inline-flex items-center gap-1 text-xs font-medium text-fail hover:text-fail-ink bg-fail-bg px-2 py-1 rounded"
      onClick={(e) => {
        e.stopPropagation()
        showToast('Flagged for review', 'success')
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={prefersReducedMotion ? { duration: 0 } : SPRING.snappy}
    >
      <Flag className="w-3 h-3" />
      Flag
    </motion.button>
  )
}
