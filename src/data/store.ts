// ============================================================
// TEMPORARY STORE - Will be replaced when Milestone 0 contract shapes arrive
// Currently maintaining old flat structure for visual components to work
// Per-student tracking REMOVED - class-level only
// ============================================================

// Old types kept temporarily for existing widgets
interface Department {
  id: string
  name: string
  code: string
}

interface SectionClass {
  id: string
  departmentId: string
  name: string
  strength: number
  advisor: string
}

interface DailyClassAttendance {
  sectionId: string
  date: string
  status: 'recorded' | 'no_session' | 'pending'
  present: number
  absent: number
  strength: number
  percentage: number
}

interface DepartmentDailyStats {
  departmentId: string
  date: string
  averagePercentage: number
  totalPresent: number
  totalStrength: number
  sectionsBelow75: number
  sectionsTotal: number
}

interface CollegeTrendPoint {
  date: string
  percentage: number
  cumulativePercentage: number
}

interface ClassTrendPoint {
  date: string
  percentage: number
}

interface BiggestMover {
  sectionId: string
  section: SectionClass
  department: Department
  currentWeekAvg: number
  previousWeekAvg: number
  delta: number
}

interface ChronicOffender {
  sectionId: string
  section: SectionClass
  department: Department
  consecutiveDaysBelow75: number
  currentPercentage: number
}

import {
  departments,
  sections,
  attendanceRecords,
  workingDays,
  TODAY,
  getDepartmentById,
  getSectionById,
  getSectionsByDepartment,
  getRecordByDateAndSection,
} from './mock'

// Re-export basic getters (NO STUDENT EXPORTS)
export {
  departments,
  sections,
  workingDays,
  TODAY,
  getDepartmentById,
  getSectionById,
  getSectionsByDepartment,
}

// ============ Daily Class Attendance ============

export function getDailyClassAttendance(
  sectionId: string,
  date: string
): DailyClassAttendance | null {
  const section = getSectionById(sectionId)
  const record = getRecordByDateAndSection(sectionId, date)

  if (!section) return null

  // Use absentRolls.length for backward compat with mock, but concept is class-level
  const absent = record?.absentRolls.length ?? 0
  const present = section.strength - absent
  const percentage = section.strength > 0 ? (present / section.strength) * 100 : 0

  return {
    sectionId,
    date,
    status: record ? 'recorded' as const : 'pending' as const,
    present,
    absent,
    strength: section.strength,
    percentage,
  }
}

export function getAllClassesAttendance(date: string): DailyClassAttendance[] {
  return sections
    .map((s) => getDailyClassAttendance(s.id, date))
    .filter((a): a is DailyClassAttendance => a !== null)
}

// ============ Department Stats (weighted aggregation) ============

export function getDepartmentDailyStats(
  deptId: string,
  date: string
): DepartmentDailyStats | null {
  const deptSections = getSectionsByDepartment(deptId)
  if (deptSections.length === 0) return null

  let totalPresent = 0
  let totalStrength = 0
  let sectionsBelow75 = 0

  deptSections.forEach((section) => {
    const attendance = getDailyClassAttendance(section.id, date)
    if (attendance) {
      // Weighted: sum present and strength, not average percentages
      totalPresent += attendance.present
      totalStrength += attendance.strength
      if (attendance.percentage < 75) {
        sectionsBelow75++
      }
    }
  })

  return {
    departmentId: deptId,
    date,
    // Weighted average: total present / total strength
    averagePercentage: totalStrength > 0 ? (totalPresent / totalStrength) * 100 : 0,
    totalPresent,
    totalStrength,
    sectionsBelow75,
    sectionsTotal: deptSections.length,
  }
}

export function getAllDepartmentStats(date: string): DepartmentDailyStats[] {
  return departments
    .map((d) => getDepartmentDailyStats(d.id, date))
    .filter((s): s is DepartmentDailyStats => s !== null)
}

// ============ College-level Stats ============

export function getCollegeStats(date: string) {
  const allAttendance = getAllClassesAttendance(date)
  const allDeptStats = getAllDepartmentStats(date)

  // Weighted aggregation
  const totalPresent = allAttendance.reduce((sum, a) => sum + a.present, 0)
  const totalStrength = allAttendance.reduce((sum, a) => sum + a.strength, 0)
  const overallPercentage = totalStrength > 0 ? (totalPresent / totalStrength) * 100 : 0

  const classesBelow75 = allAttendance.filter((a) => a.percentage < 75)

  return {
    date,
    overallPercentage,
    totalPresent,
    totalStrength,
    totalClasses: allAttendance.length,
    classesBelow75Count: classesBelow75.length,
    classesBelow75,
    departmentStats: allDeptStats,
  }
}

// ============ Trend Data ============

export function getCollegeTrend(): CollegeTrendPoint[] {
  let cumulativePresent = 0
  let cumulativeTotal = 0

  return workingDays.map((date) => {
    const stats = getCollegeStats(date)
    cumulativePresent += stats.totalPresent
    cumulativeTotal += stats.totalStrength

    return {
      date,
      percentage: stats.overallPercentage,
      cumulativePercentage:
        cumulativeTotal > 0 ? (cumulativePresent / cumulativeTotal) * 100 : 0,
    }
  })
}

export function getDepartmentTrend(deptId: string): ClassTrendPoint[] {
  return workingDays.map((date) => {
    const stats = getDepartmentDailyStats(deptId, date)
    return {
      date,
      percentage: stats?.averagePercentage ?? 0,
    }
  })
}

export function getSectionTrend(sectionId: string): ClassTrendPoint[] {
  return workingDays.map((date) => {
    const attendance = getDailyClassAttendance(sectionId, date)
    return {
      date,
      percentage: attendance?.percentage ?? 0,
    }
  })
}

export function getSectionsTrendByDepartment(
  deptId: string
): { sectionId: string; sectionName: string; data: ClassTrendPoint[] }[] {
  const deptSections = getSectionsByDepartment(deptId)
  return deptSections.map((section) => ({
    sectionId: section.id,
    sectionName: section.name,
    data: getSectionTrend(section.id),
  }))
}

// ============ Attendance Distribution ============

export function getAttendanceDistribution(date: string): {
  band: string
  min: number
  max: number
  count: number
  classes: DailyClassAttendance[]
}[] {
  const allAttendance = getAllClassesAttendance(date)

  const bands = [
    { band: '≥90%', min: 90, max: 100 },
    { band: '80-90%', min: 80, max: 90 },
    { band: '75-80%', min: 75, max: 80 },
    { band: '<75%', min: 0, max: 75 },
  ]

  return bands.map(({ band, min, max }) => {
    const classes = allAttendance.filter(
      (a) => a.percentage >= min && (max === 100 ? a.percentage <= max : a.percentage < max)
    )
    return { band, min, max, count: classes.length, classes }
  })
}

// ============ Chronic Offenders ============

export function getChronicOffenders(
  minConsecutiveDays: number = 3,
  threshold: number = 75
): ChronicOffender[] {
  const offenders: ChronicOffender[] = []

  sections.forEach((section) => {
    let consecutiveDays = 0
    let currentPercentage = 0

    // Check from most recent day backwards
    for (let i = workingDays.length - 1; i >= 0; i--) {
      const attendance = getDailyClassAttendance(section.id, workingDays[i])
      if (attendance && attendance.percentage < threshold) {
        consecutiveDays++
        if (i === workingDays.length - 1) {
          currentPercentage = attendance.percentage
        }
      } else {
        break
      }
    }

    if (consecutiveDays >= minConsecutiveDays) {
      const dept = getDepartmentById(section.departmentId)
      if (dept) {
        offenders.push({
          sectionId: section.id,
          section,
          department: dept,
          consecutiveDaysBelow75: consecutiveDays,
          currentPercentage,
        })
      }
    }
  })

  return offenders.sort(
    (a, b) => b.consecutiveDaysBelow75 - a.consecutiveDaysBelow75
  )
}

// ============ Biggest Movers ============

export function getBiggestMovers(): { risers: BiggestMover[]; fallers: BiggestMover[] } {
  const movers: BiggestMover[] = []

  const currentWeekDays = workingDays.slice(-5)
  const previousWeekDays = workingDays.slice(-10, -5)

  sections.forEach((section) => {
    const currentWeekAttendance = currentWeekDays
      .map((d) => getDailyClassAttendance(section.id, d))
      .filter((a): a is DailyClassAttendance => a !== null)

    const previousWeekAttendance = previousWeekDays
      .map((d) => getDailyClassAttendance(section.id, d))
      .filter((a): a is DailyClassAttendance => a !== null)

    if (currentWeekAttendance.length === 0 || previousWeekAttendance.length === 0) {
      return
    }

    // Weighted averages for week comparison
    const currentPresent = currentWeekAttendance.reduce((s, a) => s + a.present, 0)
    const currentStrength = currentWeekAttendance.reduce((s, a) => s + a.strength, 0)
    const currentWeekAvg = currentStrength > 0 ? (currentPresent / currentStrength) * 100 : 0

    const prevPresent = previousWeekAttendance.reduce((s, a) => s + a.present, 0)
    const prevStrength = previousWeekAttendance.reduce((s, a) => s + a.strength, 0)
    const previousWeekAvg = prevStrength > 0 ? (prevPresent / prevStrength) * 100 : 0

    const delta = currentWeekAvg - previousWeekAvg
    const dept = getDepartmentById(section.departmentId)

    if (dept) {
      movers.push({
        sectionId: section.id,
        section,
        department: dept,
        currentWeekAvg,
        previousWeekAvg,
        delta,
      })
    }
  })

  const sorted = movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const risers = sorted.filter((m) => m.delta > 0).slice(0, 5)
  const fallers = sorted.filter((m) => m.delta < 0).slice(0, 5)

  return { risers, fallers }
}

// ============ Comparison with Previous Day ============

export function getPreviousDay(date: string): string | null {
  const index = workingDays.indexOf(date)
  return index > 0 ? workingDays[index - 1] : null
}

export function getCollegeStatsWithDelta(date: string) {
  const current = getCollegeStats(date)
  const previousDate = getPreviousDay(date)
  const previous = previousDate ? getCollegeStats(previousDate) : null

  return {
    ...current,
    delta: previous ? current.overallPercentage - previous.overallPercentage : 0,
    previousPercentage: previous?.overallPercentage ?? null,
  }
}

// ============ Sparkline Data (last 7 days) ============

export function getSparklineData(
  metric: 'college' | { type: 'department'; id: string } | { type: 'section'; id: string }
): number[] {
  const last7Days = workingDays.slice(-7)

  return last7Days.map((date) => {
    if (metric === 'college') {
      return getCollegeStats(date).overallPercentage
    } else if (metric.type === 'department') {
      return getDepartmentDailyStats(metric.id, date)?.averagePercentage ?? 0
    } else {
      return getDailyClassAttendance(metric.id, date)?.percentage ?? 0
    }
  })
}

// ============ Get Biggest Single-Day Drop ============

export function getBiggestSingleDayDrop(date: string): {
  section: SectionClass
  department: Department
  drop: number
  currentPct: number
  previousPct: number
} | null {
  const previousDate = getPreviousDay(date)
  if (!previousDate) return null

  let biggestDrop = 0
  let result: {
    section: SectionClass
    department: Department
    drop: number
    currentPct: number
    previousPct: number
  } | null = null

  sections.forEach((section) => {
    const current = getDailyClassAttendance(section.id, date)
    const previous = getDailyClassAttendance(section.id, previousDate)

    if (current && previous) {
      const drop = previous.percentage - current.percentage
      if (drop > biggestDrop) {
        biggestDrop = drop
        const dept = getDepartmentById(section.departmentId)
        if (dept) {
          result = {
            section,
            department: dept,
            drop,
            currentPct: current.percentage,
            previousPct: previous.percentage,
          }
        }
      }
    }
  })

  return result
}

// ============ Manual Entry (class-level, no roll numbers) ============

export function submitManualAttendance(
  sectionId: string,
  date: string,
  absentCount: number
): boolean {
  const section = getSectionById(sectionId)
  if (!section) return false

  // Validate absent count
  const validAbsentCount = Math.max(0, Math.min(absentCount, section.strength))

  // Create a mock record with absentRolls for backward compat
  // In the real system, this will just be absentCount
  const mockRolls = Array.from({ length: validAbsentCount }, (_, i) => i + 1)

  const record = {
    sectionId,
    date,
    absentRolls: mockRolls,
  }

  // Update the main records array
  const existingIndex = attendanceRecords.findIndex(
    (r) => r.sectionId === sectionId && r.date === date
  )
  if (existingIndex >= 0) {
    attendanceRecords[existingIndex] = record
  } else {
    attendanceRecords.push(record)
  }

  return true
}
