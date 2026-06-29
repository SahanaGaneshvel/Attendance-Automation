import { useState } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/store/appStore'
import { getCollegeTrend } from '@/data/store'
import { formatDateShort, formatPercent } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function CollegeTrend() {
  const { threshold } = useAppStore()
  const [view, setView] = useState<'daily' | 'cumulative'>('daily')
  const prefersReducedMotion = useReducedMotion()

  const trendData = getCollegeTrend()

  const chartData = trendData.map((point) => ({
    date: formatDateShort(point.date),
    fullDate: point.date,
    value: view === 'daily' ? point.percentage : point.cumulativePercentage,
  }))

  const minValue = Math.min(...chartData.map((d) => d.value), threshold - 5)
  const maxValue = Math.max(...chartData.map((d) => d.value), threshold + 5)

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">College Attendance Trend</CardTitle>
            <p className="text-sm text-muted">Last 20 working days</p>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'cumulative')}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="h-[280px]"
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
                formatter={(value: number) => [formatPercent(value, 1), view === 'daily' ? 'Daily' : 'Cumulative']}
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
                dataKey="value"
                stroke="var(--brand)"
                strokeWidth={2.5}
                dot={false}
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
