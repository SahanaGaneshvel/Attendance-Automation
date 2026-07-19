import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export type StatAccent = 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'cyan'

const accentIconBg: Record<StatAccent, string> = {
  indigo: 'bg-[var(--accent-soft)] text-[var(--accent-ink)]',
  emerald: 'bg-[var(--pass-bg)] text-[var(--pass-ink)]',
  amber: 'bg-[var(--warn-bg)] text-[var(--warn-ink)]',
  red: 'bg-[var(--fail-bg)] text-[var(--fail-ink)]',
  blue: 'bg-[var(--info-bg)] text-[var(--info-ink)]',
  cyan: 'bg-[var(--cyan-bg)] text-[var(--cyan-ink)]',
}

export interface StatCardProps {
  label: string
  value: ReactNode
  suffix?: string
  icon?: ReactNode
  accent?: StatAccent
  trend?: { value: number; label?: string }
  footnote?: ReactNode
  className?: string
  onClick?: () => void
}

export function StatCard({
  label,
  value,
  suffix,
  icon,
  accent = 'indigo',
  trend,
  footnote,
  className,
  onClick,
}: StatCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const trendDir = trend ? (trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'flat') : null

  return (
    <motion.div
      className={cn(`stat-card accent-bar-${accent}`, onClick && 'cursor-pointer', className)}
      onClick={onClick}
      whileHover={prefersReducedMotion ? {} : { y: -3 }}
      transition={{ duration: 0.15 }}
    >
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {icon && <span className={cn('stat-card-icon', accentIconBg[accent])}>{icon}</span>}
      </div>
      <div className="stat-card-value">
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      {(trend || footnote) && (
        <div className="stat-card-foot">
          {trend && (
            <span className={cn('trend-pill', trendDir)}>
              {trendDir === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {trendDir === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {trendDir === 'flat' && <Minus className="w-3 h-3" />}
              {Math.abs(trend.value).toFixed(1)}%
            </span>
          )}
          {footnote && <span>{footnote}</span>}
        </div>
      )}
    </motion.div>
  )
}
