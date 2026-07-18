import { useMemo, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { GraduationCap, Building2, TrendingDown, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { getDeanDashboard, ApiError } from '@/api'
import type { DeanDashboardData } from '@/api'
import { cn, formatDateShort } from '@/lib/utils'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { AnimatedHeatmap } from '../AnimatedHeatmap'
import { AlertsPanel } from '../AlertsPanel'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard, ChartCard } from '@/components/ui/ChartCard'
import { StatusBadge, thresholdBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton, EmptyState } from '@/components/ui/EmptyState'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'

export function DeanView() {
  const { selectedDate, threshold } = useAppStore()

  const [data, setData] = useState<DeanDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const result = await getDeanDashboard(selectedDate, threshold)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [selectedDate, threshold])

  const trendData = useMemo(
    () => (data?.trend ?? []).map((t) => ({ date: formatDateShort(t.date), value: t.percentage ?? null })),
    [data]
  )

  const deptBarData = useMemo(
    () =>
      (data?.department_rankings ?? []).map((d) => ({
        name: d.department_code,
        value: d.percentage ?? 0,
        pass: (d.percentage ?? 0) >= threshold,
      })),
    [data, threshold]
  )

  const distributionData = useMemo(() => {
    if (!data) return []
    const { classes_above, classes_below, classes_pending, classes_no_session } = data.stats
    return [
      { name: 'Above threshold', value: classes_above, color: 'var(--pass)' },
      { name: 'Below threshold', value: classes_below, color: 'var(--fail)' },
      { name: 'Pending', value: classes_pending, color: 'var(--warn)' },
      { name: 'No session', value: classes_no_session, color: 'var(--nosession)' },
    ].filter((d) => d.value > 0)
  }, [data])

  const rankingColumns: DataTableColumn<DeanDashboardData['department_rankings'][number]>[] = [
    { key: 'rank', header: '#', render: (r) => <span className="font-mono text-xs text-faint">{r.rank}</span> },
    { key: 'name', header: 'Department', render: (r) => <span className="font-semibold text-ink">{r.department_name}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const b = thresholdBadge(r.percentage ?? 0, threshold)
        return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>
      },
    },
    { key: 'present', header: 'Present', align: 'right', render: (r) => `${r.total_present}/${r.total_strength}` },
    {
      key: 'pct',
      header: 'Attendance',
      align: 'right',
      render: (r) => (
        <span className={cn('font-mono font-bold', (r.percentage ?? 0) >= threshold ? 'text-pass' : 'text-fail')}>
          {(r.percentage ?? 0).toFixed(1)}%
        </span>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="page-grid grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        <div className="grid-cols-4" style={{ gridColumn: '1 / -1' }}><LoadingState rows={6} /></div>
      </div>
    )
  }

  if (error || !data) {
    return <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="Couldn't load dashboard" description={error ?? 'No data available'} />
  }

  const overallBadge = thresholdBadge(data.stats.percentage ?? 0, threshold)

  return (
    <motion.div className="flex flex-col gap-5" variants={staggerContainer} initial="hidden" animate="visible">
      {/* KPI row */}
      <motion.div className="page-grid grid-cols-4" variants={panelVariants}>
        <StatCard
          label="Overall Attendance"
          value={(data.stats.percentage ?? 0).toFixed(1)}
          suffix="%"
          icon={<GraduationCap className="w-4.5 h-4.5" />}
          accent={overallBadge.tone === 'pass' ? 'emerald' : overallBadge.tone === 'fail' ? 'red' : 'amber'}
          footnote={`${data.stats.total_present} / ${data.stats.total_strength} students`}
        />
        <StatCard
          label={`Below ${threshold}%`}
          value={data.stats.classes_below}
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          accent={data.stats.classes_below > 0 ? 'red' : 'emerald'}
          footnote={`of ${data.stats.total_classes} classes`}
        />
        <StatCard
          label={`Depts Below ${threshold}%`}
          value={data.stats.departments_below_threshold}
          icon={<Building2 className="w-4.5 h-4.5" />}
          accent={data.stats.departments_below_threshold > 0 ? 'amber' : 'emerald'}
          footnote={`of ${data.stats.total_departments} departments`}
        />
        <StatCard
          label="Biggest Drop"
          value={data.biggest_drop ? `-${data.biggest_drop.drop.toFixed(1)}` : '—'}
          suffix={data.biggest_drop ? '%' : undefined}
          icon={<TrendingDown className="w-4.5 h-4.5" />}
          accent="cyan"
          footnote={data.biggest_drop ? `${data.biggest_drop.section_name} (${data.biggest_drop.department_code})` : 'No significant drops'}
        />
      </motion.div>

      {/* Charts row: trend + distribution */}
      <motion.div className="page-grid" style={{ gridTemplateColumns: '1.6fr 1fr' }} variants={panelVariants}>
        <ChartCard title="Attendance Trend" subtitle="Institution-wide, last recorded days" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="deanTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }}
                formatter={(v: number) => [`${v?.toFixed(1) ?? '—'}%`, 'Attendance']}
              />
              <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#deanTrendFill)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attendance Distribution" subtitle="All classes today" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
                {distributionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
            {distributionData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                {d.name} · {d.value}
              </div>
            ))}
          </div>
        </ChartCard>
      </motion.div>

      {/* Department comparison bar chart */}
      <motion.div variants={panelVariants}>
        <ChartCard title="Department Comparison" subtitle={`Attendance % vs ${threshold}% threshold`} height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptBarData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Attendance']}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={44}>
                {deptBarData.map((d) => (
                  <Cell key={d.name} fill={d.pass ? 'var(--pass)' : 'var(--fail)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Heatmap + sidebar */}
      <div className="page-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
        <motion.div variants={panelVariants}>
          <SectionCard title="Section Heatmap" subtitle="Every section, every department" noPad>
            <div className="px-1 pb-2">
              <AnimatedHeatmap apiData={data.heatmap} />
            </div>
          </SectionCard>
        </motion.div>

        <motion.div className="flex flex-col gap-4" variants={panelVariants}>
          <AlertsPanel />

          <SectionCard title={`Chronic Below ${threshold}%`} subtitle="3+ consecutive days">
            {data.chronic_offenders.length === 0 ? (
              <EmptyState title="No chronic offenders" description="Every section is recovering within range." />
            ) : (
              <div className="flex flex-col gap-1">
                {data.chronic_offenders.slice(0, 5).map((offender) => (
                  <div key={offender.section_id} className="flex items-center justify-between py-2 border-t border-line first:border-0">
                    <div>
                      <div className="font-semibold text-sm text-ink">{offender.section_name}</div>
                      <div className="text-xs text-muted">{offender.department_code}</div>
                    </div>
                    <StatusBadge tone="fail">{offender.consecutive_days} days</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </motion.div>
      </div>

      {/* Full department table */}
      <motion.div variants={panelVariants}>
        <SectionCard title="All Departments" subtitle="Searchable, sorted by rank" noPad>
          <DataTable
            columns={rankingColumns}
            rows={data.department_rankings}
            searchPlaceholder="Search departments…"
            filterFn={(r, q) => r.department_name.toLowerCase().includes(q.toLowerCase()) || r.department_code.toLowerCase().includes(q.toLowerCase())}
          />
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
