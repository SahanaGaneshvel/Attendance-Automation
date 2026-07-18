import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { TrendingUp, UserX } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { useCountUp } from '@/hooks/useCountUp'
import {
  submitAttendance,
  getTeacherDashboard,
  ApiError,
  type TeacherDashboardData,
} from '@/api'
import { staggerContainer, panelVariants, chipVariants } from '@/lib/motion'
import { AnimatedRing, BulletBars } from '../AnimatedWidgets'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard, ChartCard } from '@/components/ui/ChartCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton } from '@/components/ui/EmptyState'

export function TeacherView() {
  const { selectedDate, threshold, showToast } = useAppStore()
  const { user } = useAuthContext()

  const mySectionId = user?.scope?.section_id ?? null
  const mySectionName = user?.scope?.section_name ?? 'My Class'

  const [absentRolls, setAbsentRolls] = useState<number[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null)

  const fetchDashboard = useCallback(async () => {
    if (!mySectionId) return
    setIsLoading(true)
    try {
      const data = await getTeacherDashboard(selectedDate)
      setDashboardData(data)
      if (data.today.status === 'recorded' || data.today.status === 'no_session') {
        setAbsentRolls([])
      }
    } catch {
      setDashboardData(null)
    } finally {
      setIsLoading(false)
    }
  }, [mySectionId, selectedDate])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const strength = dashboardData?.strength ?? 60
  const submitted = dashboardData?.today.status === 'recorded' || dashboardData?.today.status === 'no_session'
  const isNoSession = dashboardData?.today.status === 'no_session'

  const present = submitted ? (dashboardData?.today.present ?? strength) : strength - absentRolls.length
  const percentage = submitted ? (dashboardData?.today.percentage ?? 100) : ((strength - absentRolls.length) / strength) * 100

  const benchmarks = [
    { id: 'you', name: 'Your Class', value: percentage, isMe: true },
    { id: 'dept', name: 'Dept Avg', value: dashboardData?.department_avg ?? 0 },
    { id: 'threshold', name: 'Threshold', value: threshold },
  ]

  const trendData = (dashboardData?.trend ?? [])
    .filter((t) => t.status === 'recorded' && t.percentage !== null)
    .map((t) => ({ date: t.date.slice(5), value: t.percentage as number }))

  const quickStats = dashboardData?.quick_stats ?? { best: 0, worst: 0, days_below_75: 0, average: 0, recorded_days: 0 }

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
      await fetchDashboard()
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to mark no session'
      showToast(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddRoll()
  }

  if (isLoading && !dashboardData) {
    return (
      <div className="page-grid grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        <div style={{ gridColumn: '1 / -1' }}><LoadingState rows={5} /></div>
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-5" variants={staggerContainer} initial="hidden" animate="visible">
      {/* Lead ring card + quick stats */}
      <motion.div className="page-grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr' }} variants={panelVariants}>
        <SectionCard className="accent-bar-indigo relative overflow-hidden">
          <div className="ring-wrap">
            <AnimatedRing percentage={percentage} threshold={threshold} size={128} label="Today" />
            <div className="ring-meta">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">{mySectionName}</div>
              <div className="rm-big text-lg">
                <AnimatedCount value={present} /> / {strength}
              </div>
              <div className="rm-label">Present today</div>
              {submitted && (
                <div className="mt-2">
                  <StatusBadge tone={isNoSession ? 'neutral' : 'pass'}>{isNoSession ? 'No session' : 'Submitted'}</StatusBadge>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <StatCard
          label="Term Average"
          value={quickStats.average.toFixed(1)}
          suffix="%"
          icon={<TrendingUp className="w-4.5 h-4.5" />}
          accent={quickStats.average >= threshold ? 'emerald' : 'red'}
          footnote={`Last ${trendData.length} days`}
        />
        <StatCard
          label="Absent Today"
          value={strength - present}
          icon={<UserX className="w-4.5 h-4.5" />}
          accent={strength - present > strength * 0.25 ? 'red' : 'emerald'}
          footnote="students"
        />
      </motion.div>

      <div className="page-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Entry Panel — action first, business logic unchanged */}
        <motion.div className="entry-panel flex flex-col" variants={panelVariants}>
          <h3>Mark Absentees</h3>
          <p className="entry-subtitle">
            Enter roll numbers of absent students · {mySectionName} ({strength} students)
          </p>

          <div className="chips-container">
            <AnimatePresence mode="popLayout">
              {absentRolls.length === 0 ? (
                <motion.span key="empty" className="text-faint text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  No absentees marked yet
                </motion.span>
              ) : (
                absentRolls.map((roll) => (
                  <motion.div key={roll} className="absent-chip" variants={chipVariants} initial="initial" animate="animate" exit="exit" layout>
                    {roll}
                    <motion.button onClick={() => handleRemoveRoll(roll)} title="Remove" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                      ×
                    </motion.button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="entry-input-row">
            <input
              type="text"
              className="entry-input"
              placeholder="Enter roll number…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={submitted || isSubmitting}
            />
            <motion.button className="entry-btn" onClick={handleAddRoll} disabled={submitted || isSubmitting || !inputValue.trim()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              Add
            </motion.button>
          </div>

          <div className="entry-actions">
            <motion.button
              className="entry-btn"
              onClick={handleSubmit}
              disabled={submitted || isSubmitting}
              whileHover={submitted || isSubmitting ? {} : { scale: 1.02 }}
              whileTap={submitted || isSubmitting ? {} : { scale: 0.98 }}
            >
              {isSubmitting ? 'Submitting…' : submitted ? (isNoSession ? 'No Session' : 'Submitted') : 'Submit Attendance'}
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
          <SectionCard title="Benchmark" subtitle="vs department & threshold">
            <BulletBars data={benchmarks} threshold={threshold} />
          </SectionCard>

          <ChartCard title="Attendance Trend" subtitle={`${mySectionName} · last ${trendData.length} days`} height={160}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={26} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 11 }} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Attendance']} />
                <ReferenceLine y={threshold} stroke="var(--line-2)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <SectionCard title="Quick Stats">
            <div className="quick-stats-grid">
              <div className="quick-stat-card">
                <div className="quick-stat-label">Best Day</div>
                <div className="quick-stat-value text-pass"><AnimatedCount value={quickStats.best} />%</div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-label">Worst Day</div>
                <div className="quick-stat-value text-fail"><AnimatedCount value={quickStats.worst} />%</div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-label">Days Below 75%</div>
                <div className="quick-stat-value"><AnimatedCount value={quickStats.days_below_75} /></div>
              </div>
              <div className="quick-stat-card">
                <div className="quick-stat-label">Class Strength</div>
                <div className="quick-stat-value">{strength}</div>
              </div>
            </div>
          </SectionCard>
        </motion.div>
      </div>
    </motion.div>
  )
}

function AnimatedCount({ value }: { value: number }) {
  const displayValue = useCountUp(value, { duration: 500, decimals: 0 })
  return <>{Math.round(displayValue)}</>
}
