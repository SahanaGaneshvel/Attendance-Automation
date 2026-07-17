import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useCountUp } from '@/hooks/useCountUp'
import {
  submitAttendance,
  getTeacherDashboard,
  ApiError,
  type TeacherDashboardData,
} from '@/api'
import { cn } from '@/lib/utils'
import { SPRING, TIMING, staggerContainer, panelVariants, chipVariants } from '@/lib/motion'
import { AnimatedRing, BulletBars, StreakStrip } from '../AnimatedWidgets'

export function TeacherView() {
  const { selectedDate, threshold, showToast } = useAppStore()
  const { user } = useAuthContext()
  const prefersReducedMotion = useReducedMotion()

  // Get teacher's assigned section from auth context
  const mySectionId = user?.scope?.section_id ?? null
  const mySectionName = user?.scope?.section_name ?? 'My Class'

  // Entry state
  const [absentRolls, setAbsentRolls] = useState<number[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Dashboard data from API
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null)

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!mySectionId) return
    setIsLoading(true)
    try {
      const data = await getTeacherDashboard(selectedDate)
      setDashboardData(data)
      // Reset absentRolls if already submitted
      if (data.today.status === 'recorded' || data.today.status === 'no_session') {
        setAbsentRolls([])
      }
    } catch {
      // Error fetching - show error state
      setDashboardData(null)
    } finally {
      setIsLoading(false)
    }
  }, [mySectionId, selectedDate])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Calculate values based on current state
  const strength = dashboardData?.strength ?? 60
  const submitted = dashboardData?.today.status === 'recorded' || dashboardData?.today.status === 'no_session'
  const isNoSession = dashboardData?.today.status === 'no_session'

  const present = submitted
    ? (dashboardData?.today.present ?? strength)
    : strength - absentRolls.length

  const percentage = submitted
    ? (dashboardData?.today.percentage ?? 100)
    : ((strength - absentRolls.length) / strength) * 100

  // Benchmark comparison data for bullet bars
  const benchmarks = [
    { id: 'you', name: 'Your Class', value: percentage, isMe: true },
    { id: 'dept', name: 'Dept Avg', value: dashboardData?.department_avg ?? 0 },
    { id: 'threshold', name: 'Threshold', value: threshold },
  ]

  // Trend data for charts - filter to only recorded days with valid percentages
  const trendData = (dashboardData?.trend ?? [])
    .filter(t => t.status === 'recorded' && t.percentage !== null)
    .map(t => ({
      date: t.date,
      percentage: t.percentage as number,
    }))

  // Quick stats from API
  const quickStats = dashboardData?.quick_stats ?? {
    best: 0,
    worst: 0,
    days_below_75: 0,
    average: 0,
    recorded_days: 0,
  }

  const handleAddRoll = () => {
    const roll = parseInt(inputValue.trim(), 10)
    if (!isNaN(roll) && roll >= 1 && roll <= strength && !absentRolls.includes(roll)) {
      setAbsentRolls([...absentRolls, roll].sort((a, b) => a - b))
      setInputValue('')
    }
  }

  const handleRemoveRoll = (roll: number) => {
    setAbsentRolls(absentRolls.filter((r) => r !== roll))
  }

  const handleSubmit = async () => {
    if (!mySectionId) {
      showToast('No section assigned', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await submitAttendance({
        section_id: mySectionId,
        date: selectedDate,
        status: 'recorded',
        absent_count: absentRolls.length,
      })
      showToast(`Attendance submitted: ${response.percentage?.toFixed(1)}%`, 'success')
      setAbsentRolls([])
      // Refresh dashboard data
      await fetchDashboard()
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to submit attendance'
      showToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNoSession = async () => {
    if (!mySectionId) {
      showToast('No section assigned', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      await submitAttendance({
        section_id: mySectionId,
        date: selectedDate,
        status: 'no_session',
        no_session_reason: 'No class scheduled',
      })
      showToast('Marked as no session', 'info')
      // Refresh dashboard data
      await fetchDashboard()
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to mark no session'
      showToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddRoll()
    }
  }

  // Show loading state
  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted">Loading...</div>
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
        <h1 className="view-title">{mySectionName}</h1>
        <p className="view-subtitle">Teacher Dashboard · {selectedDate}</p>
      </motion.div>

      {/* Hero Cards */}
      <motion.div className="hero-grid teacher" variants={panelVariants}>
        {/* Lead card with animated ring */}
        <motion.div
          className="hero-card lead"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Class Attendance</div>
          <div className="ring-wrap">
            <AnimatedRing
              percentage={percentage}
              threshold={threshold}
              size={140}
              label="Today"
            />
            <div className="ring-meta">
              <div className="rm-big">
                <AnimatedCount value={present} /> / {strength}
              </div>
              <div className="rm-label">Present today</div>
              {submitted && (
                <motion.div
                  className={cn('stat-tag mt-2', isNoSession ? '' : 'pass')}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={SPRING.snappy}
                >
                  {isNoSession ? 'No Session' : 'Submitted'}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Term Average */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Term Average</div>
          <div className={cn('hero-big', quickStats.average >= threshold ? 'pass' : 'fail')}>
            <AnimatedDecimal value={quickStats.average} /><small>%</small>
          </div>
          <div className="hero-meta">Last {trendData.length} days</div>
        </motion.div>

        {/* Absent count */}
        <motion.div
          className="hero-card"
          whileHover={prefersReducedMotion ? {} : { y: -2, boxShadow: 'var(--panel-shadow-lg)' }}
          transition={{ duration: TIMING.fast }}
        >
          <div className="hero-card-label">Absent Today</div>
          <div
            className={cn(
              'hero-big',
              strength - present > strength * 0.25 ? 'fail' : ''
            )}
          >
            <AnimatedCount value={strength - present} />
          </div>
          <div className="hero-meta">students</div>
        </motion.div>
      </motion.div>

      {/* Main content grid */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Entry Panel - Action first! */}
        <motion.div className="entry-panel flex flex-col" variants={panelVariants}>
          <h3>Mark Absentees</h3>
          <p className="entry-subtitle">
            Enter roll numbers of absent students · {mySectionName} ({strength} students)
          </p>

          {/* Animated chips container */}
          <div className="chips-container">
            <AnimatePresence mode="popLayout">
              {absentRolls.length === 0 ? (
                <motion.span
                  key="empty"
                  className="text-faint text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  No absentees marked yet
                </motion.span>
              ) : (
                absentRolls.map((roll) => (
                  <motion.div
                    key={roll}
                    className="absent-chip"
                    variants={chipVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    layout
                  >
                    {roll}
                    <motion.button
                      onClick={() => handleRemoveRoll(roll)}
                      title="Remove"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      ×
                    </motion.button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Input row */}
          <div className="entry-input-row">
            <input
              type="text"
              className="entry-input"
              placeholder="Enter roll number..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={submitted || isSubmitting}
            />
            <motion.button
              className="entry-btn"
              onClick={handleAddRoll}
              disabled={submitted || isSubmitting || !inputValue.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Add
            </motion.button>
          </div>

          {/* Action buttons */}
          <div className="entry-actions">
            <motion.button
              className="entry-btn"
              onClick={handleSubmit}
              disabled={submitted || isSubmitting}
              whileHover={submitted || isSubmitting ? {} : { scale: 1.02 }}
              whileTap={submitted || isSubmitting ? {} : { scale: 0.98 }}
            >
              {isSubmitting ? 'Submitting...' : submitted ? (isNoSession ? 'No Session' : 'Submitted') : 'Submit Attendance'}
            </motion.button>
            <motion.button
              className="entry-btn ghost"
              onClick={handleNoSession}
              disabled={submitted || isSubmitting}
              whileHover={submitted || isSubmitting ? {} : { scale: 1.02 }}
              whileTap={submitted || isSubmitting ? {} : { scale: 0.98 }}
            >
              No Session Today
            </motion.button>
          </div>
        </motion.div>

        {/* Right column */}
        <motion.div className="flex flex-col gap-4" variants={panelVariants}>
          {/* Benchmark Comparison with bullet bars */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Benchmark</span>
              <span className="panel-subtitle">vs department & threshold</span>
            </div>
            <BulletBars data={benchmarks} threshold={threshold} />
          </div>

          {/* 20-Day Streak Strip */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">20-Day Trend</span>
              <span className="panel-subtitle">{mySectionName}</span>
            </div>
            <div className="mt-2">
              <StreakStrip data={trendData} threshold={threshold} />
            </div>
            {/* Animated sparkline below */}
            <div className="mt-4">
              <AnimatedTrendLine data={trendData.map((d) => d.percentage)} threshold={threshold} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Quick Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                className="p-3 bg-surface-2 rounded-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
              >
                <div className="text-xs text-muted uppercase">Best Day</div>
                <div className="font-data font-semibold text-pass">
                  <AnimatedCount value={quickStats.best} />%
                </div>
              </motion.div>
              <motion.div
                className="p-3 bg-surface-2 rounded-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <div className="text-xs text-muted uppercase">Worst Day</div>
                <div className="font-data font-semibold text-fail">
                  <AnimatedCount value={quickStats.worst} />%
                </div>
              </motion.div>
              <motion.div
                className="p-3 bg-surface-2 rounded-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="text-xs text-muted uppercase">Days Below 75%</div>
                <div className="font-data font-semibold">
                  <AnimatedCount value={quickStats.days_below_75} />
                </div>
              </motion.div>
              <motion.div
                className="p-3 bg-surface-2 rounded-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="text-xs text-muted uppercase">Class Strength</div>
                <div className="font-data font-semibold">{strength}</div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Animated count (integer)
function AnimatedCount({ value }: { value: number }) {
  const displayValue = useCountUp(value, { duration: 500, decimals: 0 })
  return <>{Math.round(displayValue)}</>
}

// Animated decimal
function AnimatedDecimal({ value }: { value: number }) {
  const displayValue = useCountUp(value, { duration: 500, decimals: 1 })
  return <>{displayValue.toFixed(1)}</>
}

// Animated trend line
function AnimatedTrendLine({
  data,
  threshold,
}: {
  data: number[]
  threshold: number
}) {
  const prefersReducedMotion = useReducedMotion()
  const width = 280
  const height = 50
  const padding = 2

  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((value, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - (value / 100) * chartHeight,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const thresholdY = padding + chartHeight - (threshold / 100) * chartHeight

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
    </svg>
  )
}
