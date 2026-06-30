import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useCountUp } from '@/hooks/useCountUp'
import {
  getDepartmentById,
  getSectionsByDepartment,
  getDailyClassAttendance,
  getDepartmentDailyStats,
  getAllDepartmentStats,
} from '@/data/store'
import { cn } from '@/lib/utils'
import { SPRING, TIMING, staggerContainer, panelVariants } from '@/lib/motion'
import { BulletBars, Slopegraph, SmallMultiples } from '../AnimatedWidgets'
import { AlertsPanel } from '../AlertsPanel'

export function HodView() {
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  // Mock HOD's department (in real app, comes from auth)
  const myDeptId = 'cse'
  const myDept = getDepartmentById(myDeptId)
  const mySections = getSectionsByDepartment(myDeptId)
  const myStats = getDepartmentDailyStats(myDeptId, selectedDate)


  // Peer comparison for bullet bars
  const peerComparison = useMemo(() => {
    const allStats = getAllDepartmentStats(selectedDate)
    return [...allStats]
      .sort((a, b) => b.averagePercentage - a.averagePercentage)
      .map((stat, index) => ({
        id: stat.departmentId,
        name: getDepartmentById(stat.departmentId)?.code ?? stat.departmentId.toUpperCase(),
        value: stat.averagePercentage,
        rank: index + 1,
        isMe: stat.departmentId === myDeptId,
      }))
  }, [selectedDate])

  // Sections with stats for small multiples
  const sectionStats = useMemo(() => {
    return mySections.map((section) => {
      const attendance = getDailyClassAttendance(section.id, selectedDate)
      // Get last 10 days for sparkline
      const trend = Array.from({ length: 10 }, (_, i) => {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() - (9 - i))
        const dateStr = d.toISOString().split('T')[0]
        const att = getDailyClassAttendance(section.id, dateStr)
        return att?.percentage ?? 75 + Math.random() * 15 // Mock some variation
      })

      return {
        id: section.id,
        name: section.name,
        advisor: section.advisor,
        strength: section.strength,
        percentage: attendance?.percentage ?? 0,
        present: attendance?.present ?? 0,
        absent: attendance?.absent ?? 0,
        reported: attendance !== null,
        reportedAt: attendance ? '08:45' : null,
        values: trend,
      }
    })
  }, [mySections, selectedDate])

  // Slopegraph data (week-over-week)
  const slopegraphData = useMemo(() => {
    return mySections.slice(0, 6).map((section) => ({
      id: section.id,
      name: section.name.replace('Section ', ''),
      before: 70 + Math.random() * 20, // Mock last week
      after: sectionStats.find((s) => s.id === section.id)?.percentage ?? 75,
    }))
  }, [mySections, sectionStats])

  const pendingCount = sectionStats.filter((s) => !s.reported).length
  const belowThresholdCount = sectionStats.filter(
    (s) => s.percentage < threshold && s.reported
  ).length

  const myRank = peerComparison.find((d) => d.isMe)?.rank ?? 0

  return (
    <motion.div
      className="space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={panelVariants}>
        <h1 className="view-title">{myDept?.name ?? 'Department'}</h1>
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
            value={myStats?.averagePercentage ?? 0}
            threshold={threshold}
          />
          <div className="hero-meta">
            <AnimatedCount value={myStats?.totalPresent ?? 0} /> / {myStats?.totalStrength ?? 0} students
          </div>
          <div className="stat-tags">
            <motion.span
              className="stat-tag pass"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={SPRING.snappy}
            >
              Rank #{myRank}
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
          <div className="hero-meta">of {mySections.length} sections</div>
        </motion.div>

        {/* Reporting compliance */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Reporting Status</div>
          <div className={cn('hero-big', pendingCount > 0 ? 'warn' : 'pass')}>
            <AnimatedCount value={sectionStats.length - pendingCount} />/{sectionStats.length}
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
              <span className="panel-subtitle">{sectionStats.length} sections</span>
            </div>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="left">Section</th>
                  <th>Advisor</th>
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
                    <td className="text-center text-sm text-muted">{section.advisor}</td>
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
                          {section.reportedAt}
                        </motion.span>
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
              data={sectionStats.map((s) => ({
                id: s.id,
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
            <BulletBars data={peerComparison} threshold={threshold} />
          </div>

          {/* Week-over-week Slopegraph */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Week Comparison</span>
              <span className="panel-subtitle">Section movement</span>
            </div>
            <Slopegraph
              data={slopegraphData}
              beforeLabel="Last Week"
              afterLabel="This Week"
              threshold={threshold}
            />
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
