import { Calendar, Download, ChevronDown } from 'lucide-react'
import { useAppStore, type DemoRole } from '@/store/appStore'
import {
  getCollegeStatsWithDelta,
  getBiggestSingleDayDrop,
  workingDays,
  sections,
} from '@/data/store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useCountUp } from '@/hooks/useCountUp'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatDate, cn } from '@/lib/utils'

const roleLabels: Record<DemoRole, string> = {
  dean: 'Dean',
  hod: 'HOD',
  teacher: 'Teacher',
  admin: 'Admin',
}

interface KPIInstrumentProps {
  label: string
  value: number | string
  subValue?: string
  delta?: number
  isPercentage?: boolean
  colorByThreshold?: boolean
  threshold?: number
  className?: string
}

function KPIInstrument({
  label,
  value,
  subValue,
  delta,
  isPercentage = false,
  colorByThreshold = false,
  threshold = 75,
  className,
}: KPIInstrumentProps) {
  const prefersReducedMotion = useReducedMotion()
  const numericValue = typeof value === 'number' ? value : 0
  const displayValue = useCountUp(numericValue, {
    decimals: isPercentage ? 1 : 0,
    duration: prefersReducedMotion ? 0 : 500,
  })

  const isPass = numericValue >= threshold
  const valueColor = colorByThreshold
    ? isPass ? 'text-pass' : 'text-fail'
    : 'text-ink'

  return (
    <div className={cn('kpi-instrument', className)}>
      <div className="kpi-label">{label}</div>
      <div className={cn('kpi-value', valueColor)}>
        {typeof value === 'number' ? displayValue : value}
        {isPercentage && <span className="text-lg text-muted ml-0.5">%</span>}
      </div>
      {delta !== undefined && (
        <div className={cn(
          'kpi-delta',
          delta > 0 ? 'text-pass' : delta < 0 ? 'text-fail' : 'text-muted'
        )}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} vs yest
        </div>
      )}
      {subValue && !delta && (
        <div className="text-[10px] text-muted mt-0.5 truncate max-w-[120px]">
          {subValue}
        </div>
      )}
    </div>
  )
}

export function InstrumentBar() {
  const {
    selectedDate,
    setSelectedDate,
    threshold,
    setThreshold,
    role,
    setRole,
    selectedScope,
    showToast,
  } = useAppStore()

  const stats = getCollegeStatsWithDelta(selectedDate)
  const biggestDrop = getBiggestSingleDayDrop(selectedDate)

  // Count pending (simulated - classes that haven't reported)
  const pendingCount = 2 // Placeholder

  // Below threshold classes
  const belowThresholdClasses = stats.classesBelow75
    .slice(0, 3)
    .map((c) => c.sectionId.split('-')[0].toUpperCase())
    .join('·')

  const handleExport = () => {
    showToast('Coloured PDF exported successfully', 'success')
  }

  return (
    <div className="instrument-bar">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">⌂</span>
          <span className="text-muted">/</span>
          {selectedScope.path.map((crumb) => (
            <span key={crumb.id} className="flex items-center gap-2">
              <span className="text-muted hover:text-ink cursor-pointer transition-colors">
                {crumb.name}
              </span>
              <span className="text-muted">/</span>
            </span>
          ))}
          <span className="text-ink font-medium">{selectedScope.name}</span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Date Selector */}
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-transparent border-line">
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {workingDays
                .slice()
                .reverse()
                .map((date) => (
                  <SelectItem key={date} value={date} className="text-xs">
                    {formatDate(date)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Threshold Toggle */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-2 text-xs">
            <span className="text-muted">≥</span>
            <Select value={threshold.toString()} onValueChange={(v) => setThreshold(Number(v))}>
              <SelectTrigger className="w-[50px] h-6 text-xs border-0 bg-transparent p-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="70" className="text-xs">70%</SelectItem>
                <SelectItem value="75" className="text-xs">75%</SelectItem>
                <SelectItem value="80" className="text-xs">80%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Role Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
                {roleLabels[role]}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(roleLabels) as DemoRole[]).map((r) => (
                <DropdownMenuItem key={r} onClick={() => setRole(r)} className="text-xs">
                  {roleLabels[r]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            size="sm"
            className="h-8 px-3 text-xs bg-brand hover:bg-brand-2"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Instruments Row */}
      <div className="flex items-stretch border-t border-line">
        <KPIInstrument
          label="Overall Today"
          value={stats.overallPercentage}
          isPercentage
          delta={stats.delta}
          colorByThreshold
          threshold={threshold}
        />

        <KPIInstrument
          label="Below 75%"
          value={`${stats.classesBelow75Count}/${sections.length}`}
          subValue={belowThresholdClasses || 'All passing'}
          className={stats.classesBelow75Count > 0 ? 'text-fail' : ''}
        />

        <KPIInstrument
          label="Pending"
          value={pendingCount}
          subValue="not reported"
        />

        <KPIInstrument
          label="Biggest Drop"
          value={biggestDrop ? `${biggestDrop.drop.toFixed(0)}%` : '—'}
          subValue={
            biggestDrop
              ? `${biggestDrop.department.code} Sec ${biggestDrop.section.name}`
              : 'No drops'
          }
        />
      </div>
    </div>
  )
}
