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
import type { DeanDepartmentHeatmap } from '@/api'
import { cn } from '@/lib/utils'
import { SPRING, TIMING, getRippleDelay } from '@/lib/motion'

interface CellData {
  id: string
  sectionId: string
  deptId: string
  sectionName: string
  deptCode: string
  percentage: number | null
  present: number | null
  strength: number | null
  status: 'recorded' | 'no_session' | 'pending' | 'empty'
  row: number
  col: number
}

interface HeatmapProps {
  onDrillDown?: (sectionId: string) => void
  apiData?: DeanDepartmentHeatmap[]
}

export function AnimatedHeatmap({ onDrillDown, apiData }: HeatmapProps) {
  const { selectedDate, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null)
  const [animationKey, setAnimationKey] = useState(0)

  // Build matrix data - use API data if provided, otherwise fall back to mock.
  // Column count is derived from the data itself (max sections any dept actually
  // has), never a hardcoded number — this is what keeps phantom columns out.
  const matrixData = useMemo(() => {
    if (apiData && apiData.length > 0) {
      const rows = apiData.slice(0, 6)
      const maxCols = Math.max(1, ...rows.map((d) => d.sections.length))

      return rows.map((dept, rowIndex) => {
        const cells: CellData[] = dept.sections.map((section, colIndex) => ({
          id: `${dept.department_id}-${section.section_id}`,
          sectionId: String(section.section_id),
          deptId: String(dept.department_id),
          sectionName: section.name,
          deptCode: dept.department_code,
          percentage: section.percentage,
          present: null,
          strength: null,
          status: section.status,
          row: rowIndex,
          col: colIndex,
        }))

        while (cells.length < maxCols) {
          cells.push({
            id: `${dept.department_id}-empty-${cells.length}`,
            sectionId: '',
            deptId: String(dept.department_id),
            sectionName: '',
            deptCode: dept.department_code,
            percentage: null,
            present: null,
            strength: null,
            status: 'empty',
            row: rowIndex,
            col: cells.length,
          })
        }

        const totalStrength = dept.sections.reduce((sum, s) => sum + s.strength, 0)

        return {
          dept: {
            id: String(dept.department_id),
            name: dept.department_name,
            code: dept.department_code,
          },
          deptStats: { averagePercentage: dept.percentage },
          totalStrength,
          cells,
          colCount: maxCols,
        }
      })
    }

    // Fall back to mock data
    const deptList = departments.slice(0, 6)
    const deptSectionLists = deptList.map((dept) => sections.filter((s) => s.departmentId === dept.id))
    const maxCols = Math.max(1, ...deptSectionLists.map((list) => list.length))

    return deptList.map((dept, rowIndex) => {
      const deptSections = deptSectionLists[rowIndex]
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
          present: attendance?.present ?? null,
          strength: attendance?.strength ?? section.strength,
          status: attendance?.status ?? 'pending',
          row: rowIndex,
          col: colIndex,
        }
      })

      while (cells.length < maxCols) {
        cells.push({
          id: `${dept.id}-empty-${cells.length}`,
          sectionId: '',
          deptId: dept.id,
          sectionName: '',
          deptCode: dept.code,
          percentage: null,
          present: null,
          strength: null,
          status: 'empty',
          row: rowIndex,
          col: cells.length,
        })
      }

      const totalStrength = deptSections.reduce((sum, s) => sum + s.strength, 0)

      return { dept, deptStats, totalStrength, cells, colCount: maxCols }
    })
  }, [selectedDate, apiData])

  const colCount = matrixData[0]?.colCount ?? 0
  const colLetters = Array.from({ length: colCount }, (_, i) => String.fromCharCode(65 + i))

  // Trigger ripple animation on date change
  useMemo(() => {
    setAnimationKey((k) => k + 1)
  }, [selectedDate, threshold])

  const handleCellClick = useCallback((cell: CellData) => {
    if (cell.status !== 'recorded') return
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

  // Helper to get cell display
  const getCellDisplay = (cell: CellData) => {
    if (cell.status === 'empty') return ''
    if (cell.status === 'no_session') return 'NS'
    if (cell.status === 'pending') return 'PEND'
    if (cell.percentage !== null) return Math.round(cell.percentage)
    return ''
  }

  const getCellClass = (cell: CellData) => {
    if (cell.status === 'empty') return 'empty'
    if (cell.status === 'no_session') return 'nosession'
    if (cell.status === 'pending' || cell.percentage === null) return 'pending'
    return cell.percentage >= threshold ? 'pass' : 'fail'
  }

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
                <th className="left sticky-col">Department</th>
                <th>Avg</th>
                {colLetters.map((letter, colIndex) => (
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
                  <td className="sticky-col">
                    <div className="matrix-row-name">
                      {row.dept.name}
                      <span className="matrix-row-strength">
                        {row.totalStrength}
                      </span>
                    </div>
                  </td>

                  {/* Department average */}
                  <td>
                    <motion.div
                      className={cn(
                        'matrix-cell avg',
                        (row.deptStats?.averagePercentage ?? 0) >= threshold ? 'pass' : 'fail',
                        (row.deptStats === null || row.deptStats?.averagePercentage === null) && 'none'
                      )}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: prefersReducedMotion ? 0 : rowIndex * TIMING.stagger * 2,
                        ...SPRING.snappy,
                      }}
                    >
                      {row.deptStats?.averagePercentage != null
                        ? Math.round(row.deptStats.averagePercentage)
                        : '-'}
                    </motion.div>
                  </td>

                  {/* Section cells */}
                  {row.cells.map((cell, colIndex) => {
                    const isEmpty = cell.status === 'empty'
                    const isInteractive = cell.status === 'recorded'
                    return (
                      <td key={cell.id}>
                        {isEmpty ? (
                          <div className="matrix-cell empty" aria-hidden="true" />
                        ) : (
                          <motion.div
                            layoutId={cell.sectionId ? `cell-${cell.sectionId}` : undefined}
                            className={cn(
                              'matrix-cell',
                              getCellClass(cell),
                              isCellHighlighted(rowIndex, colIndex) && 'ring-2 ring-accent'
                            )}
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={isInteractive ? { y: -1, boxShadow: 'var(--panel-shadow-lg)' } : undefined}
                            transition={{
                              delay: prefersReducedMotion ? 0 : getRippleDelay(rowIndex, colIndex),
                              ...SPRING.snappy,
                            }}
                            onClick={() => handleCellClick(cell)}
                            onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                            onMouseLeave={handleCellLeave}
                            key={`${cell.id}-${animationKey}`}
                          >
                            <span className="matrix-cell-value">{getCellDisplay(cell)}</span>
                            {isInteractive && cell.present !== null && cell.strength !== null && (
                              <span className="matrix-cell-sub">{cell.present}/{cell.strength}</span>
                            )}
                          </motion.div>
                        )}
                      </td>
                    )
                  })}

                  {/* Mini sparkline */}
                  <td>
                    {row.cells[0]?.sectionId && !apiData && (
                      <MiniSparkline sectionId={row.cells[0].sectionId} threshold={threshold} />
                    )}
                    {apiData && (
                      <div className="text-xs text-muted">-</div>
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
        {selectedCell && selectedCell.status === 'recorded' && (
          <DrillDownPanel
            cell={selectedCell}
            threshold={threshold}
            onClose={() => setSelectedCell(null)}
            useApiData={!!apiData}
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
  useApiData,
}: {
  cell: CellData
  threshold: number
  onClose: () => void
  useApiData: boolean
}) {
  const prefersReducedMotion = useReducedMotion()
  const trendData = useMemo(() => {
    if (useApiData) {
      // When using API data, we don't have trend data per section yet
      return []
    }
    return getSectionTrend(cell.sectionId).slice(-7)
  }, [cell.sectionId, useApiData])

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

        {/* 7-day mini-matrix - only show if we have trend data */}
        {trendData.length > 0 && (
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
        )}

        {useApiData && (
          <div className="mb-4 text-sm text-muted">
            <p>Status: <span className="capitalize">{cell.status}</span></p>
          </div>
        )}

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
