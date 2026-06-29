import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  strokeColor?: string
  threshold?: number
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  strokeColor = 'var(--brand)',
  threshold = 75,
}: SparklineProps) {
  const prefersReducedMotion = useReducedMotion()

  if (data.length < 2) return null

  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Normalize data to chart dimensions
  const min = Math.min(...data, threshold - 10)
  const max = Math.max(...data, threshold + 10)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((value - min) / range) * chartHeight
    return { x, y }
  })

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  // Threshold line y position
  const thresholdY = padding + chartHeight - ((threshold - min) / range) * chartHeight

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Threshold line */}
      <line
        x1={padding}
        y1={thresholdY}
        x2={width - padding}
        y2={thresholdY}
        stroke="var(--fail)"
        strokeWidth="1"
        strokeDasharray="2,2"
        opacity="0.5"
      />

      {/* Main line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={prefersReducedMotion ? {} : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* End point */}
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={strokeColor}
        initial={prefersReducedMotion ? {} : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6 }}
      />
    </svg>
  )
}
