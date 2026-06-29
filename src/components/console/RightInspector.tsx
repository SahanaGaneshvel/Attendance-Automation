import { useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import {
  getCollegeTrend,
  getAttendanceDistribution,
  getChronicOffenders,
} from '@/data/store'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn, formatDateShort, formatPercent } from '@/lib/utils'

// Mini trend chart for inspector
function InspectorTrendChart({
  view,
  threshold
}: {
  view: 'daily' | 'cumulative'
  threshold: number
}) {
  const prefersReducedMotion = useReducedMotion()
  const trendData = getCollegeTrend()

  const chartData = trendData.map((point) => ({
    date: point.date,
    value: view === 'daily' ? point.percentage : point.cumulativePercentage,
  }))

  const width = 260
  const height = 80
  const padding = { top: 8, right: 8, bottom: 20, left: 8 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const values = chartData.map(d => d.value)
  const min = Math.min(...values, threshold - 5)
  const max = Math.max(...values, threshold + 5)
  const range = max - min || 1

  const points = chartData.map((d, i) => ({
    x: padding.left + (i / (chartData.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.value - min) / range) * chartHeight,
    value: d.value,
    date: d.date,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const thresholdY = padding.top + chartHeight - ((threshold - min) / range) * chartHeight
  const lastPoint = points[points.length - 1]

  return (
    <svg width={width} height={height} className="w-full">
      {/* Threshold line */}
      <line
        x1={padding.left}
        y1={thresholdY}
        x2={width - padding.right}
        y2={thresholdY}
        stroke="var(--fail)"
        strokeWidth="1"
        strokeDasharray="3,3"
        opacity="0.4"
      />

      {/* Main line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={prefersReducedMotion ? {} : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* End point */}
      <motion.circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="3"
        fill="var(--brand)"
        initial={prefersReducedMotion ? {} : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.7 }}
      />

      {/* X-axis labels (first and last) */}
      <text
        x={padding.left}
        y={height - 4}
        className="text-[9px] fill-muted"
      >
        {formatDateShort(chartData[0].date)}
      </text>
      <text
        x={width - padding.right}
        y={height - 4}
        className="text-[9px] fill-muted"
        textAnchor="end"
      >
        {formatDateShort(chartData[chartData.length - 1].date)}
      </text>
    </svg>
  )
}

// Distribution band component
function DistributionBands() {
  const { selectedDate } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const distribution = getAttendanceDistribution(selectedDate)

  const bandColors: Record<string, string> = {
    '≥90%': 'bg-pass',
    '80-90%': 'bg-pass/70',
    '75-80%': 'bg-warn',
    '<75%': 'bg-fail',
  }

  const total = distribution.reduce((sum, b) => sum + b.count, 0)

  return (
    <div className="space-y-2">
      {distribution.map((band, index) => (
        <motion.div
          key={band.band}
          initial={prefersReducedMotion ? {} : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-2"
        >
          <span className="text-xs text-muted w-10">{band.band}</span>
          <div className="flex-1 h-3 bg-line/30 rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', bandColors[band.band])}
              initial={prefersReducedMotion ? {} : { width: 0 }}
              animate={{ width: total > 0 ? `${(band.count / total) * 100}%` : '0%' }}
              transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
            />
          </div>
          <span className="font-data text-xs tabular-nums w-4 text-right">
            {band.count}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// Chronic offenders list
function ChronicOffendersList() {
  const navigate = useNavigate()
  const { threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const offenders = getChronicOffenders(3, threshold).slice(0, 5)

  if (offenders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <div className="rounded-full bg-pass-bg p-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-pass" />
        </div>
        <p className="text-xs text-muted">No chronic offenders</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {offenders.map((offender, index) => (
        <motion.button
          key={offender.sectionId}
          onClick={() => navigate(`/section/${offender.sectionId}`)}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-md bg-fail-bg/30 hover:bg-fail-bg/50 transition-colors text-left"
        >
          <div>
            <p className="text-xs font-medium text-ink">
              {offender.department.code} · Sec {offender.section.name}
            </p>
            <p className="text-[10px] text-muted">
              {offender.consecutiveDaysBelow75} consecutive days
            </p>
          </div>
          <span className={cn(
            'font-data text-xs px-1.5 py-0.5 rounded',
            'bg-fail/10 text-fail'
          )}>
            {formatPercent(offender.currentPercentage, 0)}
          </span>
        </motion.button>
      ))}
    </div>
  )
}

export function RightInspector() {
  const { selectedScope, threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const [trendView, setTrendView] = useState<'daily' | 'cumulative'>('daily')

  return (
    <>
      {/* Inspector Header */}
      <div className="inspector-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Inspecting</p>
            <h3 className="font-display text-sm text-ink">{selectedScope.name}</h3>
          </div>
        </div>
      </div>

      {/* Inspector Content */}
      <div className="inspector-content">
        {/* Attendance Trend */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inspector-card"
        >
          <div className="inspector-card-header">
            <span className="inspector-card-title">Attendance Trend</span>
            <Tabs
              value={trendView}
              onValueChange={(v) => setTrendView(v as 'daily' | 'cumulative')}
            >
              <TabsList className="h-6">
                <TabsTrigger value="daily" className="text-[10px] px-2 h-5">
                  Daily
                </TabsTrigger>
                <TabsTrigger value="cumulative" className="text-[10px] px-2 h-5">
                  Cumul.
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="inspector-card-body">
            <InspectorTrendChart view={trendView} threshold={threshold} />
          </div>
        </motion.div>

        {/* Distribution by Band */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="inspector-card"
        >
          <div className="inspector-card-header">
            <span className="inspector-card-title">Distribution · By Band</span>
          </div>
          <div className="inspector-card-body">
            <DistributionBands />
          </div>
        </motion.div>

        {/* Chronic Offenders */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inspector-card"
        >
          <div className="inspector-card-header">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-warn" />
              <span className="inspector-card-title">Chronic Offenders</span>
            </div>
          </div>
          <div className="inspector-card-body">
            <ChronicOffendersList />
          </div>
        </motion.div>
      </div>
    </>
  )
}
