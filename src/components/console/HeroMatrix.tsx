import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  departments,
  getSectionsByDepartment,
  getDailyClassAttendance,
  getDepartmentDailyStats,
  getDepartmentTrend,
} from '@/data/store'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

// Mini sparkline for row trends
interface RowSparklineProps {
  data: number[]
  threshold: number
  width?: number
  height?: number
}

function RowSparkline({ data, threshold, width = 80, height = 24 }: RowSparklineProps) {
  const prefersReducedMotion = useReducedMotion()

  if (data.length < 2) return null

  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const min = Math.min(...data, threshold - 10)
  const max = Math.max(...data, threshold + 10)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return { x, y, value }
  })

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const thresholdY = padding + chartHeight - ((threshold - min) / range) * chartHeight
  const lastPoint = points[points.length - 1]
  const isAboveThreshold = lastPoint.value >= threshold

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Threshold line */}
      <line
        x1={padding}
        y1={thresholdY}
        x2={width - padding}
        y2={thresholdY}
        stroke="var(--fail)"
        strokeWidth="1"
        strokeDasharray="2,2"
        opacity="0.3"
      />

      {/* Main line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={isAboveThreshold ? 'var(--pass)' : 'var(--fail)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={prefersReducedMotion ? {} : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />

      {/* End point */}
      <motion.circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="2"
        fill={isAboveThreshold ? 'var(--pass)' : 'var(--fail)'}
        initial={prefersReducedMotion ? {} : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      />
    </svg>
  )
}

// Matrix cell component
interface MatrixCellProps {
  sectionId: string
  percentage: number
  isPass: boolean
  isNoSession?: boolean
  rowIndex: number
  colIndex: number
  isRowHovered: boolean
  isColHovered: boolean
  recolorKey: number
  onClick: () => void
  onHover: (col: number | null) => void
}

function MatrixCell({
  sectionId,
  percentage,
  isPass,
  isNoSession = false,
  rowIndex,
  colIndex,
  isRowHovered,
  isColHovered,
  recolorKey,
  onClick,
  onHover,
}: MatrixCellProps) {
  const prefersReducedMotion = useReducedMotion()

  // Staggered animation delay based on position
  const staggerDelay = (rowIndex * 0.04 + colIndex * 0.025)

  const cellClasses = cn(
    'matrix-cell cursor-pointer transition-all duration-150',
    isNoSession ? 'neutral' : isPass ? 'pass' : 'fail',
    isRowHovered && 'ring-1 ring-inset ring-brand/10',
    isColHovered && 'ring-2 ring-inset ring-brand/20'
  )

  return (
    <td className="px-1.5 py-1.5">
      <motion.button
        key={`${sectionId}-${recolorKey}`}
        onClick={onClick}
        onMouseEnter={() => onHover(colIndex)}
        onMouseLeave={() => onHover(null)}
        className={cellClasses}
        initial={prefersReducedMotion ? {} : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: staggerDelay,
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        {isNoSession ? 'no sess' : `${Math.round(percentage)}`}
      </motion.button>
    </td>
  )
}

export function HeroMatrix() {
  const navigate = useNavigate()
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  // State for crosshair hover
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [hoveredCol, setHoveredCol] = useState<number | null>(null)

  // Recolor animation trigger (increments when date/threshold changes)
  const [recolorKey, setRecolorKey] = useState(0)
  const prevDateRef = useRef(selectedDate)
  const prevThresholdRef = useRef(threshold)

  useEffect(() => {
    if (selectedDate !== prevDateRef.current || threshold !== prevThresholdRef.current) {
      setRecolorKey(k => k + 1)
      prevDateRef.current = selectedDate
      prevThresholdRef.current = threshold
    }
  }, [selectedDate, threshold])

  // Get max sections count for column headers
  const maxSections = Math.max(
    ...departments.map((d) => getSectionsByDepartment(d.id).length)
  )
  const sectionLabels = ['A', 'B', 'C'].slice(0, maxSections)

  return (
    <div className="matrix-panel">
      <div className="matrix-header flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm text-ink">Department × Section</h3>
          <p className="text-xs text-muted mt-0.5">
            Green ≥ {threshold} · Red &lt; {threshold} · grey = no session · click to drill
          </p>
        </div>
      </div>

      <div className="matrix-body overflow-x-auto">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase tracking-wider w-28">
                Department
              </th>
              {sectionLabels.map((label, idx) => (
                <th
                  key={label}
                  className={cn(
                    'px-1.5 py-2 text-center text-xs font-medium text-muted uppercase tracking-wider',
                    hoveredCol === idx && 'bg-surface-2/50'
                  )}
                >
                  Sec {label}
                </th>
              ))}
              <th className="px-1.5 py-2 text-center text-xs font-medium text-muted uppercase tracking-wider">
                AVG
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted uppercase tracking-wider">
                20-Day Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept, rowIndex) => {
              const deptSections = getSectionsByDepartment(dept.id)
              const deptStats = getDepartmentDailyStats(dept.id, selectedDate)
              const trendData = getDepartmentTrend(dept.id).map(p => p.percentage)
              const isRowHovered = hoveredRow === rowIndex

              return (
                <motion.tr
                  key={dept.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIndex * 0.03 }}
                  className={cn(
                    'border-t border-line transition-colors duration-150',
                    isRowHovered && 'bg-surface-2/30'
                  )}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Department Name & Strength */}
                  <td className="px-3 py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(`/department/${dept.id}`)}
                          className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded"
                        >
                          <span className="font-medium text-sm text-ink group-hover:text-brand transition-colors">
                            {dept.code}
                          </span>
                          <span className="text-[10px] text-muted ml-1.5 font-data">
                            {deptStats?.totalStrength ?? 0}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-xs opacity-75">
                          Total strength: {deptStats?.totalStrength ?? 0}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* Section Cells */}
                  {sectionLabels.map((label, colIndex) => {
                    const section = deptSections.find((s) => s.name === label)
                    if (!section) {
                      return (
                        <td key={label} className="px-1.5 py-1.5">
                          <div className="matrix-cell neutral opacity-50">—</div>
                        </td>
                      )
                    }

                    const attendance = getDailyClassAttendance(section.id, selectedDate)
                    const percentage = attendance?.percentage ?? 0
                    const isPass = percentage >= threshold

                    // Simulate no_session for IT Sec C
                    const isNoSession = section.id === 'it-c'

                    return (
                      <MatrixCell
                        key={section.id}
                        sectionId={section.id}
                        percentage={percentage}
                        isPass={isPass}
                        isNoSession={isNoSession}
                        rowIndex={rowIndex}
                        colIndex={colIndex}
                        isRowHovered={isRowHovered}
                        isColHovered={hoveredCol === colIndex}
                        recolorKey={recolorKey}
                        onClick={() => navigate(`/section/${section.id}`)}
                        onHover={setHoveredCol}
                      />
                    )
                  })}

                  {/* Department Average */}
                  <td className="px-1.5 py-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          key={`avg-${dept.id}-${recolorKey}`}
                          onClick={() => navigate(`/department/${dept.id}`)}
                          className={cn(
                            'matrix-cell font-bold',
                            (deptStats?.averagePercentage ?? 0) >= threshold ? 'pass' : 'fail'
                          )}
                          initial={prefersReducedMotion ? {} : { scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            delay: rowIndex * 0.04 + maxSections * 0.025,
                            type: 'spring',
                            stiffness: 400,
                            damping: 25,
                          }}
                          whileHover={{ scale: 1.02, y: -1 }}
                        >
                          {Math.round(deptStats?.averagePercentage ?? 0)}
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{dept.name} Average</p>
                        <p className="text-xs opacity-75">
                          Weighted: {deptStats?.totalPresent ?? 0} / {deptStats?.totalStrength ?? 0}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* 20-Day Sparkline */}
                  <td className="px-3 py-2">
                    <RowSparkline
                      data={trendData}
                      threshold={threshold}
                    />
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
