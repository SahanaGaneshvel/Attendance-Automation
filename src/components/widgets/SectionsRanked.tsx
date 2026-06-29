import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/appStore'
import { getSectionsByDepartment, getDailyClassAttendance } from '@/data/store'
import { cn, formatPercent } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SectionsRankedProps {
  departmentId: string
}

export function SectionsRanked({ departmentId }: SectionsRankedProps) {
  const navigate = useNavigate()
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const sections = getSectionsByDepartment(departmentId)
    .map((section) => {
      const attendance = getDailyClassAttendance(section.id, selectedDate)
      return {
        ...section,
        attendance,
        percentage: attendance?.percentage ?? 0,
      }
    })
    .sort((a, b) => b.percentage - a.percentage)

  const maxPercentage = Math.max(...sections.map((s) => s.percentage), 100)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Sections Ranked</CardTitle>
        <p className="text-sm text-muted">Best to worst attendance today</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sections.map((section, index) => {
            const barWidth = (section.percentage / maxPercentage) * 100
            const isPass = section.percentage >= threshold

            return (
              <motion.div
                key={section.id}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => navigate(`/section/${section.id}`)}
                  className="w-full group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded-lg p-3 -m-3 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
                          Section {section.name}
                        </span>
                        <p className="text-xs text-muted">{section.advisor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isPass ? 'pass' : 'fail'}>
                        {section.attendance?.absent ?? 0} absent
                      </Badge>
                      <span
                        className={cn(
                          'font-mono text-sm font-semibold tabular-nums',
                          isPass ? 'text-pass' : 'text-fail'
                        )}
                      >
                        {formatPercent(section.percentage, 1)}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-line/50">
                    <div
                      className="absolute top-0 bottom-0 w-px bg-fail/50"
                      style={{ left: `${(threshold / maxPercentage) * 100}%` }}
                    />
                    <motion.div
                      className={cn('h-full rounded-full', isPass ? 'bg-pass' : 'bg-fail')}
                      initial={prefersReducedMotion ? { width: `${barWidth}%` } : { width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{
                        delay: index * 0.05 + 0.2,
                        duration: 0.6,
                        ease: 'easeOut',
                      }}
                    />
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
