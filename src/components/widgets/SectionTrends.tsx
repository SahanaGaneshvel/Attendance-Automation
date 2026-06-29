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
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import { getSectionsTrendByDepartment, workingDays } from '@/data/store'
import { formatDateShort, formatPercent } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const sectionColors = ['var(--brand)', 'var(--accent)', 'var(--brand-2)']

interface SectionTrendsProps {
  departmentId: string
}

export function SectionTrends({ departmentId }: SectionTrendsProps) {
  const { threshold } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const sectionTrends = getSectionsTrendByDepartment(departmentId)

  // Build chart data with all sections
  const chartData = workingDays.map((date, i) => {
    const point: Record<string, string | number> = {
      date: formatDateShort(date),
      fullDate: date,
    }
    sectionTrends.forEach((section) => {
      point[section.sectionName] = section.data[i]?.percentage ?? 0
    })
    return point
  })

  const allValues = sectionTrends.flatMap((s) => s.data.map((d) => d.percentage))
  const minValue = Math.min(...allValues, threshold - 5)
  const maxValue = Math.max(...allValues, threshold + 5)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Section Trends</CardTitle>
        <p className="text-sm text-muted">Attendance over the last 20 working days</p>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
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
                formatter={(value: number) => [formatPercent(value, 1), '']}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => `Section ${value}`}
              />
              <ReferenceLine
                y={threshold}
                stroke="var(--fail)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              {sectionTrends.map((section, index) => (
                <Line
                  key={section.sectionId}
                  type="monotone"
                  dataKey={section.sectionName}
                  stroke={sectionColors[index % sectionColors.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: sectionColors[index % sectionColors.length],
                    strokeWidth: 2,
                    stroke: 'var(--surface)',
                  }}
                  animationDuration={prefersReducedMotion ? 0 : 800}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  )
}
