import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { getAllDepartmentStats, getDepartmentById } from '@/data/store'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

export function ComparisonStrip() {
  const navigate = useNavigate()
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const stats = getAllDepartmentStats(selectedDate)
    .map((stat) => ({
      ...stat,
      department: getDepartmentById(stat.departmentId)!,
    }))
    .sort((a, b) => b.averagePercentage - a.averagePercentage)

  const maxPercentage = 100 // Use 100 as max for consistent scaling

  // Determine school grouping for tags
  const getSchoolTag = (deptId: string) => {
    if (['ai-ds', 'cse', 'it'].includes(deptId)) return 'CSCI'
    if (['ece', 'mech'].includes(deptId)) return 'ENGG'
    return ''
  }

  return (
    <div className="mt-6">
      {/* Section header - distinct styling from matrix */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-ink">Department comparison</h3>
          <p className="text-xs text-muted">
            Today's strength-weighted average — bar marker = {threshold}% line
          </p>
        </div>
      </div>

      {/* Comparison bars */}
      <div className="space-y-2">
        {stats.map((stat, index) => {
          const barWidth = (stat.averagePercentage / maxPercentage) * 100
          const isPass = stat.averagePercentage >= threshold
          const schoolTag = getSchoolTag(stat.departmentId)

          return (
            <motion.div
              key={stat.departmentId}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="comparison-row group"
            >
              {/* Department label with school tag */}
              <button
                onClick={() => navigate(`/department/${stat.departmentId}`)}
                className="comparison-label flex items-center gap-2 hover:text-brand transition-colors focus:outline-none"
              >
                <span className="font-medium">{stat.department.code}</span>
                {schoolTag && (
                  <span className="text-[10px] text-muted font-data uppercase">
                    {schoolTag}
                  </span>
                )}
              </button>

              {/* Bar container */}
              <div className="comparison-bar-container">
                {/* Threshold marker */}
                <div
                  className="threshold-marker"
                  style={{ left: `${threshold}%` }}
                />

                {/* Progress bar */}
                <motion.div
                  className={cn(
                    'comparison-bar',
                    isPass ? 'bg-pass' : 'bg-fail'
                  )}
                  initial={prefersReducedMotion ? { width: `${barWidth}%` } : { width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{
                    delay: index * 0.05 + 0.2,
                    duration: 0.5,
                    ease: 'easeOut',
                  }}
                />
              </div>

              {/* Value */}
              <span
                className={cn(
                  'comparison-value',
                  isPass ? 'text-pass' : 'text-fail'
                )}
              >
                {stat.averagePercentage.toFixed(1)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
