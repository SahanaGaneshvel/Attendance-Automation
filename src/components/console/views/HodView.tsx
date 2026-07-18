import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { Users2, ClipboardCheck, Trophy } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { getHodDashboard, type HodDashboardData } from '@/api'
import { cn } from '@/lib/utils'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { AlertsPanel } from '../AlertsPanel'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard, ChartCard } from '@/components/ui/ChartCard'
import { StatusBadge, thresholdBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton } from '@/components/ui/EmptyState'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'

export function HodView() {
  const { selectedDate, threshold } = useAppStore()
  const { user } = useAuthContext()

  const [dashboardData, setDashboardData] = useState<HodDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const myDeptName = user?.scope?.department_name ?? 'Department'

  const fetchDashboard = useCallback(async () => {
    if (!user?.scope?.department_id) return
    setIsLoading(true)
    try {
      const data = await getHodDashboard(selectedDate)
      setDashboardData(data)
    } catch {
      setDashboardData(null)
    } finally {
      setIsLoading(false)
    }
  }, [user?.scope?.department_id, selectedDate])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const stats = dashboardData?.stats ?? {
    percentage: 0,
    total_present: 0,
    total_strength: 0,
    recorded_count: 0,
    pending_count: 0,
    no_session_count: 0,
    below_threshold_count: 0,
    my_rank: 0,
    total_departments: 0,
  }

  const sections = dashboardData?.sections ?? []
  const peerComparison = dashboardData?.peer_comparison ?? []

  const sectionRows = sections.map((s) => ({
    id: s.section_id,
    name: s.section_name,
    strength: s.strength,
    percentage: s.percentage ?? 0,
    present: s.present ?? 0,
    reported: s.status === 'recorded',
    isNoSession: s.status === 'no_session',
  }))

  const peerBarData = useMemo(
    () => peerComparison.map((p) => ({ name: p.department_code, value: p.percentage ?? 0, isMe: p.is_mine, pass: (p.percentage ?? 0) >= threshold })),
    [peerComparison, threshold]
  )

  const trendLineData = useMemo(
    () =>
      (dashboardData?.trend ?? []).map((t) => ({
        date: t.date.slice(5),
        value: t.status === 'recorded' ? t.percentage : null,
      })),
    [dashboardData]
  )

  const totalSections = sections.length
  const reportedCount = stats.recorded_count + stats.no_session_count

  const sectionColumns: DataTableColumn<(typeof sectionRows)[number]>[] = [
    { key: 'name', header: 'Section', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
    { key: 'strength', header: 'Strength', align: 'right', render: (r) => r.strength },
    { key: 'present', header: 'Present', align: 'right', render: (r) => (r.reported ? r.present : '—') },
    {
      key: 'pct',
      header: 'Attendance',
      align: 'right',
      render: (r) =>
        r.reported ? (
          <span className={cn('font-mono font-bold', r.percentage >= threshold ? 'text-pass' : 'text-fail')}>
            {r.percentage.toFixed(1)}%
          </span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.reported ? (
          <StatusBadge tone={r.percentage >= threshold ? 'pass' : 'fail'}>Reported</StatusBadge>
        ) : r.isNoSession ? (
          <StatusBadge tone="neutral">No session</StatusBadge>
        ) : (
          <StatusBadge tone="warn">Pending</StatusBadge>
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

  const overallBadge = thresholdBadge(stats.percentage ?? 0, threshold)

  return (
    <motion.div className="flex flex-col gap-5" variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div className="page-grid grid-cols-3" variants={panelVariants}>
        <StatCard
          label="Department Attendance"
          value={(stats.percentage ?? 0).toFixed(1)}
          suffix="%"
          icon={<Users2 className="w-4.5 h-4.5" />}
          accent={overallBadge.tone === 'pass' ? 'emerald' : overallBadge.tone === 'fail' ? 'red' : 'amber'}
          footnote={`${stats.total_present} / ${stats.total_strength} students`}
        />
        <StatCard
          label="Rank Among Departments"
          value={`#${stats.my_rank}`}
          icon={<Trophy className="w-4.5 h-4.5" />}
          accent="indigo"
          footnote={`of ${stats.total_departments} departments`}
        />
        <StatCard
          label="Reporting Status"
          value={`${reportedCount}/${totalSections}`}
          icon={<ClipboardCheck className="w-4.5 h-4.5" />}
          accent={stats.pending_count > 0 ? 'amber' : 'emerald'}
          footnote={stats.pending_count === 0 ? 'All sections reported' : `${stats.pending_count} pending`}
        />
      </motion.div>

      <motion.div className="page-grid" style={{ gridTemplateColumns: '1fr 1fr' }} variants={panelVariants}>
        <ChartCard title="Peer Departments" subtitle="Today's ranking vs your department" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peerBarData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Attendance']} />
              <ReferenceLine y={threshold} stroke="var(--line-2)" strokeDasharray="4 4" />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={40}>
                {peerBarData.map((d) => (
                  <Cell key={d.name} fill={d.isMe ? 'var(--accent)' : d.pass ? 'var(--pass)' : 'var(--fail)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department Trend" subtitle="Last 20 recorded days" height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendLineData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }} formatter={(v: number) => [`${v?.toFixed(1) ?? '—'}%`, 'Attendance']} />
              <ReferenceLine y={threshold} stroke="var(--line-2)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <div className="page-grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        <motion.div variants={panelVariants}>
          <SectionCard title="My Sections Today" subtitle={`${totalSections} sections`} noPad>
            <DataTable
              columns={sectionColumns}
              rows={sectionRows}
              searchPlaceholder="Search sections…"
              filterFn={(r, q) => r.name.toLowerCase().includes(q.toLowerCase())}
            />
          </SectionCard>
        </motion.div>

        <motion.div className="flex flex-col gap-4" variants={panelVariants}>
          <AlertsPanel />
          <SectionCard title="Department Snapshot" subtitle={myDeptName}>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Recorded</span>
                <span className="font-mono font-semibold text-ink">{stats.recorded_count}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Pending</span>
                <span className="font-mono font-semibold text-warn">{stats.pending_count}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">No session</span>
                <span className="font-mono font-semibold text-faint">{stats.no_session_count}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Below threshold</span>
                <span className="font-mono font-semibold text-fail">{stats.below_threshold_count}</span>
              </div>
            </div>
          </SectionCard>
        </motion.div>
      </div>
    </motion.div>
  )
}
