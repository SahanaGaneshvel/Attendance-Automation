import { motion } from 'motion/react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import { getSectionTrend } from '@/data/store'
import { formatDateShort, formatPercent } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SingleSectionTrendProps {
  sectionId: string
}

export function SingleSectionTrend({ sectionId }: SingleSectionTrendProps) {
  const { threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const trendData = getSectionTrend(sectionId)

  const chartData = trendData.map((point) => ({
    date: formatDateShort(point.date),
    fullDate: point.date,
    percentage: point.percentage,
  }))

  const minValue = Math.min(...chartData.map((d) => d.percentage), threshold - 5)
  const maxValue = Math.max(...chartData.map((d) => d.percentage), threshold + 5)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Section Trend</CardTitle>
        <p className="text-sm text-muted">Daily attendance over the last 20 working days</p>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-[240px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--line)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--line)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minValue - 2, maxValue + 2]}
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: 'var(--ink)', fontWeight: 500 }}
                formatter={(value: number) => [formatPercent(value, 1), 'Attendance']}
              />
              <ReferenceLine
                y={threshold}
                stroke="var(--fail)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `${threshold}%`,
                  position: 'right',
                  fill: 'var(--fail)',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="var(--brand)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--brand)', strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  fill: 'var(--brand)',
                  strokeWidth: 2,
                  stroke: 'var(--surface)',
                }}
                animationDuration={prefersReducedMotion ? 0 : 800}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  )
}
