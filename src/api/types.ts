/**
 * API Response Types
 * These match the backend Pydantic schemas exactly.
 * Frontend adapters transform these to internal types.
 */

// Session status - critical for correct averages
export type SessionStatus = 'recorded' | 'no_session' | 'pending'

// ============ Stats Endpoints ============

export interface TrendPoint {
  date: string
  pct: number  // Backend returns 'pct', adapters convert to 'percentage'
  status?: SessionStatus
}

export interface DepartmentStats {
  id: string
  name: string
  code: string
  average_percentage: number
  total_present: number
  total_strength: number
  sections_below_threshold: number
  sections_total: number
  sections_recorded: number
  sections_pending: number
  sections_no_session: number
}

export interface CollegeStatsResponse {
  date: string
  overall_percentage: number
  total_present: number
  total_strength: number
  total_classes: number
  classes_below_threshold: number
  classes_recorded: number
  classes_pending: number
  classes_no_session: number
  department_stats: DepartmentStats[]
}

export interface ChronicOffender {
  section_id: string
  section_name: string
  department_id: string
  department_code: string
  department_name: string
  consecutive_days_below: number
  current_percentage: number
  year: string
  semester: number
}

export interface ChronicOffendersResponse {
  threshold: number
  min_consecutive_days: number
  offenders: ChronicOffender[]
}

export interface BiggestDrop {
  section_id: string
  section_name: string
  department_id: string
  department_code: string
  department_name: string
  drop_percentage: number
  current_percentage: number
  previous_percentage: number
  year: string
  semester: number
}

export interface BiggestDropResponse {
  date: string
  previous_date: string | null
  drop: BiggestDrop | null
}

export interface BiggestMover {
  section_id: string
  section_name: string
  department_id: string
  department_code: string
  department_name: string
  current_week_avg: number
  previous_week_avg: number
  delta: number
  year: string
  semester: number
}

export interface BiggestMoversResponse {
  risers: BiggestMover[]
  fallers: BiggestMover[]
}

// ============ Overview Endpoint ============

export interface SectionHeat {
  name: string
  year: string
  semester: number
  pct: number
  above: boolean
}

export interface DepartmentHeat {
  department: string
  dept_id: number
  sections: SectionHeat[]
  avg: number
  above: boolean
}

export interface KPIs {
  overall_pct: number
  classes_above: number
  classes_below: number
}

export interface OverviewResponse {
  date: string
  threshold: number
  kpis: KPIs
  heatmap: DepartmentHeat[]
}

// ============ Department Endpoint ============

export interface SectionSummary {
  section_id: number
  name: string
  pct: number
  above: boolean
}

export interface DepartmentSummaryResponse {
  dept_id: number
  department: string
  avg_pct: number
  above_threshold: boolean
  sections: SectionSummary[]
}

// ============ Section Endpoint ============

export interface SectionDetailResponse {
  section_id: number
  name: string
  department: string | null
  year: string
  semester: number
  today_pct: number
  trend: TrendPoint[]
}

// ============ Trends Endpoint ============

export interface TrendResponse {
  scope: string
  id: number | null
  from_date: string
  to_date: string
  data: TrendPoint[]
}

// ============ Calendar Endpoint ============

export interface WorkingDay {
  date: string
  is_holiday: boolean
  holiday_name: string | null
}

export interface WorkingDaysResponse {
  from_date: string
  to_date: string
  days: WorkingDay[]
  total_working_days: number
}

// ============ Auth Endpoints ============

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface UserScope {
  section_id: number | null
  section_name: string | null
  department_id: number | null
  department_name: string | null
  school_id: number | null
  school_name: string | null
}

export interface UserInfo {
  id: number
  name: string
  email: string
  role: string  // 'teacher' | 'hod' | 'dean' | 'admin'
  scope: UserScope
}
