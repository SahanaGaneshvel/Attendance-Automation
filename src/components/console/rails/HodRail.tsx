import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  getSectionsByDepartment,
  getDepartmentById,
  getDailyClassAttendance,
  getDepartmentDailyStats,
  getAllDepartmentStats,
} from '@/data/store'
import { cn } from '@/lib/utils'

export function HodRail() {
  const { selectedDate, threshold } = useAppStore()

  // Mock HOD's department (in real app, comes from auth)
  const myDeptId = 'cse'
  const myDept = getDepartmentById(myDeptId)
  const sections = getSectionsByDepartment(myDeptId)
  const deptStats = getDepartmentDailyStats(myDeptId, selectedDate)

  // Calculate department rank among peers
  const deptRank = useMemo(() => {
    const allStats = getAllDepartmentStats(selectedDate)
    const sorted = [...allStats].sort((a, b) => b.averagePercentage - a.averagePercentage)
    const myIndex = sorted.findIndex((s) => s.departmentId === myDeptId)
    return {
      rank: myIndex + 1,
      total: sorted.length,
    }
  }, [selectedDate])

  // Build sections with stats
  const sectionStats = useMemo(() => {
    return sections.map((section) => {
      const attendance = getDailyClassAttendance(section.id, selectedDate)
      return {
        id: section.id,
        name: section.name,
        percentage: attendance?.percentage ?? 0,
        present: attendance?.present ?? 0,
        strength: section.strength,
        reported: attendance !== null,
      }
    })
  }, [sections, selectedDate])

  const pendingCount = sectionStats.filter((s) => !s.reported).length
  const belowThresholdCount = sectionStats.filter((s) => s.percentage < threshold).length

  return (
    <>
      {/* Header */}
      <div className="rail-header">
        <div className="rail-logo">H</div>
        <div>
          <div className="rail-title">Attendance Console</div>
          <div className="rail-subtitle">{myDept?.name ?? 'Department'} · HOD View</div>
        </div>
      </div>

      {/* Department Rank Card */}
      <div className="rail-card">
        <div className="rail-card-label">Department Rank</div>
        <div className="rail-card-value">
          #{deptRank.rank}<small className="text-chrome-muted text-sm font-normal">/{deptRank.total}</small>
        </div>
        <div className="rail-card-sub">
          {deptStats?.averagePercentage.toFixed(1)}% today
        </div>
      </div>

      {/* Status Card */}
      <div className="rail-card">
        <div className="rail-card-label">Today's Status</div>
        <div className="flex items-center gap-3 mt-1">
          <div>
            <span className={cn(
              'rail-card-value text-xl',
              belowThresholdCount > 0 ? 'text-fail' : 'text-pass'
            )}>
              {belowThresholdCount}
            </span>
            <span className="text-xs text-chrome-muted ml-1">below 75%</span>
          </div>
          <div className="w-px h-6 bg-chrome-line" />
          <div>
            <span className={cn(
              'rail-card-value text-xl',
              pendingCount > 0 ? 'text-warn' : 'text-pass'
            )}>
              {pendingCount}
            </span>
            <span className="text-xs text-chrome-muted ml-1">pending</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="rail-nav">
        <div className="rail-label">My Sections</div>

        {/* Sections */}
        {sectionStats.map((section) => (
          <div key={section.id} className="tree-node-content l1">
            <span className="tree-node-name">{section.name}</span>
            {section.reported ? (
              <>
                <span
                  className={cn(
                    'tree-node-status',
                    section.percentage >= threshold ? 'pass' : 'fail'
                  )}
                />
                <span className="tree-node-value">{Math.round(section.percentage)}</span>
              </>
            ) : (
              <span className="text-[10px] text-warn font-semibold">PENDING</span>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="rail-footer">
        <div className="rail-avatar">SK</div>
        <span>Dr. S. Kumar · HOD {myDept?.code ?? ''}</span>
      </div>
    </>
  )
}
