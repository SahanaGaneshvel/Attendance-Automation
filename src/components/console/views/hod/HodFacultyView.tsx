/**
 * HOD Faculty Performance View - Shows class teacher performance metrics
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import { GraduationCap, Award, Clock, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { getHodDashboard, type HodDashboardData } from '@/api'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard } from '@/components/ui/ChartCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton, EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

export function HodFacultyView() {
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
  const stats = dashboardData?.stats

  // Faculty performance metrics (derived from section data)
  const facultyMetrics = useMemo(() => {
    const recorded = sections.filter((s) => s.status === 'recorded')
    const pending = sections.filter((s) => s.status === 'pending')
    const onTime = recorded.length // In a real system, this would check submission time

    return {
      totalFaculty: sections.length, // Each section has a class teacher
      reportedOnTime: onTime,
      pending: pending.length,
      avgAttendance: stats?.percentage ?? 0,
    }
  }, [sections, stats])

  // Sort sections by status (pending first, then by percentage)
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return (b.percentage ?? 0) - (a.percentage ?? 0)
    })
  }, [sections])

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
          label="Class Teachers"
          value={facultyMetrics.totalFaculty}
          icon={<GraduationCap className="w-4.5 h-4.5" />}
          accent="indigo"
          footnote={myDeptName}
        />
        <StatCard
          label="Reported Today"
          value={facultyMetrics.reportedOnTime}
          icon={<CheckCircle className="w-4.5 h-4.5" />}
          accent="emerald"
          footnote={`of ${facultyMetrics.totalFaculty} sections`}
        />
        <StatCard
          label="Pending"
          value={facultyMetrics.pending}
          icon={<Clock className="w-4.5 h-4.5" />}
          accent={facultyMetrics.pending > 0 ? 'amber' : 'emerald'}
          footnote="awaiting submission"
        />
        <StatCard
          label="Dept Average"
          value={`${facultyMetrics.avgAttendance.toFixed(1)}%`}
          icon={<Award className="w-4.5 h-4.5" />}
          accent={facultyMetrics.avgAttendance >= threshold ? 'emerald' : 'red'}
          footnote="attendance"
        />
      </motion.div>

      {/* Faculty cards grid */}
      <motion.div variants={panelVariants}>
        <SectionCard title="Class Teacher Status" subtitle={`${myDeptName} - Today's reporting status`}>
          {sortedSections.length === 0 ? (
            <EmptyState title="No sections found" description="No class data available for this department." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedSections.map((section) => (
                <motion.div
                  key={section.section_id}
                  className={cn(
                    'p-4 rounded-xl border',
                    section.status === 'pending'
                      ? 'bg-warn-bg border-warn/30'
                      : section.status === 'no_session'
                      ? 'bg-surface-2 border-line'
                      : (section.percentage ?? 0) >= threshold
                      ? 'bg-pass-bg border-pass/30'
                      : 'bg-fail-bg border-fail/30'
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-ink">{section.section_name}</h4>
                      <p className="text-xs text-muted">{section.strength} students</p>
                    </div>
                    <StatusBadge
                      tone={
                        section.status === 'pending'
                          ? 'warn'
                          : section.status === 'no_session'
                          ? 'neutral'
                          : (section.percentage ?? 0) >= threshold
                          ? 'pass'
                          : 'fail'
                      }
                    >
                      {section.status === 'pending'
                        ? 'Pending'
                        : section.status === 'no_session'
                        ? 'No Session'
                        : 'Reported'}
                    </StatusBadge>
                  </div>

                  {section.status === 'recorded' && (
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted">Attendance</p>
                        <p className={cn(
                          'text-2xl font-bold font-mono',
                          (section.percentage ?? 0) >= threshold ? 'text-pass' : 'text-fail'
                        )}>
                          {section.percentage?.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted">Present / Absent</p>
                        <p className="text-sm font-semibold text-ink">
                          {section.present} / {section.absent}
                        </p>
                      </div>
                    </div>
                  )}

                  {section.status === 'pending' && (
                    <div className="flex items-center gap-2 text-warn">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Awaiting submission</span>
                    </div>
                  )}

                  {section.status === 'no_session' && (
                    <p className="text-sm text-muted">No class scheduled for today</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
