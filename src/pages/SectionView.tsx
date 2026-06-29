import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { AttendanceRing } from '@/components/widgets/AttendanceRing'
import { SingleSectionTrend } from '@/components/widgets/SingleSectionTrend'
import { ManualAbsentEntry } from '@/components/widgets/ManualAbsentEntry'
import { getSectionById, getDepartmentById } from '@/data/store'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function SectionView() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const prefersReducedMotion = useReducedMotion()
  const [refreshKey, setRefreshKey] = useState(0)

  if (!sectionId) {
    return <Navigate to="/" replace />
  }

  const section = getSectionById(sectionId)

  if (!section) {
    return <Navigate to="/" replace />
  }

  const department = getDepartmentById(section.departmentId)

  if (!department) {
    return <Navigate to="/" replace />
  }

  const handleManualEntrySubmit = () => {
    // Force a refresh of the components that depend on attendance data
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <motion.div
      key={refreshKey}
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? {} : { opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-6">
        <Breadcrumb departmentId={department.id} sectionId={sectionId} />
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
          {department.code} Section {section.name}
        </h1>
        <p className="text-sm text-muted">
          Class advisor: {section.advisor} | Strength: {section.strength}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Ring */}
        <div>
          <AttendanceRing sectionId={sectionId} />
        </div>

        {/* Manual Entry - class-level, no roll numbers needed */}
        <div>
          <ManualAbsentEntry sectionId={sectionId} onSubmit={handleManualEntrySubmit} />
        </div>

        {/* Placeholder for session status display */}
        <div>
          {/* Will show recorded/no_session/pending status once contract shapes arrive */}
        </div>

        {/* Section Trend - spans 2 columns */}
        <div className="lg:col-span-2">
          <SingleSectionTrend sectionId={sectionId} />
        </div>

        {/* Placeholder */}
        <div>
          {/* Additional class-level info can go here */}
        </div>
      </div>
    </motion.div>
  )
}
