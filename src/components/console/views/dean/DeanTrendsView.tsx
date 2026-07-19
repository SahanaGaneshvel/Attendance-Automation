/**
 * Dean Trends View - Monthly and historical attendance trends
 */
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { getDeanDashboard, type DeanDashboardData } from '@/api'
import { formatDateShort } from '@/lib/utils'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard, ChartCard } from '@/components/ui/ChartCard'
import { LoadingState, CardSkeleton } from '@/components/ui/EmptyState'

export function DeanTrendsView() {
  const { selectedDate, threshold } = useAppStore()

  const [data, setData] = useState<DeanDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      try {
        const result = await getDeanDashboard(selectedDate, threshold)
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [selectedDate, threshold])

  const trendData = useMemo(() => {
    return (data?.trend ?? []).map((t) => ({
      date: t.date,
      dateShort: formatDateShort(t.date),
      value: t.percentage ?? null,
    }))
  }, [data])

  // Calculate trend stats
  const trendStats = useMemo(() => {
    const values = trendData.filter((t) => t.value !== null).map((t) => t.value as number)
    if (values.length === 0) return { avg: 0, max: 0, min: 0, trend: 0 }

    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const max = Math.max(...values)
    const min = Math.min(...values)

    // Calculate trend (last 5 days vs previous 5 days)
    const recent = values.slice(-5)
    const previous = values.slice(-10, -5)
    const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0
    const previousAvg = previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : recentAvg
    const trend = recentAvg - previousAvg

    return { avg, max, min, trend }
  }, [trendData])

  // Weekly aggregated data
  const weeklyData = useMemo(() => {
    const weeks: { week: string; value: number; count: number }[] = []
    let currentWeek = 0
    let weekSum = 0
    let weekCount = 0

    trendData.forEach((t, i) => {
      if (t.value !== null) {
        weekSum += t.value
        weekCount++
      }

      if ((i + 1) % 5 === 0 || i === trendData.length - 1) {
        if (weekCount > 0) {
          weeks.push({
            week: `Week ${currentWeek + 1}`,
            value: weekSum / weekCount,
            count: weekCount,
          })
        }
        currentWeek++
        weekSum = 0
        weekCount = 0
      }
    })

    return weeks
  }, [trendData])

  if (loading) {
    return (
      <div className="page-grid grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        <div style={{ gridColumn: '1 / -1' }}><LoadingState rows={6} /></div>
      </div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-5" variants={staggerContainer} initial="hidden" animate="visible">
      {/* Stats row */}
      <motion.div className="page-grid grid-cols-4" variants={panelVariants}>
        <StatCard
          label="Average Attendance"
          value={trendStats.avg.toFixed(1)}
          suffix="%"
          icon={<BarChart3 className="w-4.5 h-4.5" />}
          accent={trendStats.avg >= threshold ? 'emerald' : 'amber'}
          footnote={`Over ${trendData.length} days`}
        />
        <StatCard
          label="Best Day"
          value={trendStats.max.toFixed(1)}
          suffix="%"
          icon={<TrendingUp className="w-4.5 h-4.5" />}
          accent="emerald"
          footnote="Peak attendance"
        />
        <StatCard
          label="Lowest Day"
          value={trendStats.min.toFixed(1)}
          suffix="%"
          icon={<TrendingDown className="w-4.5 h-4.5" />}
          accent="red"
          footnote="Needs review"
        />
        <StatCard
          label="Recent Trend"
          value={`${trendStats.trend >= 0 ? '+' : ''}${trendStats.trend.toFixed(1)}`}
          suffix="%"
          icon={<Calendar className="w-4.5 h-4.5" />}
          accent={trendStats.trend >= 0 ? 'emerald' : 'red'}
          footnote="vs previous week"
        />
      </motion.div>

      {/* Main trend chart */}
      <motion.div variants={panelVariants}>
        <ChartCard title="Attendance Trend" subtitle={`${data?.school_name ?? 'School'} - Daily attendance over time`} height={320}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="dateShort" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }}
                formatter={(v: number) => [v != null ? `${v.toFixed(1)}%` : 'No data', 'Attendance']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <ReferenceLine y={threshold} stroke="var(--line-2)" strokeDasharray="4 4" label={{ value: `${threshold}%`, position: 'right', fontSize: 10, fill: 'var(--muted)' }} />
              <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#trendFill)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Weekly summary */}
      <motion.div variants={panelVariants}>
        <ChartCard title="Weekly Summary" subtitle="Average attendance by week" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--ink-2)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Average']}
              />
              <ReferenceLine y={threshold} stroke="var(--line-2)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="value" stroke="var(--cyan)" strokeWidth={3} dot={{ r: 5, fill: 'var(--cyan)' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Trend analysis cards */}
      <motion.div className="page-grid grid-cols-3" variants={panelVariants}>
        <SectionCard title="Days Above Threshold" subtitle={`${threshold}% or higher`}>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-pass">
              {trendData.filter((t) => t.value !== null && t.value >= threshold).length}
            </p>
            <p className="text-sm text-muted mt-1">of {trendData.filter((t) => t.value !== null).length} days</p>
          </div>
        </SectionCard>

        <SectionCard title="Days Below Threshold" subtitle={`Below ${threshold}%`}>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-fail">
              {trendData.filter((t) => t.value !== null && t.value < threshold).length}
            </p>
            <p className="text-sm text-muted mt-1">needs attention</p>
          </div>
        </SectionCard>

        <SectionCard title="Consistency Score" subtitle="Based on variance">
          <div className="text-center py-4">
            {(() => {
              const values = trendData.filter((t) => t.value !== null).map((t) => t.value as number)
              if (values.length === 0) return <p className="text-muted">No data</p>

              const avg = values.reduce((a, b) => a + b, 0) / values.length
              const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length
              const stdDev = Math.sqrt(variance)
              const consistency = Math.max(0, 100 - stdDev * 2) // Higher is more consistent

              return (
                <>
                  <p className={`text-4xl font-bold ${consistency >= 80 ? 'text-pass' : consistency >= 60 ? 'text-warn' : 'text-fail'}`}>
                    {consistency.toFixed(0)}%
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {consistency >= 80 ? 'Very consistent' : consistency >= 60 ? 'Moderate' : 'High variance'}
                  </p>
                </>
              )
            })()}
          </div>
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
