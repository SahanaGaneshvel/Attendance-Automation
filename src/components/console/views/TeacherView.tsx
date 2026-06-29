import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  getSectionById,
  getDailyClassAttendance,
  getDepartmentDailyStats,
  getSectionTrend,
  submitManualAttendance,
} from '@/data/store'
import { cn } from '@/lib/utils'

// Ring chart component
function RingChart({
  percentage,
  size = 140,
  strokeWidth = 14,
  threshold = 75,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  threshold?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const isPass = percentage >= threshold
  const color = isPass ? 'var(--pass)' : 'var(--fail)'
  const bgColor = isPass ? 'var(--pass-bg)' : 'var(--fail-bg)'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-semibold"
          style={{ fontSize: size * 0.22, color, letterSpacing: '-1px' }}
        >
          {Math.round(percentage)}%
        </span>
        <span className="text-[10px] text-muted uppercase tracking-wide">Today</span>
      </div>
    </div>
  )
}

// Simple sparkline for 20-day trend
function TrendSparkline({ data, threshold = 75 }: { data: number[]; threshold?: number }) {
  const height = 50
  const width = 200
  const padding = 2

  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - (value / 100) * chartHeight
    return { x, y, value }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const thresholdY = padding + chartHeight - (threshold / 100) * chartHeight

  return (
    <svg width={width} height={height} className="overflow-visible">
      <line
        x1={padding}
        y1={thresholdY}
        x2={width - padding}
        y2={thresholdY}
        stroke="var(--line-2)"
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      <path
        d={pathD}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest point highlighted */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={4}
          fill={points[points.length - 1].value >= threshold ? 'var(--pass)' : 'var(--fail)'}
        />
      )}
    </svg>
  )
}

export function TeacherView() {
  const { selectedDate, threshold, showToast } = useAppStore()

  // Mock teacher's assigned class (in real app, comes from auth)
  const myClassId = 'cse-a'
  const myClass = getSectionById(myClassId)
  const myDeptId = myClass?.departmentId ?? 'cse'

  // Entry state
  const [absentRolls, setAbsentRolls] = useState<number[]>([])
  const [inputValue, setInputValue] = useState('')

  // Get class attendance
  const classAttendance = useMemo(
    () => getDailyClassAttendance(myClassId, selectedDate),
    [selectedDate]
  )

  // Get department stats for comparison
  const deptStats = useMemo(() => getDepartmentDailyStats(myDeptId, selectedDate), [selectedDate])

  // Get 20-day trend
  const trendData = useMemo(() => {
    return getSectionTrend(myClassId).slice(-20).map((t) => t.percentage)
  }, [])

  const strength = myClass?.strength ?? 60
  const present = classAttendance?.present ?? strength - absentRolls.length
  const percentage = classAttendance?.percentage ?? ((strength - absentRolls.length) / strength) * 100
  const submitted = classAttendance !== null

  const handleAddRoll = () => {
    const roll = parseInt(inputValue.trim(), 10)
    if (!isNaN(roll) && roll >= 1 && roll <= strength && !absentRolls.includes(roll)) {
      setAbsentRolls([...absentRolls, roll].sort((a, b) => a - b))
      setInputValue('')
    }
  }

  const handleRemoveRoll = (roll: number) => {
    setAbsentRolls(absentRolls.filter((r) => r !== roll))
  }

  const handleSubmit = () => {
    const success = submitManualAttendance(myClassId, selectedDate, absentRolls.length)
    if (success) {
      showToast('Attendance submitted successfully', 'success')
      setAbsentRolls([])
    } else {
      showToast('Failed to submit attendance', 'error')
    }
  }

  const handleNoSession = () => {
    showToast('Marked as no session', 'info')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddRoll()
    }
  }

  // Benchmark comparison data
  const benchmarks = [
    { label: 'Your Class', value: percentage, isMe: true },
    { label: 'Dept Avg', value: deptStats?.averagePercentage ?? 0, isMe: false },
    { label: 'Threshold', value: threshold, isMe: false, isThreshold: true },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="view-title">{myClass?.name ?? 'My Class'}</h1>
        <p className="view-subtitle">Teacher Dashboard · {selectedDate}</p>
      </div>

      {/* Hero Cards */}
      <div className="hero-grid teacher">
        {/* Lead card with ring */}
        <div className="hero-card lead">
          <div className="hero-card-label">Class Attendance</div>
          <div className="ring-wrap">
            <RingChart percentage={percentage} threshold={threshold} />
            <div className="ring-meta">
              <div className="rm-big">{present} / {strength}</div>
              <div className="rm-label">Present today</div>
              {submitted && (
                <div className="stat-tag pass mt-2">Submitted</div>
              )}
            </div>
          </div>
        </div>

        {/* Cumulative this term */}
        <div className="hero-card">
          <div className="hero-card-label">Term Average</div>
          <div className="hero-big">
            {(trendData.reduce((a, b) => a + b, 0) / trendData.length || 0).toFixed(1)}<small>%</small>
          </div>
          <div className="hero-meta">
            Last {trendData.length} days
          </div>
        </div>

        {/* Absent count */}
        <div className="hero-card">
          <div className="hero-card-label">Absent Today</div>
          <div className={cn(
            'hero-big',
            (strength - present) > (strength * 0.25) ? 'fail' : ''
          )}>
            {strength - present}
          </div>
          <div className="hero-meta">
            students
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="content-grid" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Entry Panel - Action first! */}
        <div className="entry-panel">
          <h3>Mark Absentees</h3>
          <p className="entry-subtitle">
            Enter roll numbers of absent students · {myClass?.name} ({strength} students)
          </p>

          {/* Chips container */}
          <div className="chips-container">
            {absentRolls.length === 0 ? (
              <span className="text-faint text-sm">No absentees marked yet</span>
            ) : (
              absentRolls.map((roll) => (
                <div key={roll} className="absent-chip">
                  {roll}
                  <button onClick={() => handleRemoveRoll(roll)} title="Remove">
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Input row */}
          <div className="entry-input-row">
            <input
              type="text"
              className="entry-input"
              placeholder="Enter roll number..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={submitted}
            />
            <button
              className="entry-btn"
              onClick={handleAddRoll}
              disabled={submitted || !inputValue.trim()}
            >
              Add
            </button>
          </div>

          {/* Action buttons */}
          <div className="entry-actions">
            <button
              className="entry-btn"
              onClick={handleSubmit}
              disabled={submitted}
            >
              {submitted ? 'Submitted' : 'Submit Attendance'}
            </button>
            <button
              className="entry-btn ghost"
              onClick={handleNoSession}
              disabled={submitted}
            >
              No Session Today
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Benchmark Comparison */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Benchmark</span>
              <span className="panel-subtitle">vs department & threshold</span>
            </div>
            <div className="comparison-list">
              {benchmarks.map((item, index) => (
                <div key={index} className={cn('comparison-row', item.isMe && 'me')}>
                  <div className="comparison-name">
                    {item.label}
                    {item.isMe && <span className="me-flag">YOU</span>}
                  </div>
                  <div className="comparison-track">
                    <div
                      className={cn(
                        'comparison-fill',
                        item.isMe ? 'me' : item.value >= threshold ? 'pass' : 'fail'
                      )}
                      style={{ width: `${item.value}%` }}
                    />
                    {!item.isThreshold && (
                      <div className="comparison-threshold" style={{ left: `${threshold}%` }} />
                    )}
                  </div>
                  <span className="comparison-value">{Math.round(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 20-Day Trend */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">20-Day Trend</span>
              <span className="panel-subtitle">{myClass?.name}</span>
            </div>
            <div className="mt-2">
              <TrendSparkline data={trendData} threshold={threshold} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Quick Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="text-xs text-muted uppercase">Best Day</div>
                <div className="font-data font-semibold text-pass">
                  {Math.max(...trendData).toFixed(0)}%
                </div>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="text-xs text-muted uppercase">Worst Day</div>
                <div className="font-data font-semibold text-fail">
                  {Math.min(...trendData).toFixed(0)}%
                </div>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="text-xs text-muted uppercase">Days Below 75%</div>
                <div className="font-data font-semibold">
                  {trendData.filter((d) => d < threshold).length}
                </div>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg">
                <div className="text-xs text-muted uppercase">Class Strength</div>
                <div className="font-data font-semibold">{strength}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
