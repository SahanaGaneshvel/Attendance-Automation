import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import { getAllDepartmentStats, getDepartmentById } from '@/data/store'
import { cn, formatPercent } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function DepartmentComparison() {
  const navigate = useNavigate()
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const stats = getAllDepartmentStats(selectedDate)
    .map((stat) => ({
      ...stat,
      department: getDepartmentById(stat.departmentId)!,
    }))
    .sort((a, b) => b.averagePercentage - a.averagePercentage)

  const maxPercentage = Math.max(...stats.map((s) => s.averagePercentage), 100)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Department Comparison</CardTitle>
        <p className="text-sm text-muted">Today's average attendance by department</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.map((stat, index) => {
            const barWidth = (stat.averagePercentage / maxPercentage) * 100
            const isPass = stat.averagePercentage >= threshold

            return (
              <motion.div
                key={stat.departmentId}
                initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => navigate(`/department/${stat.departmentId}`)}
                  className="w-full group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
                      {stat.department.code}
                    </span>
                    <span
                      className={cn(
                        'font-mono text-sm font-semibold tabular-nums',
                        isPass ? 'text-pass' : 'text-fail'
                      )}
                    >
                      {formatPercent(stat.averagePercentage, 1)}
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-line/50">
                    {/* Threshold marker */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-fail/50"
                      style={{ left: `${(threshold / maxPercentage) * 100}%` }}
                    />
                    {/* Progress bar */}
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        isPass ? 'bg-pass' : 'bg-fail'
                      )}
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

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-pass" />
            <span>≥{threshold}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-fail" />
            <span>&lt;{threshold}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
