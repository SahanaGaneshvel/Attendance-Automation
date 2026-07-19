/**
 * Teacher History View - Shows attendance history for the teacher's assigned section
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { getTeacherDashboard, type TeacherDashboardData } from '@/api'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard, ChartCard } from '@/components/ui/ChartCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton } from '@/components/ui/EmptyState'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { cn } from '@/lib/utils'

export function TeacherHistoryView() {
  const { selectedDate, threshold } = useAppStore()
  const { user } = useAuthContext()

  const mySectionName = user?.scope?.section_name ?? 'My Class'

  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null)

  const fetchData = useCallback(async () => {
    if (!user?.scope?.section_id) return
    setIsLoading(true)
    try {
      const data = await getTeacherDashboard(selectedDate)
      setDashboardData(data)
    } catch {
      setDashboardData(null)
    } finally {
      setIsLoading(false)
    }
  }, [user?.scope?.section_id, selectedDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const trendData = useMemo(() => {
    return (dashboardData?.trend ?? [])
      .filter((t) => t.status === 'recorded')
      .map((t) => ({
        date: t.date,
        dateShort: t.date.slice(5),
        percentage: t.percentage ?? 0,
        status: t.status,
      }))
  }, [dashboardData])

  const quickStats = dashboardData?.quick_stats ?? {
    best: 0,
    worst: 0,
    days_below_75: 0,
    average: 0,
    recorded_days: 0,
  }

  const historyColumns: DataTableColumn<(typeof trendData)[number]>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className="font-mono text-sm">{r.date}</span>
      ),
    },
    {
      key: 'percentage',
      header: 'Attendance',
      align: 'right',
      render: (r) => (
        <span className={cn('font-mono font-bold', r.percentage >= threshold ? 'text-pass' : 'text-fail')}>
          {r.percentage.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusBadge tone={r.percentage >= threshold ? 'pass' : 'fail'}>
          {r.percentage >= threshold ? 'Above' : 'Below'} {threshold}%
        </StatusBadge>
      ),
    },
  ]

  if (isLoading && !dashboardData) {
    return (
      <div className="page-grid grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
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
          value={quickStats.average.toFixed(1)}
          suffix="%"
          icon={<Calendar className="w-4.5 h-4.5" />}
          accent={quickStats.average >= threshold ? 'emerald' : 'red'}
          footnote={`Over ${quickStats.recorded_days} days`}
        />
        <StatCard
          label="Best Day"
          value={quickStats.best.toFixed(1)}
          suffix="%"
          icon={<TrendingUp className="w-4.5 h-4.5" />}
          accent="emerald"
          footnote="Highest recorded"
        />
        <StatCard
          label="Worst Day"
          value={quickStats.worst.toFixed(1)}
          suffix="%"
          icon={<TrendingDown className="w-4.5 h-4.5" />}
          accent="red"
          footnote="Lowest recorded"
        />
        <StatCard
          label={`Days Below ${threshold}%`}
          value={quickStats.days_below_75}
          accent={quickStats.days_below_75 > 0 ? 'amber' : 'emerald'}
          footnote="Needs attention"
        />
      </motion.div>

      {/* Trend chart */}
      <motion.div variants={panelVariants}>
        <ChartCard title="Attendance Trend" subtitle={`${mySectionName} - Last ${trendData.length} recorded days`} height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="dateShort" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Attendance']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <ReferenceLine y={threshold} stroke="var(--line-2)" strokeDasharray="4 4" label={{ value: `${threshold}%`, position: 'right', fontSize: 10, fill: 'var(--muted)' }} />
              <Line type="monotone" dataKey="percentage" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* History table */}
      <motion.div variants={panelVariants}>
        <SectionCard title="Attendance History" subtitle={`${mySectionName} - All recorded days`} noPad>
          <DataTable
            columns={historyColumns}
            rows={trendData}
            searchPlaceholder="Search by date..."
            filterFn={(r, q) => r.date.includes(q)}
          />
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
