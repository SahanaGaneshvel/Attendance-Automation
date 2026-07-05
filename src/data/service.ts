/**
 * Data Service
 * Unified interface that can use either mock data or real API.
 * Switch via VITE_USE_MOCK_DATA environment variable.
 */
import {
  fetchCollegeStats,
  fetchChronicOffenders,
  fetchBiggestDrop,
  fetchBiggestMovers,
  fetchOverview,
  fetchDepartmentSummary,
  fetchSectionDetail,
  fetchTrend,
  fetchWorkingDays,
  adaptCollegeStats,
  adaptChronicOffenders,
  adaptBiggestDrop,
  adaptBiggestMovers,
  adaptDepartmentSummary,
  adaptSectionDetail,
  adaptTrend,
  adaptWorkingDays,
  type CollegeStats,
  type ChronicOffender,
  type BiggestDropInfo,
  type BiggestMover,
  type DepartmentDailyStats,
  type DailyClassAttendance,
  type TrendPoint,
  type Department,
  type SectionClass,
} from '@/api'

// Re-export types for consumers
export type {
  CollegeStats,
  ChronicOffender,
  BiggestDropInfo,
  BiggestMover,
  DepartmentDailyStats,
  DailyClassAttendance,
  TrendPoint,
  Department,
  SectionClass,
}

// Import mock data as fallback
import * as mockStore from './mock'
import * as mockStoreComputed from './store'

// Configuration
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// Cache for API data
let cachedDepartments: Department[] | null = null
let cachedSectionsByDept: Map<string, SectionClass[]> | null = null
let cachedWorkingDays: string[] | null = null

/**
 * Initialize data - fetches base data from API
 */
export async function initializeData(): Promise<void> {
  if (USE_MOCK) return

  try {
    // Get working days for the last 30 days
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const workingDaysResponse = await fetchWorkingDays(
      thirtyDaysAgo.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    )
    cachedWorkingDays = adaptWorkingDays(workingDaysResponse)

    // Get overview to extract departments and sections
    const latestDate = cachedWorkingDays[cachedWorkingDays.length - 1] || today.toISOString().split('T')[0]
    const overviewResponse = await fetchOverview(latestDate, 75)

    cachedDepartments = overviewResponse.heatmap.map((dept) => ({
      id: String(dept.dept_id),
      name: dept.department,
      code: dept.department,
    }))

    cachedSectionsByDept = new Map()
    overviewResponse.heatmap.forEach((dept) => {
      const deptId = String(dept.dept_id)
      const sections: SectionClass[] = dept.sections.map((sec) => ({
        id: `${deptId}-${sec.name}-${sec.year}`,
        departmentId: deptId,
        name: sec.name,
        strength: 0,
        year: sec.year,
        semester: sec.semester,
      }))
      cachedSectionsByDept!.set(deptId, sections)
    })
  } catch (error) {
    console.error('Failed to initialize data from API, falling back to mock:', error)
    // Silently fall back to mock data
  }
}

// ============ Departments ============

export function getDepartments(): Department[] {
  if (USE_MOCK || !cachedDepartments) {
    return mockStore.departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
    }))
  }
  return cachedDepartments
}

export function getDepartmentById(id: string): Department | undefined {
  return getDepartments().find((d) => d.id === id)
}

// ============ Sections ============

export function getSections(): SectionClass[] {
  if (USE_MOCK || !cachedSectionsByDept) {
    return mockStore.sections.map((s) => ({
      id: s.id,
      departmentId: s.departmentId,
      name: s.name,
      strength: s.strength,
      year: 'II',
      semester: 3,
    }))
  }
  const allSections: SectionClass[] = []
  cachedSectionsByDept.forEach((sections) => {
    allSections.push(...sections)
  })
  return allSections
}

export function getSectionsByDepartment(deptId: string): SectionClass[] {
  if (USE_MOCK || !cachedSectionsByDept) {
    return mockStore.getSectionsByDepartment(deptId).map((s) => ({
      id: s.id,
      departmentId: s.departmentId,
      name: s.name,
      strength: s.strength,
      year: 'II',
      semester: 3,
    }))
  }
  return cachedSectionsByDept.get(deptId) || []
}

export function getSectionById(id: string): SectionClass | undefined {
  return getSections().find((s) => s.id === id)
}

// ============ Working Days ============

export function getWorkingDays(): string[] {
  if (USE_MOCK || !cachedWorkingDays) {
    return mockStore.workingDays
  }
  return cachedWorkingDays
}

export function getToday(): string {
  if (USE_MOCK) {
    return mockStore.TODAY
  }
  return new Date().toISOString().split('T')[0]
}

// ============ College Stats ============

export async function getCollegeStats(date: string): Promise<CollegeStats> {
  if (USE_MOCK) {
    const stats = mockStoreComputed.getCollegeStats(date)
    return {
      date,
      overallPercentage: stats.overallPercentage,
      totalPresent: stats.totalPresent,
      totalStrength: stats.totalStrength,
      totalClasses: stats.totalClasses,
      classesBelow75Count: stats.classesBelow75Count,
      classesRecorded: stats.totalClasses,
      classesPending: 0,
      classesNoSession: 0,
      departmentStats: stats.departmentStats.map((d) => ({
        departmentId: d.departmentId,
        date,
        averagePercentage: d.averagePercentage,
        totalPresent: d.totalPresent,
        totalStrength: d.totalStrength,
        sectionsBelow75: d.sectionsBelow75,
        sectionsTotal: d.sectionsTotal,
        sectionsRecorded: d.sectionsTotal,
        sectionsPending: 0,
        sectionsNoSession: 0,
      })),
    }
  }

  const response = await fetchCollegeStats(date, 75)
  return adaptCollegeStats(response)
}

// ============ Department Stats ============

export async function getDepartmentDailyStats(
  deptId: string,
  date: string
): Promise<DepartmentDailyStats | null> {
  if (USE_MOCK) {
    const stats = mockStoreComputed.getDepartmentDailyStats(deptId, date)
    if (!stats) return null
    return {
      departmentId: stats.departmentId,
      date,
      averagePercentage: stats.averagePercentage,
      totalPresent: stats.totalPresent,
      totalStrength: stats.totalStrength,
      sectionsBelow75: stats.sectionsBelow75,
      sectionsTotal: stats.sectionsTotal,
      sectionsRecorded: stats.sectionsTotal,
      sectionsPending: 0,
      sectionsNoSession: 0,
    }
  }

  try {
    const response = await fetchDepartmentSummary(deptId, date, 75)
    return adaptDepartmentSummary(response, date).stats
  } catch {
    return null
  }
}

export async function getAllDepartmentStats(date: string): Promise<DepartmentDailyStats[]> {
  if (USE_MOCK) {
    return mockStoreComputed.getAllDepartmentStats(date).map((d) => ({
      departmentId: d.departmentId,
      date,
      averagePercentage: d.averagePercentage,
      totalPresent: d.totalPresent,
      totalStrength: d.totalStrength,
      sectionsBelow75: d.sectionsBelow75,
      sectionsTotal: d.sectionsTotal,
      sectionsRecorded: d.sectionsTotal,
      sectionsPending: 0,
      sectionsNoSession: 0,
    }))
  }

  const collegeStats = await getCollegeStats(date)
  return collegeStats.departmentStats
}

// ============ Class Attendance ============

export async function getDailyClassAttendance(
  sectionId: string,
  date: string
): Promise<DailyClassAttendance | null> {
  if (USE_MOCK) {
    const att = mockStoreComputed.getDailyClassAttendance(sectionId, date)
    if (!att) return null
    return {
      sectionId: att.sectionId,
      date: att.date,
      present: att.present,
      absent: att.absent,
      strength: att.strength,
      percentage: att.percentage,
      status: 'recorded',
    }
  }

  try {
    const response = await fetchSectionDetail(sectionId, date)
    return adaptSectionDetail(response, date).attendance
  } catch {
    return null
  }
}

// ============ Chronic Offenders ============

export async function getChronicOffenders(
  minConsecutiveDays: number = 3,
  threshold: number = 75
): Promise<ChronicOffender[]> {
  if (USE_MOCK) {
    return mockStoreComputed.getChronicOffenders(minConsecutiveDays, threshold).map((o) => ({
      sectionId: o.sectionId,
      section: {
        id: o.section.id,
        departmentId: o.section.departmentId,
        name: o.section.name,
        strength: o.section.strength,
        year: 'II',
        semester: 3,
      },
      department: {
        id: o.department.id,
        name: o.department.name,
        code: o.department.code,
      },
      consecutiveDaysBelow75: o.consecutiveDaysBelow75,
      currentPercentage: o.currentPercentage,
    }))
  }

  const response = await fetchChronicOffenders(threshold, minConsecutiveDays)
  return adaptChronicOffenders(response.offenders)
}

// ============ Biggest Drop ============

export async function getBiggestSingleDayDrop(date: string): Promise<BiggestDropInfo | null> {
  if (USE_MOCK) {
    const drop = mockStoreComputed.getBiggestSingleDayDrop(date)
    if (!drop) return null
    return {
      section: {
        id: drop.section.id,
        departmentId: drop.section.departmentId,
        name: drop.section.name,
        strength: drop.section.strength,
        year: 'II',
        semester: 3,
      },
      department: {
        id: drop.department.id,
        name: drop.department.name,
        code: drop.department.code,
      },
      drop: drop.drop,
      currentPct: drop.currentPct,
      previousPct: drop.previousPct,
    }
  }

  const response = await fetchBiggestDrop(date)
  return adaptBiggestDrop(response.drop)
}

// ============ Biggest Movers ============

export async function getBiggestMovers(
  date: string
): Promise<{ risers: BiggestMover[]; fallers: BiggestMover[] }> {
  if (USE_MOCK) {
    const movers = mockStoreComputed.getBiggestMovers()
    return {
      risers: adaptMockMovers(movers.risers),
      fallers: adaptMockMovers(movers.fallers),
    }
  }

  const response = await fetchBiggestMovers(date)
  return {
    risers: adaptBiggestMovers(response.risers),
    fallers: adaptBiggestMovers(response.fallers),
  }
}

function adaptMockMovers(movers: ReturnType<typeof mockStoreComputed.getBiggestMovers>['risers']): BiggestMover[] {
  return movers.map((m) => ({
    sectionId: m.sectionId,
    section: {
      id: m.section.id,
      departmentId: m.section.departmentId,
      name: m.section.name,
      strength: m.section.strength,
      year: 'II',
      semester: 3,
    },
    department: {
      id: m.department.id,
      name: m.department.name,
      code: m.department.code,
    },
    currentWeekAvg: m.currentWeekAvg,
    previousWeekAvg: m.previousWeekAvg,
    delta: m.delta,
  }))
}

// ============ Trends ============

export async function getCollegeTrend(): Promise<TrendPoint[]> {
  if (USE_MOCK) {
    return mockStoreComputed.getCollegeTrend().map((t) => ({
      date: t.date,
      percentage: t.percentage,
    }))
  }

  const workingDays = getWorkingDays()
  if (workingDays.length < 2) return []

  const fromDate = workingDays[0]
  const toDate = workingDays[workingDays.length - 1]

  const response = await fetchTrend('college', null, fromDate, toDate)
  return adaptTrend(response)
}

export async function getDepartmentTrend(deptId: string): Promise<TrendPoint[]> {
  if (USE_MOCK) {
    return mockStoreComputed.getDepartmentTrend(deptId).map((t) => ({
      date: t.date,
      percentage: t.percentage,
    }))
  }

  const workingDays = getWorkingDays()
  if (workingDays.length < 2) return []

  const fromDate = workingDays[0]
  const toDate = workingDays[workingDays.length - 1]

  const response = await fetchTrend('department', deptId, fromDate, toDate)
  return adaptTrend(response)
}

export async function getSectionTrend(sectionId: string): Promise<TrendPoint[]> {
  if (USE_MOCK) {
    return mockStoreComputed.getSectionTrend(sectionId).map((t) => ({
      date: t.date,
      percentage: t.percentage,
    }))
  }

  const workingDays = getWorkingDays()
  if (workingDays.length < 2) return []

  const fromDate = workingDays[0]
  const toDate = workingDays[workingDays.length - 1]

  const response = await fetchTrend('section', sectionId, fromDate, toDate)
  return adaptTrend(response)
}
