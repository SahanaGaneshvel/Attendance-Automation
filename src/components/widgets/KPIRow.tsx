import { KPICard } from './KPICard'
import { useAppStore } from '@/store/appStore'
import {
  getCollegeStatsWithDelta,
  getBiggestSingleDayDrop,
  getSparklineData,
  sections,
} from '@/data/store'

export function KPIRow() {
  const { selectedDate, threshold } = useAppStore()

  const stats = getCollegeStatsWithDelta(selectedDate)
  const biggestDrop = getBiggestSingleDayDrop(selectedDate)
  const collegeSparkline = getSparklineData('college')

  const classesBelow75Names = stats.classesBelow75
    .slice(0, 3)
    .map((c) => c.sectionId.toUpperCase().replace('-', ' '))
    .join(', ')
  const moreCount = Math.max(0, stats.classesBelow75Count - 3)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Overall Attendance Today"
        value={stats.overallPercentage}
        isPercentage
        delta={stats.delta}
        deltaLabel="vs yesterday"
        sparklineData={collegeSparkline}
        threshold={threshold}
        colorByThreshold
        index={0}
      />

      <KPICard
        title="Classes Below 75%"
        value={stats.classesBelow75Count}
        subtitle={
          stats.classesBelow75Count > 0
            ? `${classesBelow75Names}${moreCount > 0 ? ` +${moreCount} more` : ''}`
            : 'All classes meeting threshold'
        }
        index={1}
      />

      <KPICard
        title="Total Sections"
        value={sections.length}
        subtitle={`${stats.totalClasses} reporting today`}
        index={2}
      />

      <KPICard
        title="Biggest Single-Day Drop"
        value={biggestDrop?.drop ?? 0}
        suffix="%"
        subtitle={
          biggestDrop
            ? `${biggestDrop.department.code} Section ${biggestDrop.section.name}`
            : 'No significant drops'
        }
        index={3}
      />
    </div>
  )
}
