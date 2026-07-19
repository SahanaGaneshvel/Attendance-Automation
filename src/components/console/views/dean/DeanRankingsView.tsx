/**
 * Dean Department Rankings View - Detailed department rankings and comparison
 */
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { Building2, Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { getDeanDashboard, type DeanDashboardData } from '@/api'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard, ChartCard } from '@/components/ui/ChartCard'
import { StatusBadge, thresholdBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton } from '@/components/ui/EmptyState'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { cn } from '@/lib/utils'

export function DeanRankingsView() {
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

  const rankings = data?.department_rankings ?? []

  // Stats
  const stats = useMemo(() => {
    if (rankings.length === 0) return { top: null, bottom: null, aboveThreshold: 0 }

    const sorted = [...rankings].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
    return {
      top: sorted[0],
      bottom: sorted[sorted.length - 1],
      aboveThreshold: rankings.filter((r) => (r.percentage ?? 0) >= threshold).length,
    }
  }, [rankings, threshold])

  // Bar chart data
  const barData = useMemo(() => {
    return rankings.map((d) => ({
      name: d.department_code,
      fullName: d.department_name,
      value: d.percentage ?? 0,
      pass: (d.percentage ?? 0) >= threshold,
      rank: d.rank,
    }))
  }, [rankings, threshold])

  // Table columns
  const rankingColumns: DataTableColumn<(typeof rankings)[number]>[] = [
    {
      key: 'rank',
      header: '#',
      render: (r) => (
        <span className={cn(
          'font-mono text-sm font-bold',
          r.rank === 1 ? 'text-amber-500' : r.rank === 2 ? 'text-slate-400' : r.rank === 3 ? 'text-amber-700' : 'text-muted'
        )}>
          {r.rank}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Department',
      render: (r) => (
        <div>
          <span className="font-semibold text-ink">{r.department_name}</span>
          <span className="ml-2 text-xs text-muted">({r.department_code})</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const b = thresholdBadge(r.percentage ?? 0, threshold)
        return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>
      },
    },
    {
      key: 'present',
      header: 'Present',
      align: 'right',
      render: (r) => `${r.total_present} / ${r.total_strength}`,
    },
    {
      key: 'recorded',
      header: 'Recorded',
      align: 'right',
      render: (r) => (
        <span className="text-sm">
          {r.recorded_count}
          {r.pending_count > 0 && <span className="text-warn ml-1">(+{r.pending_count} pending)</span>}
        </span>
      ),
    },
    {
      key: 'pct',
      header: 'Attendance',
      align: 'right',
      render: (r) => (
        <span className={cn('font-mono font-bold text-lg', (r.percentage ?? 0) >= threshold ? 'text-pass' : 'text-fail')}>
          {(r.percentage ?? 0).toFixed(1)}%
        </span>
      ),
    },
  ]

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
          label="Total Departments"
          value={rankings.length}
          icon={<Building2 className="w-4.5 h-4.5" />}
          accent="indigo"
          footnote={data?.school_name ?? 'School'}
        />
        <StatCard
          label="Top Department"
          value={stats.top ? `${stats.top.percentage?.toFixed(1)}%` : '—'}
          icon={<Trophy className="w-4.5 h-4.5" />}
          accent="amber"
          footnote={stats.top?.department_code ?? 'N/A'}
        />
        <StatCard
          label="Needs Improvement"
          value={stats.bottom ? `${stats.bottom.percentage?.toFixed(1)}%` : '—'}
          icon={<TrendingDown className="w-4.5 h-4.5" />}
          accent="red"
          footnote={stats.bottom?.department_code ?? 'N/A'}
        />
        <StatCard
          label={`Above ${threshold}%`}
          value={stats.aboveThreshold}
          icon={<TrendingUp className="w-4.5 h-4.5" />}
          accent={stats.aboveThreshold === rankings.length ? 'emerald' : 'amber'}
          footnote={`of ${rankings.length} departments`}
        />
      </motion.div>

      {/* Bar chart */}
      <motion.div variants={panelVariants}>
        <ChartCard title="Department Comparison" subtitle={`Ranked by attendance - ${threshold}% threshold`} height={320}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-2)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }}
                formatter={(v: number, _name, props) => [`${v.toFixed(1)}%`, props.payload.fullName]}
                labelFormatter={() => ''}
              />
              <ReferenceLine y={threshold} stroke="var(--line-2)" strokeDasharray="4 4" />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={50}>
                {barData.map((d) => (
                  <Cell key={d.name} fill={d.pass ? 'var(--pass)' : 'var(--fail)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Full rankings table */}
      <motion.div variants={panelVariants}>
        <SectionCard title="Department Rankings" subtitle="Complete breakdown by rank" noPad>
          <DataTable
            columns={rankingColumns}
            rows={rankings}
            searchPlaceholder="Search departments..."
            filterFn={(r, q) =>
              r.department_name.toLowerCase().includes(q.toLowerCase()) ||
              r.department_code.toLowerCase().includes(q.toLowerCase())
            }
          />
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
