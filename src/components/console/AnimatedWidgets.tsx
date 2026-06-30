/**
 * Animated Comparison Widgets
 *
 * - BulletBars: Horizontal bars with animated growth and "YOU" highlight
 * - Slopegraph: Animated line connections between before/after columns
 * - StreakStrip: 20-day squares filling left→right
 * - SmallMultiples: Staggered sparkline draw
 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'
import {
  SPRING,
  TIMING,
  streakContainerVariants,
  streakDayVariants,
} from '@/lib/motion'

// ============================================
// BULLET BARS (Peer Comparison)
// ============================================

interface BulletBarData {
  id: string
  name: string
  value: number
  isMe?: boolean
  rank?: number
}

interface BulletBarsProps {
  data: BulletBarData[]
  threshold: number
  maxValue?: number
}

export function BulletBars({ data, threshold, maxValue = 100 }: BulletBarsProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="comparison-list">
      {data.map((item, index) => (
        <motion.div
          key={item.id}
          className={cn('comparison-row', item.isMe && 'me')}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: prefersReducedMotion ? 0 : index * TIMING.stagger * 2,
            ...SPRING.smooth,
          }}
        >
          {/* Name and rank */}
          <div className="comparison-name">
            {item.name}
            {item.isMe && (
              <motion.span
                className="me-flag"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={prefersReducedMotion ? { duration: 0 } : SPRING.snappy}
              >
                YOU
              </motion.span>
            )}
            {item.rank && <span className="comparison-tag">#{item.rank}</span>}
          </div>

          {/* Animated bar track */}
          <div className="comparison-track">
            <motion.div
              className={cn(
                'comparison-fill',
                item.isMe ? 'me' : item.value >= threshold ? 'pass' : 'fail'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{
                delay: prefersReducedMotion ? 0 : index * TIMING.stagger * 2 + 0.1,
                duration: prefersReducedMotion ? 0 : 0.5,
                ease: [0.32, 0.72, 0, 1],
              }}
            />
            {/* Threshold marker */}
            <div
              className="comparison-threshold"
              style={{ left: `${(threshold / maxValue) * 100}%` }}
            />
          </div>

          {/* Value with count-up */}
          <AnimatedValue value={item.value} />
        </motion.div>
      ))}
    </div>
  )
}

function AnimatedValue({ value }: { value: number }) {
  const displayValue = useCountUp(value, { duration: 500, decimals: 0 })
  return (
    <span className="comparison-value">{Math.round(displayValue)}</span>
  )
}

// ============================================
// SLOPEGRAPH (Before/After Comparison)
// ============================================

interface SlopegraphData {
  id: string
  name: string
  before: number
  after: number
}

interface SlopegraphProps {
  data: SlopegraphData[]
  beforeLabel?: string
  afterLabel?: string
  threshold: number
}

export function Slopegraph({
  data,
  beforeLabel = 'Last Week',
  afterLabel = 'This Week',
  threshold,
}: SlopegraphProps) {
  const prefersReducedMotion = useReducedMotion()
  const height = 200
  const width = 280
  const padding = { top: 30, right: 60, bottom: 20, left: 60 }
  const chartHeight = height - padding.top - padding.bottom

  // Sort by 'after' value for better visual
  const sortedData = useMemo(
    () => [...data].sort((a, b) => b.after - a.after).slice(0, 6),
    [data]
  )

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / 100) * chartHeight
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Column labels */}
      <text
        x={padding.left}
        y={16}
        fontSize={10}
        fill="var(--muted)"
        textAnchor="middle"
        className="uppercase tracking-wider"
      >
        {beforeLabel}
      </text>
      <text
        x={width - padding.right}
        y={16}
        fontSize={10}
        fill="var(--muted)"
        textAnchor="middle"
        className="uppercase tracking-wider"
      >
        {afterLabel}
      </text>

      {/* Threshold line */}
      <line
        x1={padding.left - 10}
        y1={getY(threshold)}
        x2={width - padding.right + 10}
        y2={getY(threshold)}
        stroke="var(--line-2)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {/* Connecting lines (animated) */}
      {sortedData.map((item, index) => {
        const x1 = padding.left
        const y1 = getY(item.before)
        const x2 = width - padding.right
        const y2 = getY(item.after)
        const isImproving = item.after > item.before

        return (
          <motion.line
            key={item.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isImproving ? 'var(--pass)' : 'var(--fail)'}
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: {
                duration: prefersReducedMotion ? 0 : 0.6,
                delay: prefersReducedMotion ? 0 : index * 0.08,
                ease: 'easeOut',
              },
              opacity: { duration: 0.1 },
            }}
          />
        )
      })}

      {/* Before points */}
      {sortedData.map((item, index) => (
        <motion.g key={`before-${item.id}`}>
          <motion.circle
            cx={padding.left}
            cy={getY(item.before)}
            r={4}
            fill="var(--surface)"
            stroke={item.before >= threshold ? 'var(--pass)' : 'var(--fail)'}
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: prefersReducedMotion ? 0 : index * 0.08,
              ...SPRING.snappy,
            }}
          />
          <motion.text
            x={padding.left - 8}
            y={getY(item.before) + 3}
            fontSize={10}
            fill="var(--muted)"
            textAnchor="end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: prefersReducedMotion ? 0 : index * 0.08 + 0.2 }}
          >
            {Math.round(item.before)}
          </motion.text>
        </motion.g>
      ))}

      {/* After points with labels */}
      {sortedData.map((item, index) => (
        <motion.g key={`after-${item.id}`}>
          <motion.circle
            cx={width - padding.right}
            cy={getY(item.after)}
            r={4}
            fill={item.after >= threshold ? 'var(--pass)' : 'var(--fail)'}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: prefersReducedMotion ? 0 : index * 0.08 + 0.3,
              ...SPRING.snappy,
            }}
          />
          <motion.text
            x={width - padding.right + 8}
            y={getY(item.after) + 3}
            fontSize={10}
            fill="var(--ink)"
            fontWeight={600}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : index * 0.08 + 0.4 }}
          >
            {item.name} {Math.round(item.after)}
          </motion.text>
        </motion.g>
      ))}
    </svg>
  )
}

// ============================================
// STREAK STRIP (20-day calendar)
// ============================================

interface StreakDay {
  date: string
  percentage: number | null // null = no session
}

interface StreakStripProps {
  data: StreakDay[]
  threshold: number
}

export function StreakStrip({ data, threshold }: StreakStripProps) {
  const prefersReducedMotion = useReducedMotion()

  // Take last 20 days
  const days = data.slice(-20)

  return (
    <motion.div
      className="flex gap-1"
      variants={streakContainerVariants}
      initial="initial"
      animate="animate"
    >
      {days.map((day, index) => {
        const isPass = day.percentage !== null && day.percentage >= threshold
        const isFail = day.percentage !== null && day.percentage < threshold
        const isNone = day.percentage === null

        return (
          <motion.div
            key={day.date}
            className={cn(
              'w-3 h-6 rounded-sm',
              isPass && 'bg-pass',
              isFail && 'bg-fail',
              isNone && 'bg-none'
            )}
            title={`${day.date}: ${day.percentage !== null ? Math.round(day.percentage) + '%' : 'No session'}`}
            variants={streakDayVariants}
            custom={index}
            transition={{
              delay: prefersReducedMotion ? 0 : index * 0.02,
              ...SPRING.snappy,
            }}
          />
        )
      })}
    </motion.div>
  )
}

// ============================================
// SMALL MULTIPLES (Sparkline Grid)
// ============================================

interface SparklineData {
  id: string
  name: string
  values: number[]
}

interface SmallMultiplesProps {
  data: SparklineData[]
  threshold: number
}

export function SmallMultiples({ data, threshold }: SmallMultiplesProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="grid grid-cols-2 gap-3">
      {data.map((series, index) => (
        <motion.div
          key={series.id}
          className="p-3 rounded-lg bg-surface-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: prefersReducedMotion ? 0 : index * TIMING.stagger * 3,
            ...SPRING.smooth,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ink truncate">
              {series.name}
            </span>
            <span
              className={cn(
                'text-xs font-mono font-bold',
                series.values[series.values.length - 1] >= threshold
                  ? 'text-pass'
                  : 'text-fail'
              )}
            >
              {Math.round(series.values[series.values.length - 1])}%
            </span>
          </div>
          <AnimatedSparkline
            values={series.values}
            threshold={threshold}
            index={index}
          />
        </motion.div>
      ))}
    </div>
  )
}

function AnimatedSparkline({
  values,
  threshold,
  index,
}: {
  values: number[]
  threshold: number
  index: number
}) {
  const prefersReducedMotion = useReducedMotion()
  const width = 100
  const height = 24
  const max = 100
  const min = 0

  const points = values.map((val, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((val - min) / (max - min)) * height,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const thresholdY = height - ((threshold - min) / (max - min)) * height

  return (
    <svg width={width} height={height} className="overflow-visible">
      <line
        x1={0}
        y1={thresholdY}
        x2={width}
        y2={thresholdY}
        stroke="var(--line)"
        strokeWidth={1}
        strokeDasharray="2,2"
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.6,
          delay: prefersReducedMotion ? 0 : index * 0.1,
          ease: 'easeOut',
        }}
      />
    </svg>
  )
}

// ============================================
// ANIMATED RING CHART
// ============================================

interface RingChartProps {
  percentage: number
  threshold: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function AnimatedRing({
  percentage,
  threshold,
  size = 120,
  strokeWidth = 12,
  label,
}: RingChartProps) {
  const prefersReducedMotion = useReducedMotion()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const displayValue = useCountUp(percentage, { duration: 500, decimals: 1 })

  const isPass = percentage >= threshold
  const color = isPass ? 'var(--pass)' : 'var(--fail)'
  const bgColor = isPass ? 'var(--pass-bg)' : 'var(--fail-bg)'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle (animated stroke) */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (percentage / 100) * circumference }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.8,
            ease: [0.32, 0.72, 0, 1],
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-semibold"
          style={{ fontSize: size * 0.22, color, letterSpacing: '-1px' }}
        >
          {displayValue.toFixed(1)}%
        </span>
        {label && (
          <span className="text-[10px] text-muted uppercase tracking-wide">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================
// ANIMATED NUMBER (Hero big)
// ============================================

interface AnimatedNumberProps {
  value: number
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedNumber({
  value,
  suffix = '%',
  decimals = 1,
  className,
}: AnimatedNumberProps) {
  const displayValue = useCountUp(value, { duration: 500, decimals })

  return (
    <span className={className}>
      {displayValue.toFixed(decimals)}
      {suffix && <small>{suffix}</small>}
    </span>
  )
}

// ============================================
// TREND CHART WITH TOGGLE (Daily/Cumulative)
// ============================================

interface TrendData {
  date: string
  daily: number
  cumulative: number
}

interface TrendChartProps {
  data: TrendData[]
  threshold: number
}

export function TrendChart({ data, threshold }: TrendChartProps) {
  const prefersReducedMotion = useReducedMotion()
  const [mode, setMode] = useState<'daily' | 'cumulative'>('daily')

  const width = 300
  const height = 100
  const padding = { top: 10, right: 10, bottom: 20, left: 30 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const values = data.map((d) => (mode === 'daily' ? d.daily : d.cumulative))
  const max = 100
  const min = 0

  const points = values.map((val, i) => ({
    x: padding.left + (i / (values.length - 1)) * chartWidth,
    y: padding.top + chartHeight - ((val - min) / (max - min)) * chartHeight,
    val,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const thresholdY = padding.top + chartHeight - ((threshold - min) / (max - min)) * chartHeight

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          className={cn(
            'px-3 py-1 rounded text-xs font-semibold transition-colors',
            mode === 'daily'
              ? 'bg-accent text-white'
              : 'bg-surface-2 text-muted hover:text-ink'
          )}
          onClick={() => setMode('daily')}
        >
          Daily
        </button>
        <button
          className={cn(
            'px-3 py-1 rounded text-xs font-semibold transition-colors',
            mode === 'cumulative'
              ? 'bg-accent text-white'
              : 'bg-surface-2 text-muted hover:text-ink'
          )}
          onClick={() => setMode('cumulative')}
        >
          Cumulative
        </button>
      </div>

      <svg width={width} height={height}>
        {/* Threshold */}
        <line
          x1={padding.left}
          y1={thresholdY}
          x2={width - padding.right}
          y2={thresholdY}
          stroke="var(--line-2)"
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* Animated path with cross-fade */}
        <AnimatePresence mode="wait">
          <motion.path
            key={mode}
            d={pathD}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              pathLength: { duration: prefersReducedMotion ? 0 : 0.6 },
              opacity: { duration: 0.2 },
            }}
          />
        </AnimatePresence>

        {/* Latest point */}
        <motion.circle
          cx={points[points.length - 1]?.x}
          cy={points[points.length - 1]?.y}
          r={4}
          fill={values[values.length - 1] >= threshold ? 'var(--pass)' : 'var(--fail)'}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={SPRING.snappy}
        />
      </svg>
    </div>
  )
}

