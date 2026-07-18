import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  noPad?: boolean
}

export function SectionCard({ title, subtitle, action, children, className, noPad }: SectionCardProps) {
  return (
    <div className={cn('section-card', noPad && 'no-pad', className)}>
      {(title || action) && (
        <div className={cn('section-card-header', noPad && 'px-5 pt-5')}>
          <div>
            {title && <h3 className="section-card-title">{title}</h3>}
            {subtitle && <p className="section-card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

interface ChartCardProps extends SectionCardProps {
  height?: number
}

/** Same shell as SectionCard, sized for recharts content. */
export function ChartCard({ height = 260, children, ...rest }: ChartCardProps) {
  return (
    <SectionCard {...rest}>
      <div style={{ width: '100%', height }}>{children}</div>
    </SectionCard>
  )
}
