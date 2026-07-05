import { useState, useEffect, useRef, useMemo } from 'react'
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
import { SPRING, getRippleDelay } from '@/lib/motion'

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
        r="2.5"
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
  sectionName: string
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
  sectionName,
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

  // Staggered animation delay based on position (diagonal ripple)
  const staggerDelay = getRippleDelay(rowIndex, colIndex)

  return (
    <td className="px-1.5 py-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            key={`${sectionId}-${recolorKey}`}
            onClick={onClick}
            onMouseEnter={() => onHover(colIndex)}
            onMouseLeave={() => onHover(null)}
            className={cn(
              'matrix-cell cursor-pointer transition-all duration-100',
              isNoSession ? 'none' : isPass ? 'pass' : 'fail',
              (isRowHovered || isColHovered) && 'ring-1 ring-inset ring-ink/10'
            )}
            initial={prefersReducedMotion ? {} : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: staggerDelay,
              ...SPRING.snappy,
            }}
            whileHover={
              !isNoSession
                ? { scale: 1.02, y: -1, boxShadow: 'var(--panel-shadow-lg)' }
                : undefined
            }
            whileTap={!isNoSession ? { scale: 0.98 } : undefined}
          >
            {isNoSession ? 'N/S' : `${Math.round(percentage)}`}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{sectionName}</p>
          <p className="text-xs opacity-75">
            {isNoSession ? 'No session scheduled' : `${percentage.toFixed(1)}%`}
          </p>
        </TooltipContent>
      </Tooltip>
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
      setRecolorKey((k) => k + 1)
      prevDateRef.current = selectedDate
      prevThresholdRef.current = threshold
    }
  }, [selectedDate, threshold])

  // Build matrix data - only render columns that exist per department
  const matrixData = useMemo(() => {
    return departments.map((dept) => {
      const deptSections = getSectionsByDepartment(dept.id)
      const deptStats = getDepartmentDailyStats(dept.id, selectedDate)
      const trendData = getDepartmentTrend(dept.id).map((p) => p.percentage)

      const cells = deptSections.map((section) => {
        const attendance = getDailyClassAttendance(section.id, selectedDate)
        // Simulate no_session for demonstration
        const isNoSession = section.id === 'it-c'
        return {
          sectionId: section.id,
          sectionName: `${dept.code} - Section ${section.name}`,
          percentage: attendance?.percentage ?? 0,
          strength: section.strength,
          isNoSession,
        }
      })

      return {
        dept,
        deptStats,
        trendData,
        cells,
        sectionCount: deptSections.length,
      }
    })
  }, [selectedDate, threshold])

  // Find max sections to determine column headers (only show what exists)
  const maxSections = Math.max(...matrixData.map((d) => d.sectionCount))
  const sectionLabels = ['A', 'B', 'C', 'D', 'E'].slice(0, maxSections)

  return (
    <div className="panel no-pad">
      <div className="panel-header in-pad" style={{ padding: '14px 16px 10px' }}>
        <div>
          <span className="panel-title">Department × Section Matrix</span>
          <p className="text-xs text-muted mt-0.5">
            Hover to highlight · Click to drill down
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-pass-cell" />
            <span className="text-muted">≥{threshold}%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-fail-cell" />
            <span className="text-muted">&lt;{threshold}%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-none" />
            <span className="text-muted">No Session</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="left">Department</th>
              {/* Only render section columns that exist */}
              {sectionLabels.map((label, idx) => (
                <th
                  key={label}
                  className={cn(
                    'transition-colors duration-100',
                    hoveredCol === idx && 'bg-accent-soft'
                  )}
                >
                  Sec {label}
                </th>
              ))}
              <th>AVG</th>
              <th className="left">20-Day Trend</th>
            </tr>
          </thead>
          <tbody>
            {matrixData.map((row, rowIndex) => {
              const isRowHovered = hoveredRow === rowIndex

              return (
                <motion.tr
                  key={row.dept.id}
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIndex * 0.03 }}
                  className={cn(
                    'border-t border-line transition-colors duration-100',
                    isRowHovered && 'bg-accent-soft/30'
                  )}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {/* Department Name & Total Strength */}
                  <td className="px-4 py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => navigate(`/department/${row.dept.id}`)}
                          className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 rounded"
                        >
                          <span className="font-semibold text-sm text-ink group-hover:text-accent transition-colors">
                            {row.dept.code}
                          </span>
                          <span className="text-[10px] text-muted ml-2 font-data">
                            {row.deptStats?.totalStrength ?? 0}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{row.dept.name}</p>
                        <p className="text-xs opacity-75">
                          Total strength: {row.deptStats?.totalStrength ?? 0}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* Section Cells - only render what exists, no empty columns */}
                  {sectionLabels.map((_, colIndex) => {
                    const cell = row.cells[colIndex]

                    // If this department doesn't have this section, render empty
                    if (!cell) {
                      return <td key={colIndex} className="px-1.5 py-1.5" />
                    }

                    return (
                      <MatrixCell
                        key={cell.sectionId}
                        sectionId={cell.sectionId}
                        sectionName={cell.sectionName}
                        percentage={cell.percentage}
                        isPass={cell.percentage >= threshold}
                        isNoSession={cell.isNoSession}
                        rowIndex={rowIndex}
                        colIndex={colIndex}
                        isRowHovered={isRowHovered}
                        isColHovered={hoveredCol === colIndex}
                        recolorKey={recolorKey}
                        onClick={() => navigate(`/section/${cell.sectionId}`)}
                        onHover={setHoveredCol}
                      />
                    )
                  })}

                  {/* Department Average */}
                  <td className="px-1.5 py-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          key={`avg-${row.dept.id}-${recolorKey}`}
                          onClick={() => navigate(`/department/${row.dept.id}`)}
                          className={cn(
                            'matrix-cell avg font-bold',
                            (row.deptStats?.averagePercentage ?? 0) >= threshold
                              ? 'pass'
                              : 'fail'
                          )}
                          initial={prefersReducedMotion ? {} : { scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            delay: getRippleDelay(rowIndex, maxSections),
                            ...SPRING.snappy,
                          }}
                          whileHover={{ scale: 1.02, y: -1 }}
                        >
                          {Math.round(row.deptStats?.averagePercentage ?? 0)}
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{row.dept.name} Average</p>
                        <p className="text-xs opacity-75">
                          Weighted: {row.deptStats?.totalPresent ?? 0} /{' '}
                          {row.deptStats?.totalStrength ?? 0}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>

                  {/* 20-Day Sparkline */}
                  <td className="px-4 py-2">
                    <RowSparkline data={row.trendData} threshold={threshold} />
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
