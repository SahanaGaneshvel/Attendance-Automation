import { Calendar, Download } from 'lucide-react'
import { useAppStore, type DemoRole } from '@/store/appStore'
import { workingDays } from '@/data/store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

const roleBreadcrumbs: Record<DemoRole, { path: string; current: string }> = {
  dean: { path: '⌂ /', current: 'College' },
  hod: { path: '⌂ / Computing /', current: 'IT Dept' },
  teacher: { path: '⌂ / CSE /', current: 'Section A' },
  admin: { path: '⌂ /', current: 'Admin' },
}

export function TopBar() {
  const {
    selectedDate,
    setSelectedDate,
    role,
    setRole,
    showToast,
  } = useAppStore()

  const handleExport = () => {
    showToast('PDF exported successfully', 'success')
  }

  const crumb = roleBreadcrumbs[role]

  return (
    <div className="top-bar">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span>{crumb.path}</span>
        <span className="breadcrumb-current">{crumb.current}</span>
      </div>

      {/* Role Segment */}
      <div className="role-segment">
        <button
          className={role === 'teacher' ? 'active' : ''}
          onClick={() => setRole('teacher')}
        >
          Teacher
        </button>
        <button
          className={role === 'hod' ? 'active' : ''}
          onClick={() => setRole('hod')}
        >
          HOD
        </button>
        <button
          className={role === 'dean' ? 'active' : ''}
          onClick={() => setRole('dean')}
        >
          Dean
        </button>
      </div>

      {/* Date Selector */}
      <Select value={selectedDate} onValueChange={setSelectedDate}>
        <SelectTrigger className="pill-btn w-auto">
          <Calendar className="h-3.5 w-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {workingDays
            .slice()
            .reverse()
            .map((date) => (
              <SelectItem key={date} value={date}>
                {formatDate(date)}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Export Button */}
      <button className="export-btn" onClick={handleExport}>
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
    </div>
  )
}
