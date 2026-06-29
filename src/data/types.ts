// ============ Session Status ============
// Critical: no_session days are EXCLUDED from all averages (never red)
// pending = working day with no entry yet (excluded from attendance %, included in compliance)
export type SessionStatus = 'recorded' | 'no_session' | 'pending'

// ============ Org Tree (depth-agnostic) ============
export type OrgUnitType = 'institution' | 'school' | 'department' | 'class'

export interface OrgUnit {
  id: string
  parentId: string | null // null for root (institution)
  type: OrgUnitType
  name: string
  code: string
  path: string[] // materialized path for fast subtree queries
  isActive: boolean
}

// Class-specific data (leaf nodes where attendance is recorded)
export interface ClassUnit extends OrgUnit {
  type: 'class'
  strength: number
  strengthSnapshot?: number // frozen per record for historical accuracy
  advisor: string | null
  termId: string
  // Optional metadata (not tree levels)
  program?: string // e.g., "B.Tech CSE"
  year?: number // e.g., 2
}

// ============ Attendance Record (class-level, no students) ============
export interface AttendanceRecord {
  id: string
  classId: string
  date: string // ISO date, local academic date (Asia/Kolkata)
  status: SessionStatus
  strengthSnapshot: number // strength at time of entry, frozen
  absentCount: number // present = strengthSnapshot - absentCount
  source: 'manual' | 'erp_csv' | 'erp_api'
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ============ Role & Scope ============
// Role = position in org tree, not hardcoded enum
// User sees subtree under their scope_unit_id
export type Role = 'faculty' | 'class_advisor' | 'hod' | 'dean' | 'academics_admin' | 'exam_cell' | 'super_admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  scopeUnitId: string | null // the org unit they're scoped to (null = root for super_admin)
  isActive: boolean
}

// ============ Terms ============
export interface Term {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

// ============ Academic Calendar ============
export interface CalendarDay {
  date: string
  isHoliday: boolean
  holidayName?: string
  // school-level overrides possible
  schoolOverrides?: Record<string, { isHoliday: boolean; holidayName?: string }>
}

// ============ Derived types for UI ============
export interface DailyClassAttendance {
  classId: string
  date: string
  status: SessionStatus
  present: number
  absent: number
  strength: number
  percentage: number // only meaningful when status === 'recorded'
}

export interface UnitDailyStats {
  unitId: string
  unitType: OrgUnitType
  date: string
  // Weighted aggregation (sum of present / sum of strength across recorded classes)
  totalPresent: number
  totalStrength: number
  averagePercentage: number
  // Counts
  classesRecorded: number
  classesNoSession: number
  classesPending: number
  classesBelow75: number
  classesTotal: number
}

export interface TrendPoint {
  date: string
  percentage: number
  status: SessionStatus // for per-class trends
}

export interface UnitTrendPoint {
  date: string
  percentage: number
  recordedClasses: number // how many classes contributed
}

export interface BiggestMover {
  classId: string
  classUnit: ClassUnit
  parentUnit: OrgUnit // department
  currentWeekAvg: number
  previousWeekAvg: number
  delta: number
}

export interface ChronicOffender {
  classId: string
  classUnit: ClassUnit
  parentUnit: OrgUnit // department
  consecutiveDaysBelow75: number
  currentPercentage: number
}

// ============ Compliance (who hasn't reported) ============
export interface ComplianceItem {
  classId: string
  classUnit: ClassUnit
  parentUnit: OrgUnit
  date: string
  status: 'pending' // only pending classes appear here
}
