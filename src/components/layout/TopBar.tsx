import { Calendar, Download, Users, Menu } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { useAppStore, type DemoRole } from '@/store/appStore'
import { workingDays } from '@/data/store'
import { formatDate } from '@/lib/utils'

const roleLabels: Record<DemoRole, string> = {
  dean: 'Dean',
  hod: 'HOD',
  teacher: 'Teacher',
  admin: 'Admin',
}

export function TopBar() {
  const { selectedDate, setSelectedDate, threshold, setThreshold, role, setRole, showToast } =
    useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleExport = () => {
    showToast('Coloured PDF exported successfully', 'success')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <Users className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-ink">First-Hour Attendance</h1>
            <p className="text-xs text-muted">College Dashboard</p>
          </div>
          <h1 className="sm:hidden text-base font-semibold text-ink">Attendance</h1>
        </div>

        {/* Desktop controls */}
        <div className="hidden md:flex items-center gap-3">
          {/* Date Selector */}
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="mr-2 h-4 w-4 text-muted" />
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

          {/* Threshold Selector */}
          <Select value={threshold.toString()} onValueChange={(v) => setThreshold(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="70">70% Threshold</SelectItem>
              <SelectItem value="75">75% Threshold</SelectItem>
              <SelectItem value="80">80% Threshold</SelectItem>
            </SelectContent>
          </Select>

          {/* Role Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[100px]">
                {roleLabels[role]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(roleLabels) as DemoRole[]).map((r) => (
                <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                  {roleLabels[r]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Button */}
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-line bg-surface p-4 space-y-3">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-full">
              <Calendar className="mr-2 h-4 w-4 text-muted" />
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

          <Select value={threshold.toString()} onValueChange={(v) => setThreshold(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="70">70% Threshold</SelectItem>
              <SelectItem value="75">75% Threshold</SelectItem>
              <SelectItem value="80">80% Threshold</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1">
                  {roleLabels[role]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(Object.keys(roleLabels) as DemoRole[]).map((r) => (
                  <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                    {roleLabels[r]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleExport} className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
