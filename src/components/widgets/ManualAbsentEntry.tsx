import { useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Minus, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { submitManualAttendance, getSectionById } from '@/data/store'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface ManualAbsentEntryProps {
  sectionId: string
  onSubmit?: () => void
}

export function ManualAbsentEntry({ sectionId, onSubmit }: ManualAbsentEntryProps) {
  const { selectedDate, showToast } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const [absentCount, setAbsentCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const section = getSectionById(sectionId)
  const strength = section?.strength ?? 60

  const increment = () => {
    setAbsentCount((prev) => Math.min(prev + 1, strength))
  }

  const decrement = () => {
    setAbsentCount((prev) => Math.max(prev - 1, 0))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setAbsentCount(Math.max(0, Math.min(value, strength)))
    } else if (e.target.value === '') {
      setAbsentCount(0)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Simulate a brief delay for UX
    await new Promise((resolve) => setTimeout(resolve, 300))

    const success = submitManualAttendance(sectionId, selectedDate, absentCount)

    if (success) {
      const presentCount = strength - absentCount
      showToast(`Recorded: ${presentCount} present, ${absentCount} absent`, 'success')
      setAbsentCount(0)
      onSubmit?.()
    } else {
      showToast('Failed to record attendance', 'error')
    }

    setIsSubmitting(false)
  }

  const presentCount = strength - absentCount
  const percentage = strength > 0 ? (presentCount / strength) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Save className="h-4 w-4 text-muted" />
          <CardTitle className="text-base">Record Attendance</CardTitle>
        </div>
        <p className="text-sm text-muted">
          Manual entry for when ERP data is missing
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Absent count input with +/- buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink">Number of Absentees</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={decrement}
                disabled={absentCount === 0}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>

              <motion.div
                key={absentCount}
                initial={prefersReducedMotion ? {} : { scale: 1.1 }}
                animate={{ scale: 1 }}
                className="flex-1"
              >
                <input
                  type="number"
                  min={0}
                  max={strength}
                  value={absentCount}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-line bg-surface-2 px-4 py-2 text-center font-mono text-2xl font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </motion.div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={increment}
                disabled={absentCount === strength}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted text-center">
              out of {strength} students
            </p>
          </div>

          {/* Summary preview */}
          <div className="rounded-lg bg-surface-2 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Present</span>
              <span className="font-medium text-pass">{presentCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Absent</span>
              <span className={cn('font-medium', absentCount > 0 ? 'text-fail' : 'text-ink')}>
                {absentCount}
              </span>
            </div>
            <div className="border-t border-line pt-1 mt-1 flex justify-between text-sm">
              <span className="text-muted">Attendance %</span>
              <span className={cn(
                'font-mono font-semibold',
                percentage >= 75 ? 'text-pass' : 'text-fail'
              )}>
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Recording...' : 'Save Attendance'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
