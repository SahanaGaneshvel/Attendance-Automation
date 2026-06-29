import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { DepartmentKPIs } from '@/components/widgets/DepartmentKPIs'
import { SectionsRanked } from '@/components/widgets/SectionsRanked'
import { SectionTrends } from '@/components/widgets/SectionTrends'
import { getDepartmentById } from '@/data/store'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function DepartmentView() {
  const { departmentId } = useParams<{ departmentId: string }>()
  const prefersReducedMotion = useReducedMotion()

  if (!departmentId) {
    return <Navigate to="/" replace />
  }

  const department = getDepartmentById(departmentId)

  if (!department) {
    return <Navigate to="/" replace />
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? {} : { opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-6">
        <Breadcrumb departmentId={departmentId} />
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
          {department.name}
        </h1>
        <p className="text-sm text-muted">Department attendance overview</p>
      </div>

      {/* KPIs */}
      <section className="mb-6">
        <DepartmentKPIs departmentId={departmentId} />
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sections Ranked */}
        <SectionsRanked departmentId={departmentId} />

        {/* Compliance placeholder - classes pending today */}
        <div>
          {/* Placeholder for ComplianceView scoped to this department */}
        </div>

        {/* Section Trends - full width */}
        <div className="lg:col-span-2">
          <SectionTrends departmentId={departmentId} />
        </div>
      </div>
    </motion.div>
  )
}
