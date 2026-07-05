/**
 * API Adapters
 * Transform backend responses to frontend types.
 * Handles ID conversions, field renames, and structure differences.
 */
import type {
  CollegeStatsResponse,
  DepartmentStats as ApiDepartmentStats,
  ChronicOffender as ApiChronicOffender,
  BiggestDrop as ApiBiggestDrop,
  BiggestMover as ApiBiggestMover,
  OverviewResponse,
  DepartmentHeat,
  SectionHeat,
  DepartmentSummaryResponse,
  SectionDetailResponse,
  TrendResponse,
  WorkingDaysResponse,
} from './types'

// ============ Frontend Types (matching store.ts interfaces) ============

export interface Department {
  id: string
  name: string
  code: string
}

export interface SectionClass {
  id: string
  departmentId: string
  name: string
  strength: number
  year: string
  semester: number
}

export interface DailyClassAttendance {
  sectionId: string
  date: string
  present: number
  absent: number
  strength: number
  percentage: number
  status: 'recorded' | 'no_session' | 'pending'
}

export interface DepartmentDailyStats {
  departmentId: string
  date: string
  averagePercentage: number
  totalPresent: number
  totalStrength: number
  sectionsBelow75: number
  sectionsTotal: number
  sectionsRecorded: number
  sectionsPending: number
  sectionsNoSession: number
}

export interface CollegeStats {
  date: string
  overallPercentage: number
  totalPresent: number
  totalStrength: number
  totalClasses: number
  classesBelow75Count: number
  classesRecorded: number
  classesPending: number
  classesNoSession: number
  departmentStats: DepartmentDailyStats[]
}

export interface ChronicOffender {
  sectionId: string
  section: SectionClass
  department: Department
  consecutiveDaysBelow75: number
  currentPercentage: number
}

export interface BiggestMover {
  sectionId: string
  section: SectionClass
  department: Department
  currentWeekAvg: number
  previousWeekAvg: number
  delta: number
}

export interface BiggestDropInfo {
  section: SectionClass
  department: Department
  drop: number
  currentPct: number
  previousPct: number
}

export interface TrendPoint {
  date: string
  percentage: number
}

// ============ Adapter Functions ============

/**
 * Adapt college stats response to frontend format
 */
export function adaptCollegeStats(response: CollegeStatsResponse): CollegeStats {
  return {
    date: response.date,
    overallPercentage: response.overall_percentage,
    totalPresent: response.total_present,
    totalStrength: response.total_strength,
    totalClasses: response.total_classes,
    classesBelow75Count: response.classes_below_threshold,
    classesRecorded: response.classes_recorded,
    classesPending: response.classes_pending,
    classesNoSession: response.classes_no_session,
    departmentStats: response.department_stats.map(adaptDepartmentStats),
  }
}

/**
 * Adapt department stats from API
 */
export function adaptDepartmentStats(stat: ApiDepartmentStats): DepartmentDailyStats {
  return {
    departmentId: stat.id,
    date: '', // Will be set by caller
    averagePercentage: stat.average_percentage,
    totalPresent: stat.total_present,
    totalStrength: stat.total_strength,
    sectionsBelow75: stat.sections_below_threshold,
    sectionsTotal: stat.sections_total,
    sectionsRecorded: stat.sections_recorded,
    sectionsPending: stat.sections_pending,
    sectionsNoSession: stat.sections_no_session,
  }
}

/**
 * Extract departments from overview response
 */
export function adaptDepartmentsFromOverview(response: OverviewResponse): Department[] {
  return response.heatmap.map((dept: DepartmentHeat) => ({
    id: String(dept.dept_id),
    name: dept.department,
    code: dept.department, // Backend uses name as code in heatmap
  }))
}

/**
 * Extract sections from overview response
 */
export function adaptSectionsFromOverview(
  response: OverviewResponse
): Map<string, SectionClass[]> {
  const sectionsByDept = new Map<string, SectionClass[]>()

  response.heatmap.forEach((dept: DepartmentHeat) => {
    const deptId = String(dept.dept_id)
    const sections: SectionClass[] = dept.sections.map((sec: SectionHeat, index: number) => ({
      id: `${deptId}-${index}`, // Composite ID since backend doesn't provide section IDs in overview
      departmentId: deptId,
      name: sec.name,
      strength: 0, // Not provided in overview
      year: sec.year,
      semester: sec.semester,
    }))
    sectionsByDept.set(deptId, sections)
  })

  return sectionsByDept
}

/**
 * Adapt chronic offenders response
 */
export function adaptChronicOffenders(
  offenders: ApiChronicOffender[]
): ChronicOffender[] {
  return offenders.map((o) => ({
    sectionId: o.section_id,
    section: {
      id: o.section_id,
      departmentId: o.department_id,
      name: o.section_name,
      strength: 0,
      year: o.year,
      semester: o.semester,
    },
    department: {
      id: o.department_id,
      name: o.department_name,
      code: o.department_code,
    },
    consecutiveDaysBelow75: o.consecutive_days_below,
    currentPercentage: o.current_percentage,
  }))
}

/**
 * Adapt biggest drop response
 */
export function adaptBiggestDrop(drop: ApiBiggestDrop | null): BiggestDropInfo | null {
  if (!drop) return null

  return {
    section: {
      id: drop.section_id,
      departmentId: drop.department_id,
      name: drop.section_name,
      strength: 0,
      year: drop.year,
      semester: drop.semester,
    },
    department: {
      id: drop.department_id,
      name: drop.department_name,
      code: drop.department_code,
    },
    drop: drop.drop_percentage,
    currentPct: drop.current_percentage,
    previousPct: drop.previous_percentage,
  }
}

/**
 * Adapt biggest movers response
 */
export function adaptBiggestMovers(movers: ApiBiggestMover[]): BiggestMover[] {
  return movers.map((m) => ({
    sectionId: m.section_id,
    section: {
      id: m.section_id,
      departmentId: m.department_id,
      name: m.section_name,
      strength: 0,
      year: m.year,
      semester: m.semester,
    },
    department: {
      id: m.department_id,
      name: m.department_name,
      code: m.department_code,
    },
    currentWeekAvg: m.current_week_avg,
    previousWeekAvg: m.previous_week_avg,
    delta: m.delta,
  }))
}

/**
 * Adapt department summary to sections list
 */
export function adaptDepartmentSummary(
  response: DepartmentSummaryResponse,
  date: string
): {
  department: Department
  stats: DepartmentDailyStats
  sections: DailyClassAttendance[]
} {
  const deptId = String(response.dept_id)

  return {
    department: {
      id: deptId,
      name: response.department,
      code: response.department,
    },
    stats: {
      departmentId: deptId,
      date,
      averagePercentage: response.avg_pct,
      totalPresent: 0, // Not provided
      totalStrength: 0, // Not provided
      sectionsBelow75: response.sections.filter((s) => !s.above).length,
      sectionsTotal: response.sections.length,
      sectionsRecorded: response.sections.length,
      sectionsPending: 0,
      sectionsNoSession: 0,
    },
    sections: response.sections.map((s) => ({
      sectionId: String(s.section_id),
      date,
      present: 0, // Not provided
      absent: 0, // Not provided
      strength: 0, // Not provided
      percentage: s.pct,
      status: 'recorded' as const,
    })),
  }
}

/**
 * Adapt section detail response
 */
export function adaptSectionDetail(
  response: SectionDetailResponse,
  date: string
): {
  section: SectionClass
  attendance: DailyClassAttendance
  trend: TrendPoint[]
} {
  const sectionId = String(response.section_id)

  return {
    section: {
      id: sectionId,
      departmentId: '', // Not provided
      name: response.name,
      strength: 0, // Not provided
      year: response.year,
      semester: response.semester,
    },
    attendance: {
      sectionId,
      date,
      present: 0, // Not provided
      absent: 0, // Not provided
      strength: 0, // Not provided
      percentage: response.today_pct,
      status: 'recorded',
    },
    trend: response.trend.map((t) => ({
      date: t.date,
      percentage: t.pct,
    })),
  }
}

/**
 * Adapt trend response
 */
export function adaptTrend(response: TrendResponse): TrendPoint[] {
  return response.data.map((t) => ({
    date: t.date,
    percentage: t.pct,
  }))
}

/**
 * Adapt working days response to string array
 */
export function adaptWorkingDays(response: WorkingDaysResponse): string[] {
  return response.days.map((d) => d.date)
}

/**
 * Roman numeral to integer (for year conversion)
 */
export function romanToInt(roman: string): number {
  const map: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
  }
  return map[roman.toUpperCase()] || parseInt(roman, 10) || 0
}

/**
 * Integer to Roman numeral
 */
export function intToRoman(num: number): string {
  const map: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
  }
  return map[num] || String(num)
}
