import { motion } from 'motion/react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import { getAttendanceDistribution } from '@/data/store'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const bandColors: Record<string, string> = {
  '≥90%': 'var(--pass)',
  '80-90%': 'var(--pass)',
  '75-80%': 'var(--warn)',
  '<75%': 'var(--fail)',
}

export function AttendanceDistribution() {
  const { selectedDate } = useAppStore()
  const prefersReducedMotion = useReducedMotion()

  const distribution = getAttendanceDistribution(selectedDate)

  const chartData = distribution.map((band) => ({
    name: band.band,
    count: band.count,
    color: bandColors[band.band] || 'var(--muted)',
  }))

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Attendance Distribution</CardTitle>
        <p className="text-sm text-muted">Classes by attendance band</p>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-[180px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                animationDuration={prefersReducedMotion ? 0 : 600}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {distribution.map((band) => (
            <div
              key={band.band}
              className="text-center rounded-lg bg-surface-2 p-2"
            >
              <p className="text-lg font-semibold tabular-nums" style={{ color: bandColors[band.band] }}>
                {band.count}
              </p>
              <p className="text-xs text-muted">{band.band}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
