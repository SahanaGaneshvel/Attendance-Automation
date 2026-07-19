/**
 * HOD Alerts View - Shows low attendance alerts and sections needing attention
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, TrendingDown, Clock, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { getHodDashboard, type HodDashboardData } from '@/api'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard } from '@/components/ui/ChartCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton, EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

export function HodAlertsView() {
  const { selectedDate, threshold } = useAppStore()
  const { user } = useAuthContext()

  const myDeptName = user?.scope?.department_name ?? 'Department'

  const [dashboardData, setDashboardData] = useState<HodDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    if (!user?.scope?.department_id) return
    setIsLoading(true)
    try {
      const data = await getHodDashboard(selectedDate)
      setDashboardData(data)
    } catch {
      setDashboardData(null)
    } finally {
      setIsLoading(false)
    }
  }, [user?.scope?.department_id, selectedDate])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const sections = dashboardData?.sections ?? []

  // Categorize alerts
  const alerts = useMemo(() => {
    const belowThreshold = sections.filter(
      (s) => s.status === 'recorded' && (s.percentage ?? 0) < threshold
    )
    const criticalLow = sections.filter(
      (s) => s.status === 'recorded' && (s.percentage ?? 0) < 60
    )
    const pending = sections.filter((s) => s.status === 'pending')

    return {
      belowThreshold,
      criticalLow,
      pending,
      totalAlerts: belowThreshold.length + pending.length,
    }
  }, [sections, threshold])

  if (isLoading && !dashboardData) {
    return (
      <div className="page-grid grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        <div style={{ gridColumn: '1 / -1' }}><LoadingState rows={6} /></div>
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-5" variants={staggerContainer} initial="hidden" animate="visible">
      {/* Stats row */}
      <motion.div className="page-grid grid-cols-4" variants={panelVariants}>
        <StatCard
          label="Total Alerts"
          value={alerts.totalAlerts}
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          accent={alerts.totalAlerts > 0 ? 'red' : 'emerald'}
          footnote="Needs attention"
        />
        <StatCard
          label={`Below ${threshold}%`}
          value={alerts.belowThreshold.length}
          icon={<TrendingDown className="w-4.5 h-4.5" />}
          accent={alerts.belowThreshold.length > 0 ? 'amber' : 'emerald'}
          footnote="sections"
        />
        <StatCard
          label="Critical (<60%)"
          value={alerts.criticalLow.length}
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          accent={alerts.criticalLow.length > 0 ? 'red' : 'emerald'}
          footnote="urgent attention"
        />
        <StatCard
          label="Pending Reports"
          value={alerts.pending.length}
          icon={<Clock className="w-4.5 h-4.5" />}
          accent={alerts.pending.length > 0 ? 'amber' : 'emerald'}
          footnote="not submitted"
        />
      </motion.div>

      {/* Alert panels */}
      <div className="page-grid grid-cols-2">
        {/* Critical alerts */}
        <motion.div variants={panelVariants}>
          <SectionCard title="Critical Alerts" subtitle="Sections below 60% attendance">
            {alerts.criticalLow.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="w-5 h-5 text-pass" />}
                title="No critical alerts"
                description="All sections are above 60% attendance."
              />
            ) : (
              <div className="space-y-3">
                {alerts.criticalLow.map((section) => (
                  <motion.div
                    key={section.section_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-fail-bg border border-fail/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-fail/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-fail" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{section.section_name}</p>
                        <p className="text-xs text-muted">{section.strength} students</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono text-fail">
                        {section.percentage?.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted">{section.present}/{section.strength} present</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* Pending submissions */}
        <motion.div variants={panelVariants}>
          <SectionCard title="Pending Submissions" subtitle="Awaiting attendance report">
            {alerts.pending.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="w-5 h-5 text-pass" />}
                title="All submitted"
                description="All class teachers have submitted attendance."
              />
            ) : (
              <div className="space-y-3">
                {alerts.pending.map((section) => (
                  <motion.div
                    key={section.section_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-warn-bg border border-warn/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warn/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-warn" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{section.section_name}</p>
                        <p className="text-xs text-muted">{section.strength} students</p>
                      </div>
                    </div>
                    <StatusBadge tone="warn">Pending</StatusBadge>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>
        </motion.div>
      </div>

      {/* Below threshold sections */}
      <motion.div variants={panelVariants}>
        <SectionCard title={`Below ${threshold}% Threshold`} subtitle={`${myDeptName} - Sections needing improvement`}>
          {alerts.belowThreshold.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="w-5 h-5 text-pass" />}
              title="All sections above threshold"
              description={`Every section is above ${threshold}% attendance. Great job!`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.belowThreshold
                .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))
                .map((section) => (
                  <motion.div
                    key={section.section_id}
                    className={cn(
                      'p-4 rounded-xl border',
                      (section.percentage ?? 0) < 60
                        ? 'bg-fail-bg border-fail/30'
                        : 'bg-warn-bg border-warn/30'
                    )}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-ink">{section.section_name}</h4>
                      <StatusBadge tone={(section.percentage ?? 0) < 60 ? 'fail' : 'warn'}>
                        {(section.percentage ?? 0) < 60 ? 'Critical' : 'Low'}
                      </StatusBadge>
                    </div>
                    <p className={cn(
                      'text-3xl font-bold font-mono mb-1',
                      (section.percentage ?? 0) < 60 ? 'text-fail' : 'text-warn'
                    )}>
                      {section.percentage?.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted">
                      {section.present} present, {section.absent} absent of {section.strength}
                    </p>
                  </motion.div>
                ))}
            </div>
          )}
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
