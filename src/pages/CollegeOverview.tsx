import { motion } from 'motion/react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { KPIRow } from '@/components/widgets/KPIRow'
import { AttendanceHeatmap } from '@/components/widgets/AttendanceHeatmap'
import { DepartmentComparison } from '@/components/widgets/DepartmentComparison'
import { CollegeTrend } from '@/components/widgets/CollegeTrend'
import { AttendanceDistribution } from '@/components/widgets/AttendanceDistribution'
import { ChronicOffenders } from '@/components/widgets/ChronicOffenders'
import { BiggestMovers } from '@/components/widgets/BiggestMovers'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function CollegeOverview() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? {} : { opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-6">
        <Breadcrumb />
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">College Overview</h1>
        <p className="text-sm text-muted">First-hour attendance across all departments</p>
      </div>

      {/* KPI Row */}
      <section className="mb-6">
        <KPIRow />
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Heatmap - spans 2 columns */}
        <div className="lg:col-span-2">
          <AttendanceHeatmap />
        </div>

        {/* Department Comparison */}
        <div>
          <DepartmentComparison />
        </div>

        {/* College Trend - spans 2 columns */}
        <div className="lg:col-span-2">
          <CollegeTrend />
        </div>

        {/* Distribution */}
        <div>
          <AttendanceDistribution />
        </div>

        {/* Chronic Offenders */}
        <div>
          <ChronicOffenders />
        </div>

        {/* Biggest Movers */}
        <div>
          <BiggestMovers />
        </div>

        {/* Compliance widget will go here once contract shapes arrive */}
        <div>
          {/* Placeholder for ComplianceView - classes that haven't reported today */}
        </div>
      </div>
    </motion.div>
  )
}
