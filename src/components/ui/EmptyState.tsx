import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  icon,
  title = 'Nothing here yet',
  description,
}: {
  icon?: ReactNode
  title?: string
  description?: string
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon ?? <Inbox className="w-5 h-5" />}</div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
    </div>
  )
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="loading-skeleton-row">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="loading-bar" style={{ width: `${100 - i * 8}%` }} />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="stat-card">
      <div className="loading-skeleton-row">
        <div className="loading-bar" style={{ width: '40%', height: 10 }} />
        <div className="loading-bar" style={{ width: '65%', height: 26 }} />
        <div className="loading-bar" style={{ width: '50%', height: 10 }} />
      </div>
    </div>
  )
}
