import { motion } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import {
  getDepartmentDailyStats,
  getAllDepartmentStats,
  getSparklineData,
} from '@/data/store'
import { useCountUp } from '@/hooks/useCountUp'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Sparkline } from './Sparkline'
import { cn } from '@/lib/utils'

interface DepartmentKPIsProps {
  departmentId: string
}

export function DepartmentKPIs({ departmentId }: DepartmentKPIsProps) {
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const stats = getDepartmentDailyStats(departmentId, selectedDate)
  const sparkline = getSparklineData({ type: 'department', id: departmentId })

  // Calculate department rank
  const allDeptStats = getAllDepartmentStats(selectedDate).sort(
    (a, b) => b.averagePercentage - a.averagePercentage
  )
  const rank = allDeptStats.findIndex((d) => d.departmentId === departmentId) + 1

  const avgValue = useCountUp(stats?.averagePercentage ?? 0, { decimals: 1 })
  const isPass = (stats?.averagePercentage ?? 0) >= threshold

  const kpis = [
    {
      label: 'Average Attendance',
      value: avgValue,
      suffix: '%',
      colored: true,
    },
    {
      label: 'Sections Above Threshold',
      value: (stats?.sectionsTotal ?? 0) - (stats?.sectionsBelow75 ?? 0),
      suffix: `/${stats?.sectionsTotal ?? 0}`,
      colored: false,
    },
    {
      label: 'Total Present',
      value: stats?.totalPresent ?? 0,
      suffix: `/${stats?.totalStrength ?? 0}`,
      colored: false,
    },
    {
      label: 'Department Rank',
      value: rank,
      suffix: `/${allDeptStats.length}`,
      colored: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="card-hover">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted">{kpi.label}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={cn(
                    'font-mono text-2xl font-semibold tabular-nums',
                    kpi.colored && (isPass ? 'text-pass' : 'text-fail')
                  )}
                >
                  {kpi.value}
                </span>
                <span className="text-sm text-muted">{kpi.suffix}</span>
              </div>
              {index === 0 && sparkline.length > 1 && (
                <div className="mt-2">
                  <Sparkline
                    data={sparkline}
                    threshold={threshold}
                    strokeColor={isPass ? 'var(--pass)' : 'var(--fail)'}
                    width={100}
                    height={28}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
