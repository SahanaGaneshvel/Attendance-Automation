import { CheckCircle, Bell } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

/**
 * AlertsPanel - Shows alerts summary
 *
 * In production, this would fetch from /alerts endpoint.
 * Currently shows a simple summary based on the role.
 */
export function AlertsPanel() {
  const { role } = useAppStore()

  // Only show to Dean and HOD
  if (role !== 'dean' && role !== 'hod') {
    return null
  }

  return (
    <div className="panel alerts">
      <div className="panel-header" style={{ marginBottom: '8px' }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted" />
          <span className="panel-title">Alerts</span>
        </div>
      </div>

      <div className="panel-body">
        <div className="text-center py-4 text-muted text-xs">
          <CheckCircle className="w-5 h-5 mx-auto mb-1.5 opacity-50" />
          All clear - no urgent alerts
        </div>
      </div>
    </div>
  )
}
