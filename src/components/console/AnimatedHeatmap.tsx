import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  departments,
  sections,
  getDailyClassAttendance,
  getDepartmentDailyStats,
  getSectionTrend,
} from '@/data/store'
import { cn } from '@/lib/utils'
import { SPRING, TIMING, getRippleDelay } from '@/lib/motion'

interface CellData {
  id: string
  sectionId: string
  deptId: string
  sectionName: string
  deptCode: string
  percentage: number | null
  row: number
  col: number
}

interface HeatmapProps {
  onDrillDown?: (sectionId: string) => void
}

export function AnimatedHeatmap({ onDrillDown }: HeatmapProps) {
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null)
  const [animationKey, setAnimationKey] = useState(0)

  // Build matrix data
  const matrixData = useMemo(() => {
    const deptList = departments.slice(0, 6) // Limit for display
    const maxSections = 5

    const rows: { dept: typeof departments[0]; deptStats: ReturnType<typeof getDepartmentDailyStats>; cells: CellData[] }[] = []

    deptList.forEach((dept, rowIndex) => {
      const deptSections = sections.filter((s) => s.departmentId === dept.id).slice(0, maxSections)
      const deptStats = getDepartmentDailyStats(dept.id, selectedDate)

      const cells: CellData[] = deptSections.map((section, colIndex) => {
        const attendance = getDailyClassAttendance(section.id, selectedDate)
        return {
          id: `${dept.id}-${section.id}`,
          sectionId: section.id,
          deptId: dept.id,
          sectionName: section.name,
          deptCode: dept.code,
          percentage: attendance?.percentage ?? null,
          row: rowIndex,
          col: colIndex,
        }
      })

      // Pad with empty cells if needed
      while (cells.length < maxSections) {
        cells.push({
          id: `${dept.id}-empty-${cells.length}`,
          sectionId: '',
          deptId: dept.id,
          sectionName: '',
          deptCode: dept.code,
          percentage: null,
          row: rowIndex,
          col: cells.length,
        })
      }

      rows.push({ dept, deptStats, cells })
    })

    return rows
  }, [selectedDate])

  // Trigger ripple animation on date change
  useMemo(() => {
    setAnimationKey((k) => k + 1)
  }, [selectedDate, threshold])

  const handleCellClick = useCallback((cell: CellData) => {
    if (cell.percentage === null) return
    setSelectedCell(cell)
    onDrillDown?.(cell.sectionId)
  }, [onDrillDown])

  const handleCellHover = useCallback((row: number, col: number) => {
    setHoveredCell({ row, col })
  }, [])

  const handleCellLeave = useCallback(() => {
    setHoveredCell(null)
  }, [])

  const isRowHighlighted = (row: number) => hoveredCell?.row === row
  const isColHighlighted = (col: number) => hoveredCell?.col === col
  const isCellHighlighted = (row: number, col: number) =>
    hoveredCell?.row === row && hoveredCell?.col === col

  return (
    <LayoutGroup>
      <div className="panel no-pad">
        <div className="panel-header in-pad">
          <span className="panel-title">Department × Section Matrix</span>
          <span className="panel-subtitle">Hover to highlight · Click to drill</span>
        </div>

        <div className="overflow-x-auto">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="left">Department</th>
                <th>Avg</th>
                {['A', 'B', 'C', 'D', 'E'].map((letter, colIndex) => (
                  <th
                    key={letter}
                    className={cn(
                      'transition-colors duration-100',
                      isColHighlighted(colIndex) && 'bg-accent-soft'
                    )}
                  >
                    Sec {letter}
                  </th>
                ))}
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row, rowIndex) => (
                <motion.tr
                  key={row.dept.id}
                  className={cn(
                    'transition-colors duration-100',
                    isRowHighlighted(rowIndex) && 'bg-accent-soft'
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: prefersReducedMotion ? 0 : rowIndex * TIMING.stagger * 2,
                  }}
                >
                  {/* Department name */}
                  <td>
                    <div className="matrix-row-name">
                      {row.dept.name}
                      <span className="matrix-row-strength">
                        {row.cells.reduce((sum, c) => {
                          const sec = sections.find((s) => s.id === c.sectionId)
                          return sum + (sec?.strength ?? 0)
                        }, 0)}
                      </span>
                    </div>
                  </td>

                  {/* Department average */}
                  <td>
                    <motion.div
                      className={cn(
                        'matrix-cell avg',
                        (row.deptStats?.averagePercentage ?? 0) >= threshold ? 'pass' : 'fail'
                      )}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: prefersReducedMotion ? 0 : rowIndex * TIMING.stagger * 2,
                        ...SPRING.snappy,
                      }}
                    >
                      {Math.round(row.deptStats?.averagePercentage ?? 0)}
                    </motion.div>
                  </td>

                  {/* Section cells */}
                  {row.cells.map((cell, colIndex) => (
                    <td key={cell.id}>
                      <motion.div
                        layoutId={cell.sectionId ? `cell-${cell.sectionId}` : undefined}
                        className={cn(
                          'matrix-cell',
                          cell.percentage === null
                            ? 'none'
                            : cell.percentage >= threshold
                            ? 'pass'
                            : 'fail',
                          isCellHighlighted(rowIndex, colIndex) && 'ring-2 ring-accent'
                        )}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                          // Ripple color transition
                          backgroundColor:
                            cell.percentage === null
                              ? 'var(--none)'
                              : cell.percentage >= threshold
                              ? 'var(--pass-cell)'
                              : 'var(--fail-cell)',
                        }}
                        whileHover={
                          cell.percentage !== null
                            ? {
                                y: -2,
                                boxShadow: 'var(--panel-shadow-lg)',
                                scale: 1.02,
                              }
                            : undefined
                        }
                        transition={{
                          // Ripple delay based on position
                          delay: prefersReducedMotion
                            ? 0
                            : getRippleDelay(rowIndex, colIndex),
                          ...SPRING.snappy,
                        }}
                        onClick={() => handleCellClick(cell)}
                        onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                        onMouseLeave={handleCellLeave}
                        key={`${cell.id}-${animationKey}`}
                      >
                        {cell.percentage !== null
                          ? Math.round(cell.percentage)
                          : 'N/S'}
                      </motion.div>
                    </td>
                  ))}

                  {/* Mini sparkline */}
                  <td>
                    {row.cells[0]?.sectionId && (
                      <MiniSparkline sectionId={row.cells[0].sectionId} threshold={threshold} />
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down detail panel (shared layout animation) */}
      <AnimatePresence>
        {selectedCell && selectedCell.percentage !== null && (
          <DrillDownPanel
            cell={selectedCell}
            threshold={threshold}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  )
}

// Mini sparkline component
function MiniSparkline({ sectionId, threshold }: { sectionId: string; threshold: number }) {
  const prefersReducedMotion = useReducedMotion()
  const trendData = useMemo(() => {
    return getSectionTrend(sectionId).slice(-7).map((t) => t.percentage)
  }, [sectionId])

  const width = 100
  const height = 28
  const maxVal = 100
  const minVal = 0

  const points = trendData.map((val, i) => ({
    x: (i / (trendData.length - 1)) * width,
    y: height - ((val - minVal) / (maxVal - minVal)) * height,
    val,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const thresholdY = height - ((threshold - minVal) / (maxVal - minVal)) * height

  return (
    <svg width={width} height={height} className="sparkline-cell">
      {/* Threshold line */}
      <line
        x1={0}
        y1={thresholdY}
        x2={width}
        y2={thresholdY}
        stroke="var(--line-2)"
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      {/* Animated path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                pathLength: { duration: 0.8, ease: 'easeOut' },
                opacity: { duration: 0.2 },
              }
        }
      />
    </svg>
  )
}

// Drill-down panel with shared layout animation
function DrillDownPanel({
  cell,
  threshold,
  onClose,
}: {
  cell: CellData
  threshold: number
  onClose: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const trendData = useMemo(() => {
    return getSectionTrend(cell.sectionId).slice(-7)
  }, [cell.sectionId])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        layoutId={`cell-${cell.sectionId}`}
        className="bg-surface rounded-xl p-6 shadow-lg border border-line max-w-md w-full m-4"
        onClick={(e) => e.stopPropagation()}
        transition={prefersReducedMotion ? { duration: 0 } : SPRING.morph}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold">{cell.sectionName}</h3>
            <p className="text-sm text-muted">{cell.deptCode} Department</p>
          </div>
          <motion.div
            className={cn(
              'text-3xl font-display font-bold',
              (cell.percentage ?? 0) >= threshold ? 'text-pass' : 'text-fail'
            )}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={SPRING.snappy}
          >
            {Math.round(cell.percentage ?? 0)}%
          </motion.div>
        </div>

        {/* 7-day mini-matrix */}
        <div className="mb-4">
          <p className="text-xs text-muted uppercase tracking-wide mb-2">Last 7 Days</p>
          <div className="flex gap-1">
            {trendData.map((day, index) => (
              <motion.div
                key={day.date}
                className={cn(
                  'flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-mono font-bold',
                  day.percentage >= threshold
                    ? 'bg-pass-cell text-pass-ink'
                    : 'bg-fail-cell text-fail-ink'
                )}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: prefersReducedMotion ? 0 : index * 0.03,
                  ...SPRING.snappy,
                }}
              >
                {Math.round(day.percentage)}
              </motion.div>
            ))}
          </div>
        </div>

        <button
          className="w-full py-2 px-4 bg-ink text-white rounded-lg font-semibold text-sm hover:bg-ink-2 transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  )
}
