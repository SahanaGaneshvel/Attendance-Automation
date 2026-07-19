/**
 * Dean Alerts View - School-wide alerts and attention items
 */
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, TrendingDown, Clock, Building2, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { getDeanDashboard, type DeanDashboardData } from '@/api'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard } from '@/components/ui/ChartCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton, EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

export function DeanAlertsView() {
  const { selectedDate, threshold } = useAppStore()

  const [data, setData] = useState<DeanDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      try {
        const result = await getDeanDashboard(selectedDate, threshold)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [selectedDate, threshold])

  const stats = data?.stats
  const chronicOffenders = data?.chronic_offenders ?? []
  const biggestDrop = data?.biggest_drop

  // Alert counts
  const alertCounts = useMemo(() => {
    return {
      total: (stats?.classes_below ?? 0) + (stats?.classes_pending ?? 0) + chronicOffenders.length,
      belowThreshold: stats?.classes_below ?? 0,
      pending: stats?.classes_pending ?? 0,
      chronic: chronicOffenders.length,
    }
  }, [stats, chronicOffenders])

  if (loading) {
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
          value={alertCounts.total}
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          accent={alertCounts.total > 0 ? 'red' : 'emerald'}
          footnote="Action required"
        />
        <StatCard
          label={`Classes Below ${threshold}%`}
          value={alertCounts.belowThreshold}
          icon={<TrendingDown className="w-4.5 h-4.5" />}
          accent={alertCounts.belowThreshold > 0 ? 'amber' : 'emerald'}
          footnote="today"
        />
        <StatCard
          label="Pending Reports"
          value={alertCounts.pending}
          icon={<Clock className="w-4.5 h-4.5" />}
          accent={alertCounts.pending > 0 ? 'amber' : 'emerald'}
          footnote="not submitted"
        />
        <StatCard
          label="Chronic Offenders"
          value={alertCounts.chronic}
          icon={<Building2 className="w-4.5 h-4.5" />}
          accent={alertCounts.chronic > 0 ? 'red' : 'emerald'}
          footnote="3+ consecutive days"
        />
      </motion.div>

      {/* Biggest drop alert */}
      {biggestDrop && (
        <motion.div variants={panelVariants}>
          <SectionCard title="Biggest Drop Alert" subtitle="Largest single-day attendance drop">
            <div className="flex items-center justify-between p-4 rounded-xl bg-fail-bg border border-fail/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-fail/20 flex items-center justify-center">
                  <TrendingDown className="w-7 h-7 text-fail" />
                </div>
                <div>
                  <h4 className="font-semibold text-ink text-lg">{biggestDrop.section_name}</h4>
                  <p className="text-sm text-muted">{biggestDrop.department_name} ({biggestDrop.department_code})</p>
                  <p className="text-xs text-muted mt-1">Year {biggestDrop.year}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold font-mono text-fail">-{biggestDrop.drop.toFixed(1)}%</p>
                <p className="text-sm text-muted">
                  {biggestDrop.previous_percentage.toFixed(1)}% → {biggestDrop.current_percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-muted">vs {biggestDrop.previous_date}</p>
              </div>
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* Chronic offenders */}
      <motion.div variants={panelVariants}>
        <SectionCard title={`Chronic Below ${threshold}%`} subtitle="Sections below threshold for 3+ consecutive days">
          {chronicOffenders.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="w-5 h-5 text-pass" />}
              title="No chronic offenders"
              description="All sections are recovering within acceptable timeframes."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chronicOffenders.map((offender) => (
                <motion.div
                  key={offender.section_id}
                  className={cn(
                    'p-4 rounded-xl border',
                    offender.consecutive_days >= 5
                      ? 'bg-fail-bg border-fail/40'
                      : 'bg-warn-bg border-warn/40'
                  )}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-ink">{offender.section_name}</h4>
                      <p className="text-xs text-muted">{offender.department_name}</p>
                    </div>
                    <StatusBadge tone={offender.consecutive_days >= 5 ? 'fail' : 'warn'}>
                      {offender.consecutive_days} days
                    </StatusBadge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted">Current Attendance</p>
                      <p className={cn(
                        'text-2xl font-bold font-mono',
                        offender.current_percentage < 60 ? 'text-fail' : 'text-warn'
                      )}>
                        {offender.current_percentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Year / Semester</p>
                      <p className="text-sm font-semibold text-ink">
                        Year {offender.year} / Sem {offender.semester}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Department alerts summary */}
      <motion.div variants={panelVariants}>
        <SectionCard title="Departments Needing Attention" subtitle="Departments with classes below threshold">
          {(stats?.departments_below_threshold ?? 0) === 0 ? (
            <EmptyState
              icon={<CheckCircle className="w-5 h-5 text-pass" />}
              title="All departments on track"
              description={`Every department is maintaining above ${threshold}% average attendance.`}
            />
          ) : (
            <div className="space-y-3">
              {data?.department_rankings
                .filter((d) => (d.percentage ?? 0) < threshold)
                .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0))
                .map((dept) => (
                  <motion.div
                    key={dept.department_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-warn-bg border border-warn/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warn/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-warn" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{dept.department_name}</p>
                        <p className="text-xs text-muted">{dept.department_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold font-mono text-warn">
                        {dept.percentage?.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted">
                        {dept.total_present}/{dept.total_strength} present
                      </p>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
