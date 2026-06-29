import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  getDepartmentById,
  getSectionsByDepartment,
  getDailyClassAttendance,
  getDepartmentDailyStats,
  getAllDepartmentStats,
  getDepartmentTrend,
} from '@/data/store'
import { cn } from '@/lib/utils'

// Simple trend chart
function TrendChart({ data, threshold = 75 }: { data: Array<{ date: string; percentage: number }>; threshold?: number }) {
  const height = 80
  const width = 280
  const padding = { top: 10, right: 10, bottom: 20, left: 30 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth
    const y = padding.top + chartHeight - (d.percentage / 100) * chartHeight
    return { x, y, value: d.percentage, date: d.date }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const thresholdY = padding.top + chartHeight - (threshold / 100) * chartHeight

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Threshold line */}
      <line
        x1={padding.left}
        y1={thresholdY}
        x2={width - padding.right}
        y2={thresholdY}
        stroke="var(--line-2)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <text x={padding.left - 5} y={thresholdY + 3} fontSize={9} fill="var(--muted)" textAnchor="end">
        {threshold}%
      </text>

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={p.value >= threshold ? 'var(--pass)' : 'var(--fail)'}
        />
      ))}
    </svg>
  )
}

export function HodView() {
  const { selectedDate, threshold } = useAppStore()

  // Mock HOD's department (in real app, comes from auth)
  const myDeptId = 'cse'
  const myDept = getDepartmentById(myDeptId)
  const mySections = getSectionsByDepartment(myDeptId)
  const myStats = getDepartmentDailyStats(myDeptId, selectedDate)

  // Get trend data
  const trendData = useMemo(() => getDepartmentTrend(myDeptId).slice(-10), [])

  // Peer comparison
  const peerComparison = useMemo(() => {
    const allStats = getAllDepartmentStats(selectedDate)
    return [...allStats]
      .sort((a, b) => b.averagePercentage - a.averagePercentage)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1,
        isMe: stat.departmentId === myDeptId,
        name: getDepartmentById(stat.departmentId)?.name ?? stat.departmentId,
        code: getDepartmentById(stat.departmentId)?.code ?? stat.departmentId.toUpperCase(),
      }))
  }, [selectedDate])

  // Sections with stats
  const sectionStats = useMemo(() => {
    return mySections.map((section) => {
      const attendance = getDailyClassAttendance(section.id, selectedDate)
      return {
        id: section.id,
        name: section.name,
        advisor: section.advisor,
        strength: section.strength,
        percentage: attendance?.percentage ?? 0,
        present: attendance?.present ?? 0,
        absent: attendance?.absent ?? 0,
        reported: attendance !== null,
        // Mock timestamp - in real app this would come from the record
        reportedAt: attendance ? '08:45' : null,
      }
    })
  }, [mySections, selectedDate])

  const pendingCount = sectionStats.filter((s) => !s.reported).length
  const belowThresholdCount = sectionStats.filter((s) => s.percentage < threshold && s.reported).length

  const myRank = peerComparison.find((d) => d.isMe)?.rank ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="view-title">{myDept?.name ?? 'Department'}</h1>
        <p className="view-subtitle">HOD Dashboard · {selectedDate}</p>
      </div>

      {/* Hero Cards */}
      <div className="hero-grid hod">
        {/* Lead card - Department attendance */}
        <div className="hero-card lead">
          <div className="hero-card-label">Department Attendance</div>
          <div className={cn(
            'hero-big',
            (myStats?.averagePercentage ?? 0) >= threshold ? 'pass' : 'fail'
          )}>
            {(myStats?.averagePercentage ?? 0).toFixed(1)}<small>%</small>
          </div>
          <div className="hero-meta">
            {myStats?.totalPresent ?? 0} / {myStats?.totalStrength ?? 0} students
          </div>
          <div className="stat-tags">
            <span className="stat-tag pass">Rank #{myRank}</span>
            {belowThresholdCount > 0 && (
              <span className="stat-tag fail">{belowThresholdCount} below 75%</span>
            )}
          </div>
        </div>

        {/* Sections below threshold */}
        <div className="hero-card">
          <div className="hero-card-label">Below {threshold}%</div>
          <div className={cn(
            'hero-big',
            belowThresholdCount > 0 ? 'fail' : ''
          )}>
            {belowThresholdCount}
          </div>
          <div className="hero-meta">
            of {mySections.length} sections
          </div>
        </div>

        {/* Reporting compliance */}
        <div className="hero-card">
          <div className="hero-card-label">Reporting Status</div>
          <div className={cn(
            'hero-big',
            pendingCount > 0 ? 'warn' : 'pass'
          )}>
            {sectionStats.length - pendingCount}/{sectionStats.length}
          </div>
          <div className="hero-meta">
            {pendingCount === 0 ? 'All reported' : `${pendingCount} pending`}
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr 380px' }}>
        {/* Left column */}
        <div className="space-y-4">
          {/* Sections List */}
          <div className="panel no-pad">
            <div className="panel-header in-pad">
              <span className="panel-title">My Sections Today</span>
              <span className="panel-subtitle">{sectionStats.length} sections</span>
            </div>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="left">Section</th>
                  <th>Advisor</th>
                  <th>Strength</th>
                  <th>Present</th>
                  <th>%</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sectionStats.map((section) => (
                  <tr key={section.id}>
                    <td>
                      <div className="matrix-row-name">{section.name}</div>
                    </td>
                    <td className="text-center text-sm text-muted">{section.advisor}</td>
                    <td className="text-center font-data text-sm">{section.strength}</td>
                    <td className="text-center font-data text-sm">
                      {section.reported ? section.present : '—'}
                    </td>
                    <td>
                      {section.reported ? (
                        <div className={cn(
                          'matrix-cell',
                          section.percentage >= threshold ? 'pass' : 'fail'
                        )}>
                          {Math.round(section.percentage)}
                        </div>
                      ) : (
                        <div className="matrix-cell none">—</div>
                      )}
                    </td>
                    <td className="text-center">
                      {section.reported ? (
                        <span className="compliance-status ok">{section.reportedAt}</span>
                      ) : (
                        <span className="compliance-status pending">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Department Trend */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">10-Day Trend</span>
            </div>
            <TrendChart data={trendData} threshold={threshold} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Peer Comparison */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Peer Departments</span>
              <span className="panel-subtitle">Today's ranking</span>
            </div>
            <div className="comparison-list">
              {peerComparison.map((dept) => (
                <div key={dept.departmentId} className={cn('comparison-row', dept.isMe && 'me')}>
                  <div className="comparison-name">
                    {dept.code}
                    {dept.isMe && <span className="me-flag">YOU</span>}
                    <span className="comparison-tag">#{dept.rank}</span>
                  </div>
                  <div className="comparison-track">
                    <div
                      className={cn(
                        'comparison-fill',
                        dept.isMe ? 'me' : dept.averagePercentage >= threshold ? 'pass' : 'fail'
                      )}
                      style={{ width: `${dept.averagePercentage}%` }}
                    />
                    <div className="comparison-threshold" style={{ left: `${threshold}%` }} />
                  </div>
                  <span className="comparison-value">{Math.round(dept.averagePercentage)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reporting Compliance */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Reporting Compliance</span>
              <span className="panel-subtitle">First hour status</span>
            </div>
            <div>
              {sectionStats.map((section) => (
                <div key={section.id} className="compliance-row">
                  <div className="compliance-label">
                    {section.name}
                    <span className="text-xs text-muted">· {section.advisor}</span>
                  </div>
                  {section.reported ? (
                    <span className="compliance-status ok">{section.reportedAt}</span>
                  ) : (
                    <span className="compliance-status pending">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
