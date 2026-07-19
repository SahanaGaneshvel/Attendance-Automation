/**
 * HOD Sections Comparison View - Detailed section-by-section comparison
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Users2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useAuthContext } from '@/contexts/AuthContext'
import { getHodDashboard, type HodDashboardData } from '@/api'
import { staggerContainer, panelVariants } from '@/lib/motion'
import { StatCard } from '@/components/ui/StatCard'
import { SectionCard, ChartCard } from '@/components/ui/ChartCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState, CardSkeleton } from '@/components/ui/EmptyState'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { cn } from '@/lib/utils'

export function HodSectionsView() {
  const { selectedDate, threshold } = useAppStore()
  const { user } = useAuthContext()

  const myDeptName = user?.scope?.department_name ?? 'Department'

  const [dashboardData, setDashboardData] = useState<HodDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const sections = dashboardData?.sections ?? []

  // Calculate stats
  const sectionStats = useMemo(() => {
    const recorded = sections.filter((s) => s.status === 'recorded')
    if (recorded.length === 0) return { best: null, worst: null, belowThreshold: 0 }

    const sorted = [...recorded].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      belowThreshold: recorded.filter((s) => (s.percentage ?? 0) < threshold).length,
    }
  }, [sections, threshold])

  // Bar chart data
  const barData = useMemo(() => {
    return sections
      .filter((s) => s.status === 'recorded')
      .map((s) => ({
        name: s.section_name,
        value: s.percentage ?? 0,
        pass: (s.percentage ?? 0) >= threshold,
      }))
      .sort((a, b) => b.value - a.value)
  }, [sections, threshold])

  // Table rows
  const sectionRows = sections.map((s) => ({
    id: s.section_id,
    name: s.section_name,
    strength: s.strength,
    present: s.present ?? 0,
    absent: s.absent ?? 0,
    percentage: s.percentage ?? 0,
    status: s.status,
  }))

  const sectionColumns: DataTableColumn<(typeof sectionRows)[number]>[] = [
    {
      key: 'name',
      header: 'Section',
      render: (r) => <span className="font-semibold text-ink">{r.name}</span>,
    },
    { key: 'strength', header: 'Strength', align: 'right', render: (r) => r.strength },
    {
      key: 'present',
      header: 'Present',
      align: 'right',
      render: (r) => (r.status === 'recorded' ? r.present : '—'),
    },
    {
      key: 'absent',
      header: 'Absent',
      align: 'right',
      render: (r) => (r.status === 'recorded' ? r.absent : '—'),
    },
    {
      key: 'percentage',
      header: 'Attendance',
      align: 'right',
      render: (r) =>
        r.status === 'recorded' ? (
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
      render: (r) => {
        if (r.status === 'recorded') {
          return <StatusBadge tone={r.percentage >= threshold ? 'pass' : 'fail'}>Recorded</StatusBadge>
        }
        if (r.status === 'no_session') {
          return <StatusBadge tone="neutral">No Session</StatusBadge>
        }
        return <StatusBadge tone="warn">Pending</StatusBadge>
      },
    },
  ]

  if (isLoading && !dashboardData) {
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
          label="Total Sections"
          value={sections.length}
          icon={<Users2 className="w-4.5 h-4.5" />}
          accent="indigo"
          footnote={myDeptName}
        />
        <StatCard
          label="Best Section"
          value={sectionStats.best ? `${sectionStats.best.percentage?.toFixed(1)}%` : '—'}
          icon={<TrendingUp className="w-4.5 h-4.5" />}
          accent="emerald"
          footnote={sectionStats.best?.section_name ?? 'No data'}
        />
        <StatCard
          label="Needs Attention"
          value={sectionStats.worst ? `${sectionStats.worst.percentage?.toFixed(1)}%` : '—'}
          icon={<TrendingDown className="w-4.5 h-4.5" />}
          accent="red"
          footnote={sectionStats.worst?.section_name ?? 'No data'}
        />
        <StatCard
          label={`Below ${threshold}%`}
          value={sectionStats.belowThreshold}
          icon={<AlertTriangle className="w-4.5 h-4.5" />}
          accent={sectionStats.belowThreshold > 0 ? 'amber' : 'emerald'}
          footnote="sections"
        />
      </motion.div>

      {/* Bar chart comparison */}
      <motion.div variants={panelVariants}>
        <ChartCard title="Section Comparison" subtitle={`${myDeptName} - Today's attendance by section`} height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={true} vertical={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-2)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid var(--line)', fontSize: 12 }}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Attendance']}
              />
              <ReferenceLine x={threshold} stroke="var(--line-2)" strokeDasharray="4 4" />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {barData.map((d) => (
                  <Cell key={d.name} fill={d.pass ? 'var(--pass)' : 'var(--fail)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Full section table */}
      <motion.div variants={panelVariants}>
        <SectionCard title="All Sections" subtitle={`${myDeptName} - Detailed breakdown`} noPad>
          <DataTable
            columns={sectionColumns}
            rows={sectionRows}
            searchPlaceholder="Search sections..."
            filterFn={(r, q) => r.name.toLowerCase().includes(q.toLowerCase())}
          />
        </SectionCard>
      </motion.div>
    </motion.div>
  )
}
