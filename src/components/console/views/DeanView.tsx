import { useMemo, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useCountUp } from '@/hooks/useCountUp'
import { getDeanDashboard, ApiError } from '@/api'
import type { DeanDashboardData } from '@/api'
import { cn } from '@/lib/utils'
import { SPRING, TIMING, staggerContainer, panelVariants } from '@/lib/motion'
import { AnimatedHeatmap } from '../AnimatedHeatmap'
import { AlertsPanel } from '../AlertsPanel'
import { BulletBars, StreakStrip } from '../AnimatedWidgets'

export function DeanView() {
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const [data, setData] = useState<DeanDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard data
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const result = await getDeanDashboard(selectedDate, threshold)
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.message)
          } else {
            setError('Failed to load dashboard data')
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [selectedDate, threshold])

  // Ranked departments for bullet bars
  const rankedDepts = useMemo(() => {
    if (!data) return []
    return data.department_rankings.map((dept) => ({
      id: String(dept.department_id),
      name: dept.department_code,
      value: dept.percentage ?? 0,
      rank: dept.rank,
    }))
  }, [data])

  // Streak data from trend
  const streakData = useMemo(() => {
    if (!data) return []
    return data.trend.map((t) => ({
      date: t.date,
      percentage: t.percentage ?? 0,
    }))
  }, [data])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted">Loading dashboard...</div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fail">{error || 'No data available'}</div>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={panelVariants}>
        <h1 className="view-title">Institution Overview</h1>
        <p className="view-subtitle">{data.school_name} - {selectedDate}</p>
      </motion.div>

      {/* Hero Cards with animated numbers */}
      <motion.div className="hero-grid dean" variants={panelVariants}>
        {/* Lead card - Overall attendance */}
        <motion.div
          className="hero-card lead"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Overall Attendance</div>
          <AnimatedHeroNumber
            value={data.stats.percentage ?? 0}
            threshold={threshold}
            isLead
          />
          <div className="hero-meta">
            <AnimatedCount value={data.stats.total_present} /> / {data.stats.total_strength} students
          </div>
          {/* Streak strip */}
          {streakData.length > 0 && (
            <div className="mt-3">
              <StreakStrip data={streakData} threshold={threshold} />
            </div>
          )}
        </motion.div>

        {/* Below threshold */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Below {threshold}%</div>
          <div className={cn(
            'hero-big',
            data.stats.classes_below > 0 ? 'fail' : ''
          )}>
            <AnimatedCount value={data.stats.classes_below} />
          </div>
          <div className="hero-meta">
            of {data.stats.total_classes} classes
          </div>
        </motion.div>

        {/* Departments below */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Depts Below {threshold}%</div>
          <div className={cn(
            'hero-big',
            data.stats.departments_below_threshold > 0 ? 'fail' : ''
          )}>
            <AnimatedCount value={data.stats.departments_below_threshold} />
          </div>
          <div className="hero-meta">
            of {data.stats.total_departments} departments
          </div>
        </motion.div>

        {/* Biggest drop */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Biggest Drop</div>
          {data.biggest_drop ? (
            <>
              <div className="hero-big fail">
                -<AnimatedCount value={data.biggest_drop.drop} /><small>%</small>
              </div>
              <div className="hero-meta">
                {data.biggest_drop.section_name} ({data.biggest_drop.department_code})
              </div>
            </>
          ) : (
            <>
              <div className="hero-big">-</div>
              <div className="hero-meta">No significant drops</div>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Main content grid */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Left column - Heatmap */}
        <motion.div variants={panelVariants}>
          <AnimatedHeatmap apiData={data.heatmap} />
        </motion.div>

        {/* Right column - Sidebar */}
        <motion.div className="flex flex-col gap-4" variants={panelVariants}>
          {/* Alerts Panel */}
          <AlertsPanel />

          {/* Department Rankings with animated bullet bars */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Department Rankings</span>
            </div>
            <BulletBars data={rankedDepts} threshold={threshold} />
          </div>

          {/* Chronic Offenders */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Chronic Below {threshold}%</span>
              <span className="panel-subtitle">3+ days</span>
            </div>
            {data.chronic_offenders.length === 0 ? (
              <p className="text-muted text-sm">No chronic offenders</p>
            ) : (
              <div className="space-y-2">
                {data.chronic_offenders.slice(0, 5).map((offender, index) => (
                  <motion.div
                    key={offender.section_id}
                    className="flex items-center justify-between py-2 border-t border-line first:border-0"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: prefersReducedMotion ? 0 : index * TIMING.stagger * 2,
                      ...SPRING.smooth,
                    }}
                  >
                    <div>
                      <div className="font-semibold text-sm">{offender.section_name}</div>
                      <div className="text-xs text-muted">{offender.department_code}</div>
                    </div>
                    <motion.div
                      className="stat-tag fail"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: prefersReducedMotion ? 0 : index * TIMING.stagger * 2 + 0.1,
                        ...SPRING.snappy,
                      }}
                    >
                      {offender.consecutive_days} days
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            )}
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
  isLead?: boolean
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
