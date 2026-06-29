import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  departments,
  getDepartmentDailyStats,
  getCollegeStats,
} from '@/data/store'
import { cn } from '@/lib/utils'

export function DeanRail() {
  const { selectedDate, threshold } = useAppStore()
  const collegeStats = getCollegeStats(selectedDate)

  // Build org tree
  const schools = useMemo(() => {
    const csciDepts = ['ai-ds', 'cse', 'it']
    const engDepts = ['ece', 'mech']

    const getDeptStats = (deptIds: string[]) => {
      const stats = deptIds.map((id) => getDepartmentDailyStats(id, selectedDate))
      const totalPresent = stats.reduce((sum, s) => sum + (s?.totalPresent ?? 0), 0)
      const totalStrength = stats.reduce((sum, s) => sum + (s?.totalStrength ?? 0), 0)
      return totalStrength > 0 ? (totalPresent / totalStrength) * 100 : 0
    }

    return [
      {
        id: 'csci',
        name: 'Computing Sciences',
        percentage: getDeptStats(csciDepts),
        departments: csciDepts.map((id) => {
          const dept = departments.find((d) => d.id === id)!
          const stats = getDepartmentDailyStats(id, selectedDate)
          return {
            id,
            name: dept.name,
            percentage: stats?.averagePercentage ?? 0,
          }
        }),
      },
      {
        id: 'eng',
        name: 'Engineering',
        percentage: getDeptStats(engDepts),
        departments: engDepts.map((id) => {
          const dept = departments.find((d) => d.id === id)!
          const stats = getDepartmentDailyStats(id, selectedDate)
          return {
            id,
            name: dept.name,
            percentage: stats?.averagePercentage ?? 0,
          }
        }),
      },
      { id: 'mgmt', name: 'Management', percentage: 0, departments: [] },
      { id: 'law', name: 'Law', percentage: 0, departments: [] },
      { id: 'arch', name: 'Architecture', percentage: 0, departments: [] },
    ]
  }, [selectedDate])

  return (
    <>
      {/* Header */}
      <div className="rail-header">
        <div className="rail-logo">H</div>
        <div>
          <div className="rail-title">Attendance Console</div>
          <div className="rail-subtitle">HITS · First hour</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="rail-nav">
        <div className="rail-label">Institution</div>

        {/* Root node */}
        <div className="tree-node-content l1 active">
          <span className="tree-node-name">HITS — All Schools</span>
          <span className="tree-node-value">{collegeStats.overallPercentage.toFixed(1)}</span>
        </div>

        {/* Schools */}
        {schools.map((school) => (
          <div key={school.id}>
            <div className="tree-node-content l1">
              <span className="tree-node-name">{school.name}</span>
              {school.percentage > 0 && (
                <span
                  className={cn(
                    'tree-node-status',
                    school.percentage >= threshold ? 'pass' : 'fail'
                  )}
                />
              )}
            </div>

            {/* Departments */}
            {school.departments.map((dept) => (
              <div key={dept.id} className="tree-node-content l2">
                <span className="tree-node-name">{dept.name}</span>
                <span
                  className={cn(
                    'tree-node-status',
                    dept.percentage >= threshold ? 'pass' : 'fail'
                  )}
                />
                <span className="tree-node-value">{Math.round(dept.percentage)}</span>
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="rail-footer">
        <div className="rail-avatar">DA</div>
        <span>Dr. A. Geetha · Dean Academics</span>
      </div>
    </>
  )
}
