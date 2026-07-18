import { cn } from '@/lib/utils'

export type BadgeTone = 'pass' | 'warn' | 'fail' | 'info' | 'neutral'

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={cn('status-badge', tone)}>
      <span className="dot" />
      {children}
    </span>
  )
}

/** Maps a percentage against a threshold into a badge tone + label. */
export function thresholdBadge(percentage: number, threshold: number): { tone: BadgeTone; label: string } {
  if (percentage >= threshold) return { tone: 'pass', label: 'On track' }
  if (percentage >= threshold - 10) return { tone: 'warn', label: 'At risk' }
  return { tone: 'fail', label: 'Critical' }
}
