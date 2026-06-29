import { motion } from 'motion/react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkline } from './Sparkline'
import { useCountUp } from '@/hooks/useCountUp'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn, formatPercent } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: number
  suffix?: string
  delta?: number
  deltaLabel?: string
  sparklineData?: number[]
  threshold?: number
  isPercentage?: boolean
  subtitle?: string
  colorByThreshold?: boolean
  index?: number
}

export function KPICard({
  title,
  value,
  suffix = '',
  delta,
  deltaLabel,
  sparklineData,
  threshold = 75,
  isPercentage = false,
  subtitle,
  colorByThreshold = false,
  index = 0,
}: KPICardProps) {
  const prefersReducedMotion = useReducedMotion()
  const displayValue = useCountUp(value, { decimals: isPercentage ? 1 : 0 })

  const deltaDirection = delta === undefined ? 'neutral' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral'

  const isAboveThreshold = value >= threshold

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="card-hover">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted">{title}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className={cn(
                    'font-mono text-3xl font-semibold tabular-nums',
                    colorByThreshold && (isAboveThreshold ? 'text-pass' : 'text-fail')
                  )}
                >
                  {displayValue}
                  {suffix}
                </span>
                {isPercentage && <span className="text-lg text-muted">%</span>}
              </div>
              {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
            </div>

            {sparklineData && sparklineData.length > 1 && (
              <div className="ml-4">
                <Sparkline
                  data={sparklineData}
                  threshold={threshold}
                  strokeColor={colorByThreshold ? (isAboveThreshold ? 'var(--pass)' : 'var(--fail)') : 'var(--brand)'}
                />
              </div>
            )}
          </div>

          {delta !== undefined && (
            <div className="mt-3 flex items-center gap-1.5">
              {deltaDirection === 'up' && (
                <TrendingUp className="h-3.5 w-3.5 text-pass" />
              )}
              {deltaDirection === 'down' && (
                <TrendingDown className="h-3.5 w-3.5 text-fail" />
              )}
              {deltaDirection === 'neutral' && (
                <Minus className="h-3.5 w-3.5 text-muted" />
              )}
              <span
                className={cn(
                  'text-xs font-medium tabular-nums',
                  deltaDirection === 'up' && 'text-pass',
                  deltaDirection === 'down' && 'text-fail',
                  deltaDirection === 'neutral' && 'text-muted'
                )}
              >
                {delta > 0 ? '+' : ''}
                {formatPercent(delta)}
              </span>
              {deltaLabel && <span className="text-xs text-muted">{deltaLabel}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
