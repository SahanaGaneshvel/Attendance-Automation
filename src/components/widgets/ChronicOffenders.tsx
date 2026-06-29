import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getChronicOffenders } from '@/data/store'
import { useAppStore } from '@/store/appStore'
import { formatPercent } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function ChronicOffenders() {
  const navigate = useNavigate()
  const { threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const offenders = getChronicOffenders(3, threshold)

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warn" />
          <CardTitle className="text-base">Chronic Offenders</CardTitle>
        </div>
        <p className="text-sm text-muted">Classes below {threshold}% for 3+ consecutive days</p>
      </CardHeader>
      <CardContent>
        {offenders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-pass-bg p-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-pass" />
            </div>
            <p className="text-sm font-medium text-ink">No chronic offenders</p>
            <p className="text-xs text-muted mt-1">All classes meeting threshold consistently</p>
          </div>
        ) : (
          <div className="space-y-2">
            {offenders.map((offender, index) => (
              <motion.button
                key={offender.sectionId}
                onClick={() => navigate(`/section/${offender.sectionId}`)}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-fail-bg/50 hover:bg-fail-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                <div className="text-left">
                  <p className="font-medium text-ink">
                    {offender.department.code} Section {offender.section.name}
                  </p>
                  <p className="text-xs text-muted">
                    {offender.consecutiveDaysBelow75} consecutive days
                  </p>
                </div>
                <Badge variant="fail">
                  {formatPercent(offender.currentPercentage, 0)}
                </Badge>
              </motion.button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
