import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  getSectionById,
  getDailyClassAttendance,
} from '@/data/store'
import { cn } from '@/lib/utils'

export function TeacherRail() {
  const { selectedDate, threshold } = useAppStore()

  // Mock teacher's assigned classes (in real app, comes from auth)
  const myClassIds = ['cse-a']
  const myClasses = myClassIds.map((id) => getSectionById(id)).filter(Boolean)

  // Get stats for my classes
  const classStats = useMemo(() => {
    return myClasses.map((cls) => {
      if (!cls) return null
      const attendance = getDailyClassAttendance(cls.id, selectedDate)
      return {
        id: cls.id,
        name: cls.name,
        percentage: attendance?.percentage ?? 0,
        present: attendance?.present ?? 0,
        absent: attendance?.absent ?? 0,
        strength: cls.strength,
        submitted: attendance !== null,
      }
    }).filter(Boolean) as Array<{
      id: string
      name: string
      percentage: number
      present: number
      absent: number
      strength: number
      submitted: boolean
    }>
  }, [myClasses, selectedDate])

  const allSubmitted = classStats.every((c) => c.submitted)
  const pendingCount = classStats.filter((c) => !c.submitted).length

  return (
    <>
      {/* Header */}
      <div className="rail-header">
        <div className="rail-logo">H</div>
        <div>
          <div className="rail-title">Attendance Console</div>
          <div className="rail-subtitle">Teacher · First hour</div>
        </div>
      </div>

      {/* Status Card */}
      <div className="rail-card">
        <div className="rail-card-label">Today's Status</div>
        <div className={cn(
          'rail-card-value',
          allSubmitted ? 'text-pass' : 'text-warn'
        )}>
          {allSubmitted ? 'Done' : `${pendingCount} Pending`}
        </div>
        <div className="rail-card-sub">
          {classStats.length} class{classStats.length !== 1 ? 'es' : ''} assigned
        </div>
      </div>

      {/* Navigation */}
      <nav className="rail-nav">
        <div className="rail-label">My Classes</div>

        {/* Classes */}
        {classStats.map((cls) => (
          <div key={cls.id} className="tree-node-content l1 active">
            <span className="tree-node-name">{cls.name}</span>
            {cls.submitted ? (
              <>
                <span
                  className={cn(
                    'tree-node-status',
                    cls.percentage >= threshold ? 'pass' : 'fail'
                  )}
                />
                <span className="tree-node-value">{Math.round(cls.percentage)}</span>
              </>
            ) : (
              <span className="text-[10px] text-warn font-semibold">ENTRY NEEDED</span>
            )}
          </div>
        ))}

        {classStats.length === 0 && (
          <div className="text-chrome-muted text-xs px-3 py-4">
            No classes assigned
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="rail-footer">
        <div className="rail-avatar">PR</div>
        <span>Prof. R. Prakash · CSE</span>
      </div>
    </>
  )
}
