import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  departments,
  sections,
  getCollegeStats,
  getAllDepartmentStats,
  getDailyClassAttendance,
  getChronicOffenders,
  getBiggestSingleDayDrop,
  getSectionTrend,
} from '@/data/store'
import { cn } from '@/lib/utils'

// Simple sparkline component
function Sparkline({ data, threshold = 75 }: { data: number[]; threshold?: number }) {
  const height = 28
  const width = 100
  const max = 100
  const min = 0

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((value - min) / (max - min)) * height
    return `${x},${y}`
  }).join(' ')

  const thresholdY = height - ((threshold - min) / (max - min)) * height

  return (
    <svg width={width} height={height} className="sparkline-cell">
      <line
        x1={0}
        y1={thresholdY}
        x2={width}
        y2={thresholdY}
        stroke="var(--line-2)"
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function DeanView() {
  const { selectedDate, threshold } = useAppStore()
  const collegeStats = getCollegeStats(selectedDate)
  const deptStats = getAllDepartmentStats(selectedDate)

  // Ranked departments
  const rankedDepts = useMemo(() => {
    return [...deptStats]
      .sort((a, b) => b.averagePercentage - a.averagePercentage)
      .map((stat, index) => {
        const dept = departments.find((d) => d.id === stat.departmentId)
        return {
          ...stat,
          rank: index + 1,
          name: dept?.name ?? stat.departmentId,
          code: dept?.code ?? stat.departmentId.toUpperCase(),
        }
      })
  }, [deptStats])

  // Chronic offenders
  const chronicOffenders = useMemo(() => getChronicOffenders(3, threshold), [threshold])

  // Biggest drop
  const biggestDrop = useMemo(() => getBiggestSingleDayDrop(selectedDate), [selectedDate])

  // Build matrix data (Dept × Section grid)
  const matrixData = useMemo(() => {
    return departments.map((dept) => {
      const deptSections = sections.filter((s) => s.departmentId === dept.id)
      const deptStat = deptStats.find((s) => s.departmentId === dept.id)

      return {
        dept,
        deptAvg: deptStat?.averagePercentage ?? 0,
        sections: deptSections.map((section) => {
          const attendance = getDailyClassAttendance(section.id, selectedDate)
          const trend = getSectionTrend(section.id).slice(-7)
          return {
            section,
            percentage: attendance?.percentage ?? null,
            present: attendance?.present ?? 0,
            strength: section.strength,
            trend: trend.map((t) => t.percentage),
          }
        }),
      }
    })
  }, [deptStats, selectedDate])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="view-title">Institution Overview</h1>
        <p className="view-subtitle">All departments · {selectedDate}</p>
      </div>

      {/* Hero Cards */}
      <div className="hero-grid dean">
        {/* Lead card - Overall attendance */}
        <div className="hero-card lead">
          <div className="hero-card-label">Overall Attendance</div>
          <div className={cn(
            'hero-big',
            collegeStats.overallPercentage >= threshold ? 'pass' : 'fail'
          )}>
            {collegeStats.overallPercentage.toFixed(1)}<small>%</small>
          </div>
          <div className="hero-meta">
            {collegeStats.totalPresent} / {collegeStats.totalStrength} students
          </div>
        </div>

        {/* Below threshold */}
        <div className="hero-card">
          <div className="hero-card-label">Below {threshold}%</div>
          <div className={cn(
            'hero-big',
            collegeStats.classesBelow75Count > 0 ? 'fail' : ''
          )}>
            {collegeStats.classesBelow75Count}
          </div>
          <div className="hero-meta">
            of {collegeStats.totalClasses} classes
          </div>
        </div>

        {/* Departments below */}
        <div className="hero-card">
          <div className="hero-card-label">Depts Below {threshold}%</div>
          <div className={cn(
            'hero-big',
            rankedDepts.filter((d) => d.averagePercentage < threshold).length > 0 ? 'fail' : ''
          )}>
            {rankedDepts.filter((d) => d.averagePercentage < threshold).length}
          </div>
          <div className="hero-meta">
            of {departments.length} departments
          </div>
        </div>

        {/* Biggest drop */}
        <div className="hero-card">
          <div className="hero-card-label">Biggest Drop</div>
          {biggestDrop ? (
            <>
              <div className="hero-big fail">
                -{biggestDrop.drop.toFixed(0)}<small>%</small>
              </div>
              <div className="hero-meta">
                {biggestDrop.section.name} ({biggestDrop.department.code})
              </div>
            </>
          ) : (
            <>
              <div className="hero-big">—</div>
              <div className="hero-meta">No significant drops</div>
            </>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        {/* Matrix Panel */}
        <div className="panel no-pad">
          <div className="panel-header in-pad">
            <span className="panel-title">Department × Section Matrix</span>
            <span className="panel-subtitle">{threshold}% threshold</span>
          </div>
          <div className="overflow-x-auto">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="left">Department</th>
                  <th>Avg</th>
                  {Array.from({ length: 5 }, (_, i) => (
                    <th key={i}>Sec {String.fromCharCode(65 + i)}</th>
                  ))}
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.map((row) => (
                  <tr key={row.dept.id}>
                    <td>
                      <div className="matrix-row-name">
                        {row.dept.name}
                        <span className="matrix-row-strength">
                          {row.sections.reduce((sum, s) => sum + s.strength, 0)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={cn(
                        'matrix-cell avg',
                        row.deptAvg >= threshold ? 'pass' : 'fail'
                      )}>
                        {Math.round(row.deptAvg)}
                      </div>
                    </td>
                    {Array.from({ length: 5 }, (_, i) => {
                      const section = row.sections[i]
                      if (!section) {
                        return (
                          <td key={i}>
                            <div className="matrix-cell none">—</div>
                          </td>
                        )
                      }
                      return (
                        <td key={i}>
                          <div className={cn(
                            'matrix-cell',
                            section.percentage === null
                              ? 'none'
                              : section.percentage >= threshold
                              ? 'pass'
                              : 'fail'
                          )}>
                            {section.percentage !== null ? Math.round(section.percentage) : 'N/S'}
                          </div>
                        </td>
                      )
                    })}
                    <td>
                      {row.sections[0] && (
                        <Sparkline data={row.sections[0].trend} threshold={threshold} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Department Leaderboard */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Department Rankings</span>
            </div>
            <div className="ranked-list">
              {rankedDepts.map((dept) => (
                <div key={dept.departmentId} className="ranked-row">
                  <span className="ranked-num">{dept.rank}</span>
                  <span className="ranked-name">{dept.code}</span>
                  <div className="ranked-bar">
                    <span
                      className="ranked-bar-fill"
                      style={{
                        width: `${dept.averagePercentage}%`,
                        background: dept.averagePercentage >= threshold
                          ? 'var(--pass)'
                          : 'var(--fail)',
                      }}
                    />
                  </div>
                  <span className={cn(
                    'ranked-value',
                    dept.averagePercentage >= threshold ? 'pass' : 'fail'
                  )}>
                    {Math.round(dept.averagePercentage)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chronic Offenders */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Chronic Below {threshold}%</span>
              <span className="panel-subtitle">3+ days</span>
            </div>
            {chronicOffenders.length === 0 ? (
              <p className="text-muted text-sm">No chronic offenders</p>
            ) : (
              <div className="space-y-2">
                {chronicOffenders.slice(0, 5).map((offender) => (
                  <div key={offender.sectionId} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-semibold text-sm">{offender.section.name}</div>
                      <div className="text-xs text-muted">{offender.department.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="stat-tag fail">
                        {offender.consecutiveDaysBelow75} days
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
