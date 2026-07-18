import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { workingDays, TODAY, getAllClassesAttendance } from '@/data/store'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type DayState = 'pass' | 'fail' | 'pending' | 'none'

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Monday-first day-of-week index (0 = Mon .. 6 = Sun)
function mondayIndex(d: Date): number {
  const day = d.getDay() // 0 = Sun
  return (day + 6) % 7
}

function getDayState(dateISO: string): DayState {
  const list = getAllClassesAttendance(dateISO)
  if (list.length === 0) return 'none'
  const recorded = list.filter((a) => a.status === 'recorded')
  if (recorded.length === 0) return 'pending'
  if (recorded.some((a) => a.percentage < 75)) return 'fail'
  if (recorded.length < list.length) return 'pending'
  return 'pass'
}

const DOT_COLOR: Record<DayState, string> = {
  pass: 'var(--pass)',
  fail: 'var(--fail)',
  pending: 'var(--pending, var(--warn))',
  none: 'transparent',
}

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => parseISO(value), [value])
  const [viewMonth, setViewMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const [focusDate, setFocusDate] = useState<Date>(selected)
  const rootRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const workingDaySet = useMemo(() => new Set(workingDays), [])
  const minDate = useMemo(() => parseISO(workingDays[0]), [])
  const maxDate = useMemo(() => parseISO(TODAY), [])

  useEffect(() => {
    if (!open) return
    setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
    setFocusDate(selected)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const isSelectable = useCallback((d: Date) => {
    if (d < minDate || d > maxDate) return false
    return workingDaySet.has(toISO(d))
  }, [minDate, maxDate, workingDaySet])

  const commit = (d: Date) => {
    if (!isSelectable(d)) return
    onChange(toISO(d))
    setOpen(false)
  }

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    const delta: Record<string, number> = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
    }
    if (e.key in delta) {
      e.preventDefault()
      const next = new Date(focusDate)
      next.setDate(next.getDate() + delta[e.key])
      setFocusDate(next)
      if (next.getMonth() !== viewMonth.getMonth() || next.getFullYear() !== viewMonth.getFullYear()) {
        setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1))
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(focusDate)
    }
  }

  // Build 6x7 grid for the visible month
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const leadingBlanks = mondayIndex(firstOfMonth)
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = viewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const triggerLabel = selected.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

  const yesterday = useMemo(() => {
    const idx = workingDays.indexOf(value)
    return idx > 0 ? workingDays[idx - 1] : null
  }, [value])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pill-btn',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring'
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{triggerLabel}</span>
        <ChevronDown className={cn('h-3 w-3 opacity-60 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Choose date"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-[calc(100%+8px)] z-[9999] w-[288px] rounded-[12px] border border-border bg-surface shadow-lg p-3"
            onKeyDown={handleGridKeyDown}
            tabIndex={-1}
          >
            {/* Month header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-[8px] text-ink-2 hover:bg-surface-3 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-display text-[13px] font-semibold text-ink">{monthLabel}</span>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-[8px] text-ink-2 hover:bg-surface-3 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday row */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="h-6 flex items-center justify-center text-[10.5px] font-semibold text-ink-3">
                  {w}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-[2px]">
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="w-9 h-9" />
                const iso = toISO(d)
                const selectable = isSelectable(d)
                const isSelected = isSameDay(d, selected)
                const isToday = isSameDay(d, parseISO(TODAY))
                const isFocused = isSameDay(d, focusDate)
                const state = selectable ? getDayState(iso) : 'none'

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!selectable}
                    onClick={() => commit(d)}
                    onFocus={() => setFocusDate(d)}
                    tabIndex={isFocused ? 0 : -1}
                    className={cn(
                      'relative w-9 h-9 rounded-[8px] text-[12px] font-medium font-mono tabular-nums',
                      'flex flex-col items-center justify-center gap-0.5 transition-colors duration-100',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring',
                      !selectable && 'text-ink-4 cursor-not-allowed',
                      selectable && !isSelected && 'text-ink hover:bg-surface-3 cursor-pointer',
                      isSelected && 'bg-accent text-white',
                      isToday && !isSelected && 'ring-1 ring-inset ring-accent-ink'
                    )}
                  >
                    <span>{d.getDate()}</span>
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : DOT_COLOR[state] }}
                    />
                  </button>
                )
              })}
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => commit(parseISO(TODAY))}
                className="flex-1 h-7 rounded-[8px] text-[11.5px] font-semibold text-ink-2 bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                disabled={!yesterday}
                onClick={() => yesterday && commit(parseISO(yesterday))}
                className="flex-1 h-7 rounded-[8px] text-[11.5px] font-semibold text-ink-2 bg-surface-2 hover:bg-surface-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Yesterday
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-2.5 px-1 flex-wrap">
              {([
                ['pass', 'Reported'],
                ['fail', 'Below target'],
                ['pending', 'Pending'],
              ] as [DayState, string][]).map(([k, label]) => (
                <div key={k} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_COLOR[k] }} />
                  <span className="text-[10px] text-ink-3">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
