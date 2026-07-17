import { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useCountUp } from '@/hooks/useCountUp'
import { getHodDashboard, type HodDashboardData } from '@/api'
import { cn } from '@/lib/utils'
import { SPRING, TIMING, staggerContainer, panelVariants } from '@/lib/motion'
import { BulletBars, SmallMultiples } from '../AnimatedWidgets'
import { AlertsPanel } from '../AlertsPanel'

export function HodView() {
  const { selectedDate, threshold } = useAppStore()
  const { user } = useAuthContext()
  const prefersReducedMotion = useReducedMotion()

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<HodDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get department name from auth context
  const myDeptName = user?.scope?.department_name ?? 'Department'

  // Fetch dashboard data
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

  // Loading state
  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  // Extract data for display
  const stats = dashboardData?.stats ?? {
    percentage: 0,
    total_present: 0,
    total_strength: 0,
    recorded_count: 0,
    pending_count: 0,
    no_session_count: 0,
    below_threshold_count: 0,
    my_rank: 0,
    total_departments: 0,
  }

  const sections = dashboardData?.sections ?? []
  const peerComparison = dashboardData?.peer_comparison ?? []

  // Transform sections for table display
  const sectionStats = sections.map((s) => ({
    id: s.section_id,
    name: s.section_name,
    strength: s.strength,
    percentage: s.percentage ?? 0,
    present: s.present ?? 0,
    absent: s.absent ?? 0,
    reported: s.status === 'recorded',
    isNoSession: s.status === 'no_session',
    values: s.trend,
  }))

  // Transform peer comparison for bullet bars
  const peerBars = peerComparison.map((p) => ({
    id: String(p.department_id),
    name: p.department_code,
    value: p.percentage ?? 0,
    rank: p.rank,
    isMe: p.is_mine,
  }))

  const pendingCount = stats.pending_count
  const belowThresholdCount = stats.below_threshold_count
  const totalSections = sections.length
  const reportedCount = stats.recorded_count + stats.no_session_count

  return (
    <motion.div
      className="space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={panelVariants}>
        <h1 className="view-title">{dashboardData?.department_name ?? myDeptName}</h1>
        <p className="view-subtitle">HOD Dashboard · {selectedDate}</p>
      </motion.div>

      {/* Hero Cards */}
      <motion.div className="hero-grid hod" variants={panelVariants}>
        {/* Lead card - Department attendance */}
        <motion.div
          className="hero-card lead"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Department Attendance</div>
          <AnimatedHeroNumber
            value={stats.percentage ?? 0}
            threshold={threshold}
          />
          <div className="hero-meta">
            <AnimatedCount value={stats.total_present} /> / {stats.total_strength} students
          </div>
          <div className="stat-tags">
            <motion.span
              className="stat-tag pass"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING.snappy}
            >
              Rank #{stats.my_rank}
            </motion.span>
            {belowThresholdCount > 0 && (
              <motion.span
                className="stat-tag fail"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...SPRING.snappy, delay: 0.1 }}
              >
                {belowThresholdCount} below {threshold}%
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Sections below threshold */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Below {threshold}%</div>
          <div className={cn('hero-big', belowThresholdCount > 0 ? 'fail' : '')}>
            <AnimatedCount value={belowThresholdCount} />
          </div>
          <div className="hero-meta">of {totalSections} sections</div>
        </motion.div>

        {/* Reporting compliance */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Reporting Status</div>
          <div className={cn('hero-big', pendingCount > 0 ? 'warn' : 'pass')}>
            <AnimatedCount value={reportedCount} />/{totalSections}
          </div>
          <div className="hero-meta">
            {pendingCount === 0 ? 'All reported' : `${pendingCount} pending`}
          </div>
        </motion.div>
      </motion.div>

      {/* Main content grid */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Left column */}
        <motion.div className="flex flex-col gap-4" variants={panelVariants}>
          {/* Sections Table with animations */}
          <div className="panel no-pad">
            <div className="panel-header in-pad">
              <span className="panel-title">My Sections Today</span>
              <span className="panel-subtitle">{totalSections} sections</span>
            </div>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="left">Section</th>
                  <th>Strength</th>
                  <th>Present</th>
                  <th>%</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sectionStats.map((section, index) => (
                  <motion.tr
                    key={section.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: prefersReducedMotion ? 0 : index * TIMING.stagger * 2,
                      ...SPRING.smooth,
                    }}
                  >
                    <td>
                      <div className="matrix-row-name">{section.name}</div>
                    </td>
                    <td className="text-center font-data text-sm">{section.strength}</td>
                    <td className="text-center font-data text-sm">
                      {section.reported ? section.present : '—'}
                    </td>
                    <td>
                      {section.reported ? (
                        <motion.div
                          className={cn(
                            'matrix-cell',
                            section.percentage >= threshold ? 'pass' : 'fail'
                          )}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
                          transition={SPRING.snappy}
                        >
                          {Math.round(section.percentage)}
                        </motion.div>
                      ) : section.isNoSession ? (
                        <div className="matrix-cell none">N/S</div>
                      ) : (
                        <div className="matrix-cell none">—</div>
                      )}
                    </td>
                    <td className="text-center">
                      {section.reported ? (
                        <motion.span
                          className="compliance-status ok"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={SPRING.snappy}
                        >
                          Done
                        </motion.span>
                      ) : section.isNoSession ? (
                        <span className="compliance-status" style={{ color: 'var(--muted)' }}>
                          No Session
                        </span>
                      ) : (
                        <span className="compliance-status pending">Pending</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section Sparklines (Small Multiples) */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Section Trends</span>
              <span className="panel-subtitle">Last 10 days</span>
            </div>
            <SmallMultiples
              data={sectionStats
                .filter((s) => s.values.length > 0)
                .map((s) => ({
                  id: String(s.id),
                  name: s.name,
                  values: s.values,
                }))}
              threshold={threshold}
            />
          </div>
        </motion.div>

        {/* Right column */}
        <motion.div className="flex flex-col gap-4" variants={panelVariants}>
          {/* Alerts */}
          <AlertsPanel />

          {/* Peer Comparison with bullet bars */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Peer Departments</span>
              <span className="panel-subtitle">Today's ranking</span>
            </div>
            <BulletBars data={peerBars} threshold={threshold} />
          </div>

          {/* Department Trend */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Department Trend</span>
              <span className="panel-subtitle">Last 20 days</span>
            </div>
            <div className="mt-3">
              <DeptTrendLine
                data={(dashboardData?.trend ?? [])
                  .filter((t) => t.status === 'recorded' && t.percentage !== null)
                  .map((t) => t.percentage as number)}
                threshold={threshold}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Animated hero number component
function AnimatedHeroNumber({
  value,
  threshold,
}: {
  value: number
  threshold: number
}) {
  const displayValue = useCountUp(value, { duration: 500, decimals: 1 })
  const isPass = value >= threshold

  return (
    <div className={cn('hero-big', isPass ? 'pass' : 'fail')}>
      {displayValue.toFixed(1)}<small>%</small>
    </div>
  )
}

// Animated count
function AnimatedCount({ value }: { value: number }) {
  const displayValue = useCountUp(value, { duration: 500, decimals: 0 })
  return <>{Math.round(displayValue)}</>
}

// Department trend line
function DeptTrendLine({
  data,
  threshold,
}: {
  data: number[]
  threshold: number
}) {
  const prefersReducedMotion = useReducedMotion()

  if (data.length === 0) {
    return <div className="text-muted text-sm text-center py-4">No trend data available</div>
  }

  const width = 300
  const height = 60
  const padding = 4

  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const minVal = Math.min(...data, threshold - 10)
  const maxVal = Math.max(...data, threshold + 10)
  const range = maxVal - minVal || 1

  const points = data.map((value, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding + chartHeight - ((value - minVal) / range) * chartHeight,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const thresholdY = padding + chartHeight - ((threshold - minVal) / range) * chartHeight

  return (
    <svg width={width} height={height} className="overflow-visible">
      <line
        x1={padding}
        y1={thresholdY}
        x2={width - padding}
        y2={thresholdY}
        stroke="var(--line-2)"
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.8,
          ease: 'easeOut',
        }}
      />
      {/* Latest point */}
      {points.length > 0 && (
        <motion.circle
          cx={points[points.length - 1]?.x}
          cy={points[points.length - 1]?.y}
          r={4}
          fill={data[data.length - 1] >= threshold ? 'var(--pass)' : 'var(--fail)'}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: prefersReducedMotion ? 0 : 0.7,
            ...SPRING.snappy,
          }}
        />
      )}
    </svg>
  )
}
