import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useCountUp } from '@/hooks/useCountUp'
import {
  departments,
  getCollegeStats,
  getAllDepartmentStats,
  getChronicOffenders,
  getBiggestSingleDayDrop,
} from '@/data/store'
import { cn } from '@/lib/utils'
import { SPRING, TIMING, staggerContainer, panelVariants } from '@/lib/motion'
import { AnimatedHeatmap } from '../AnimatedHeatmap'
import { AlertsPanel } from '../AlertsPanel'
import { BulletBars, StreakStrip } from '../AnimatedWidgets'

export function DeanView() {
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const collegeStats = getCollegeStats(selectedDate)
  const deptStats = getAllDepartmentStats(selectedDate)

  // Ranked departments for bullet bars
  const rankedDepts = useMemo(() => {
    return [...deptStats]
      .sort((a, b) => b.averagePercentage - a.averagePercentage)
      .map((stat, index) => {
        const dept = departments.find((d) => d.id === stat.departmentId)
        return {
          id: stat.departmentId,
          name: dept?.code ?? stat.departmentId.toUpperCase(),
          value: stat.averagePercentage,
          rank: index + 1,
        }
      })
  }, [deptStats])

  // Chronic offenders
  const chronicOffenders = useMemo(() => getChronicOffenders(3, threshold), [threshold])

  // Biggest drop
  const biggestDrop = useMemo(() => getBiggestSingleDayDrop(selectedDate), [selectedDate])

  // Mock streak data for institution
  const streakData = useMemo(() => {
    const days = []
    const today = new Date(selectedDate)
    for (let i = 19; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      // Simulate some variation
      const pct = 70 + Math.random() * 20
      days.push({ date: dateStr, percentage: pct })
    }
    return days
  }, [selectedDate])

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
        <p className="view-subtitle">All departments · {selectedDate}</p>
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
            value={collegeStats.overallPercentage}
            threshold={threshold}
            isLead
          />
          <div className="hero-meta">
            <AnimatedCount value={collegeStats.totalPresent} /> / {collegeStats.totalStrength} students
          </div>
          {/* Streak strip */}
          <div className="mt-3">
            <StreakStrip data={streakData} threshold={threshold} />
          </div>
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
            collegeStats.classesBelow75Count > 0 ? 'fail' : ''
          )}>
            <AnimatedCount value={collegeStats.classesBelow75Count} />
          </div>
          <div className="hero-meta">
            of {collegeStats.totalClasses} classes
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
            rankedDepts.filter((d) => d.value < threshold).length > 0 ? 'fail' : ''
          )}>
            <AnimatedCount value={rankedDepts.filter((d) => d.value < threshold).length} />
          </div>
          <div className="hero-meta">
            of {departments.length} departments
          </div>
        </motion.div>

        {/* Biggest drop */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Biggest Drop</div>
          {biggestDrop ? (
            <>
              <div className="hero-big fail">
                -<AnimatedCount value={biggestDrop.drop} /><small>%</small>
              </div>
              <div className="hero-meta">
                {biggestDrop.section.name} ({biggestDrop.department.code})
              </div>
            </>
          ) : (
            <>
              <div className="hero-big">—</div>
              <div className="hero-meta">No significant drops</div>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Main content grid */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Left column - Heatmap */}
        <motion.div variants={panelVariants}>
          <AnimatedHeatmap />
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
            {chronicOffenders.length === 0 ? (
              <p className="text-muted text-sm">No chronic offenders</p>
            ) : (
              <div className="space-y-2">
                {chronicOffenders.slice(0, 5).map((offender, index) => (
                  <motion.div
                    key={offender.sectionId}
                    className="flex items-center justify-between py-2 border-t border-line first:border-0"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: prefersReducedMotion ? 0 : index * TIMING.stagger * 2,
                      ...SPRING.smooth,
                    }}
                  >
                    <div>
                      <div className="font-semibold text-sm">{offender.section.name}</div>
                      <div className="text-xs text-muted">{offender.department.code}</div>
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
                      {offender.consecutiveDaysBelow75} days
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
