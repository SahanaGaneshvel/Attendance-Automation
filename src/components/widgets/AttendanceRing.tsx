import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import { getDailyClassAttendance, getSectionById } from '@/data/store'
import { useCountUp } from '@/hooks/useCountUp'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface AttendanceRingProps {
  sectionId: string
}

export function AttendanceRing({ sectionId }: AttendanceRingProps) {
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const attendance = getDailyClassAttendance(sectionId, selectedDate)
  const section = getSectionById(sectionId)

  const percentage = attendance?.percentage ?? 0
  const present = attendance?.present ?? 0
  const absent = attendance?.absent ?? 0
  const strength = section?.strength ?? 0

  const displayPercentage = useCountUp(percentage, { decimals: 1 })
  const isPass = percentage >= threshold

  // Ring dimensions
  const size = 200
  const strokeWidth = 16
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Today's Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Ring */}
          <div className="relative" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              className="-rotate-90"
              style={{ transform: 'rotate(-90deg)' }}
            >
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--line)"
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={isPass ? 'var(--pass)' : 'var(--fail)'}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={prefersReducedMotion ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  'font-display text-4xl font-semibold tabular-nums',
                  isPass ? 'text-pass' : 'text-fail'
                )}
              >
                {displayPercentage}%
              </span>
              <span className="text-sm text-muted">attendance</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid w-full grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-surface-2 p-3">
              <p className="text-2xl font-semibold text-ink tabular-nums">{strength}</p>
              <p className="text-xs text-muted">Strength</p>
            </div>
            <div className="rounded-lg bg-pass-bg p-3">
              <p className="text-2xl font-semibold text-pass tabular-nums">{present}</p>
              <p className="text-xs text-muted">Present</p>
            </div>
            <div className="rounded-lg bg-fail-bg p-3">
              <p className="text-2xl font-semibold text-fail tabular-nums">{absent}</p>
              <p className="text-xs text-muted">Absent</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
