import { motion } from 'motion/react'
import { InstrumentBar } from './InstrumentBar'
import { HeroMatrix } from './HeroMatrix'
import { ComparisonStrip } from './ComparisonStrip'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function WorkZone() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <>
      {/* Top Instrument Bar */}
      <InstrumentBar />

      {/* Main Canvas */}
      <div className="work-canvas">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {/* Page Header */}
          <div className="mb-6">
            <h2 className="font-display text-xl text-ink">College Overview</h2>
            <p className="text-sm text-muted mt-1">
              First-hour attendance across all schools · 14 sections reporting
            </p>
          </div>

          {/* Hero Matrix - Department x Section */}
          <HeroMatrix />

          {/* Department Comparison Strip */}
          <ComparisonStrip />
        </motion.div>
      </div>
    </>
  )
}
