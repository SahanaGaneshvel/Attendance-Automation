import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/store/appStore'
import {
  departments,
  getSectionsByDepartment,
  getDailyClassAttendance,
  getDepartmentDailyStats,
} from '@/data/store'
import { cn, formatPercent } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function AttendanceHeatmap() {
  const navigate = useNavigate()
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  // Get max sections count for column headers
  const maxSections = Math.max(
    ...departments.map((d) => getSectionsByDepartment(d.id).length)
  )
  const sectionLabels = ['A', 'B', 'C'].slice(0, maxSections)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Department × Section Attendance</CardTitle>
        <p className="text-sm text-muted">
          Click any cell to drill down. Green: ≥{threshold}%, Red: &lt;{threshold}%
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-sm font-medium text-muted">
                  Department
                </th>
                {sectionLabels.map((label) => (
                  <th key={label} className="px-3 py-2 text-center text-sm font-medium text-muted">
                    Sec {label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-sm font-medium text-muted">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, deptIndex) => {
                const deptSections = getSectionsByDepartment(dept.id)
                const deptStats = getDepartmentDailyStats(dept.id, selectedDate)

                return (
                  <motion.tr
                    key={dept.id}
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: deptIndex * 0.05 }}
                    className="border-t border-line"
                  >
                    <td className="px-3 py-2">
                      <button
                        onClick={() => navigate(`/department/${dept.id}`)}
                        className="text-left font-medium text-ink hover:text-brand transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded px-1"
                      >
                        {dept.code}
                      </button>
                    </td>

                    {sectionLabels.map((label, sectionIndex) => {
                      const section = deptSections.find((s) => s.name === label)
                      if (!section) {
                        return (
                          <td key={label} className="px-3 py-2">
                            <div className="h-12 w-full" />
                          </td>
                        )
                      }

                      const attendance = getDailyClassAttendance(section.id, selectedDate)
                      const percentage = attendance?.percentage ?? 0
                      const isPass = percentage >= threshold

                      return (
                        <td key={section.id} className="px-3 py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.button
                                layoutId={`cell-${section.id}`}
                                onClick={() => navigate(`/section/${section.id}`)}
                                initial={prefersReducedMotion ? {} : { scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                  delay: deptIndex * 0.04 + sectionIndex * 0.03,
                                  type: 'spring',
                                  stiffness: 300,
                                  damping: 25,
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                className={cn(
                                  'flex h-12 w-full min-w-[80px] items-center justify-center rounded-lg font-mono text-sm font-semibold tabular-nums transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
                                  isPass
                                    ? 'bg-pass-cell text-pass hover:shadow-md'
                                    : 'bg-fail-cell text-fail hover:shadow-md'
                                )}
                              >
                                {formatPercent(percentage, 0)}
                              </motion.button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <p className="font-medium">
                                  {dept.code} Section {section.name}
                                </p>
                                <p className="text-xs opacity-80">
                                  {attendance?.present ?? 0} present, {attendance?.absent ?? 0} absent
                                </p>
                                <p className="text-xs opacity-80">Strength: {section.strength}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )
                    })}

                    {/* Department Average */}
                    <td className="px-3 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.button
                            onClick={() => navigate(`/department/${dept.id}`)}
                            initial={prefersReducedMotion ? {} : { scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              delay: deptIndex * 0.04 + maxSections * 0.03,
                              type: 'spring',
                              stiffness: 300,
                              damping: 25,
                            }}
                            whileHover={{ scale: 1.05 }}
                            className={cn(
                              'flex h-12 w-full min-w-[80px] items-center justify-center rounded-lg font-mono text-sm font-bold tabular-nums transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
                              (deptStats?.averagePercentage ?? 0) >= threshold
                                ? 'bg-pass-bg text-pass hover:shadow-md'
                                : 'bg-fail-bg text-fail hover:shadow-md'
                            )}
                          >
                            {formatPercent(deptStats?.averagePercentage ?? 0, 0)}
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <p className="font-medium">{dept.name}</p>
                            <p className="text-xs opacity-80">
                              {deptStats?.sectionsBelow75 ?? 0} sections below {threshold}%
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
