/**
 * Teacher Pending View - Focused view for entering attendance
 * Shows a streamlined interface just for marking absentees
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ClipboardCheck, UserX, Users } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import {
  submitAttendance,
  getTeacherDashboard,
  ApiError,
  type TeacherDashboardData,
} from '@/api'
import { staggerContainer, panelVariants, chipVariants } from '@/lib/motion'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard } from '@/components/ui/ChartCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton } from '@/components/ui/EmptyState'

export function TeacherPendingView() {
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
      {/* Status cards */}
      <motion.div className="page-grid grid-cols-3" variants={panelVariants}>
        <StatCard
          label="Class Strength"
          value={strength}
          icon={<Users className="w-4.5 h-4.5" />}
          accent="indigo"
          footnote={mySectionName}
        />
        <StatCard
          label="Present Today"
          value={present}
          icon={<ClipboardCheck className="w-4.5 h-4.5" />}
          accent={percentage >= threshold ? 'emerald' : 'red'}
          footnote={`${percentage.toFixed(1)}% attendance`}
        />
        <StatCard
          label="Absent Today"
          value={strength - present}
          icon={<UserX className="w-4.5 h-4.5" />}
          accent={strength - present > 0 ? 'amber' : 'emerald'}
          footnote={submitted ? 'Already submitted' : 'Mark below'}
        />
      </motion.div>

      {/* Entry panel - main focus */}
      <motion.div variants={panelVariants}>
        <SectionCard
          title={submitted ? 'Attendance Submitted' : 'Mark Absentees'}
          subtitle={`${mySectionName} · ${selectedDate}`}
        >
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-pass-bg flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-pass" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                {isNoSession ? 'Marked as No Session' : 'Attendance Recorded'}
              </h3>
              <p className="text-muted text-sm mb-4">
                {isNoSession
                  ? 'This day has been marked as having no class session.'
                  : `${present} of ${strength} students present (${percentage.toFixed(1)}%)`
                }
              </p>
              <StatusBadge tone={isNoSession ? 'neutral' : percentage >= threshold ? 'pass' : 'fail'}>
                {isNoSession ? 'No Session' : percentage >= threshold ? 'Above Threshold' : 'Below Threshold'}
              </StatusBadge>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted mb-4">
                Enter roll numbers of absent students. Press Enter or click Add after each number.
              </p>

              {/* Absent chips */}
              <div className="chips-container min-h-[60px] mb-4">
                <AnimatePresence mode="popLayout">
                  {absentRolls.length === 0 ? (
                    <motion.span
                      key="empty"
                      className="text-faint text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      No absentees marked yet - all students present
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
                        Roll #{roll}
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
              <div className="entry-input-row mb-4">
                <input
                  type="number"
                  className="entry-input"
                  placeholder="Enter roll number (1-60)..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSubmitting}
                  min={1}
                  max={strength}
                />
                <motion.button
                  className="entry-btn"
                  onClick={handleAddRoll}
                  disabled={isSubmitting || !inputValue.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Add
                </motion.button>
              </div>

              {/* Action buttons */}
              <div className="entry-actions">
                <motion.button
                  className="entry-btn primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSubmitting ? 'Submitting...' : `Submit Attendance (${absentRolls.length} absent)`}
                </motion.button>
                <motion.button
                  className="entry-btn ghost"
                  onClick={handleNoSession}
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Mark No Session
                </motion.button>
              </div>
            </>
          )}
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
