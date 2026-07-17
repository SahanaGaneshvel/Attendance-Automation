/**
 * API Client
 * Production-grade HTTP client with auth, error handling, and retries.
 */
import type {
  CollegeStatsResponse,
  ChronicOffendersResponse,
  BiggestDropResponse,
  BiggestMoversResponse,
  OverviewResponse,
  DepartmentSummaryResponse,
  SectionDetailResponse,
  TrendResponse,
  WorkingDaysResponse,
  LoginResponse,
  UserInfo,
} from './types'

// Configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TIMEOUT_MS = 10000

// Token storage keys
const TOKEN_KEY = 'attendance_token'

/**
 * Get stored auth token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Set auth token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * Clear auth token
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Core fetch wrapper with auth and error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const token = getToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        clearToken()
        throw new ApiError('Unauthorized - please login again', 401, 'UNAUTHORIZED')
      }
      if (response.status === 403) {
        throw new ApiError('Access denied', 403, 'FORBIDDEN')
      }
      if (response.status === 404) {
        throw new ApiError('Resource not found', 404, 'NOT_FOUND')
      }

      const errorBody = await response.json().catch(() => ({}))
      throw new ApiError(
        errorBody.detail || `Request failed with status ${response.status}`,
        response.status
      )
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, 'TIMEOUT')
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'NETWORK_ERROR'
    )
  }
}

// ============ Auth Endpoints ============

export async function login(email: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append('username', email)
  formData.append('password', password)

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new ApiError(error.detail || 'Login failed', response.status)
  }

  const data: LoginResponse = await response.json()
  setToken(data.access_token)
  return data
}

export function logout(): void {
  clearToken()
}

export async function getCurrentUser(): Promise<UserInfo> {
  return apiFetch<UserInfo>('/auth/me')
}

// ============ Stats Endpoints ============

export async function fetchCollegeStats(
  date: string,
  threshold: number = 75
): Promise<CollegeStatsResponse> {
  return apiFetch<CollegeStatsResponse>(
    `/stats/college?date=${date}&threshold=${threshold}`
  )
}

export async function fetchChronicOffenders(
  threshold: number = 75,
  minDays: number = 3
): Promise<ChronicOffendersResponse> {
  return apiFetch<ChronicOffendersResponse>(
    `/stats/chronic-offenders?threshold=${threshold}&minDays=${minDays}`
  )
}

export async function fetchBiggestDrop(date: string): Promise<BiggestDropResponse> {
  return apiFetch<BiggestDropResponse>(`/stats/biggest-drop?date=${date}`)
}

export async function fetchBiggestMovers(date: string): Promise<BiggestMoversResponse> {
  return apiFetch<BiggestMoversResponse>(`/stats/biggest-movers?date=${date}`)
}

// ============ Overview Endpoints ============

export async function fetchOverview(
  date: string,
  threshold: number = 75
): Promise<OverviewResponse> {
  return apiFetch<OverviewResponse>(
    `/overview?date=${date}&threshold=${threshold}`
  )
}

// ============ Department Endpoints ============

export async function fetchDepartmentSummary(
  deptId: string,
  date: string,
  threshold: number = 75
): Promise<DepartmentSummaryResponse> {
  return apiFetch<DepartmentSummaryResponse>(
    `/departments/${deptId}/summary?date=${date}&threshold=${threshold}`
  )
}

// ============ Section Endpoints ============

export async function fetchSectionDetail(
  sectionId: string,
  date: string
): Promise<SectionDetailResponse> {
  return apiFetch<SectionDetailResponse>(
    `/sections/${sectionId}/detail?date=${date}`
  )
}

// ============ Trends Endpoints ============

export async function fetchTrend(
  scope: 'college' | 'department' | 'section',
  id: string | null,
  fromDate: string,
  toDate: string
): Promise<TrendResponse> {
  let url = `/trends?scope=${scope}&from=${fromDate}&to=${toDate}`
  if (id) {
    url += `&id=${id}`
  }
  return apiFetch<TrendResponse>(url)
}

// ============ Calendar Endpoints ============

export async function fetchWorkingDays(
  fromDate: string,
  toDate: string
): Promise<WorkingDaysResponse> {
  return apiFetch<WorkingDaysResponse>(
    `/calendar/working-days?from=${fromDate}&to=${toDate}`
  )
}

export async function fetchToday(): Promise<{ today: string }> {
  return apiFetch<{ today: string }>('/calendar/today')
}

// ============ Attendance Endpoints ============

export interface SubmitAttendanceRequest {
  section_id: number
  date: string
  status: 'recorded' | 'no_session'
  absent_count?: number
  no_session_reason?: string
}

export interface AttendanceResponse {
  message: string
  section_id: number
  section_name: string
  date: string
  status: string
  absent_count: number | null
  present_count: number | null
  strength: number
  percentage: number | null
}

export interface AttendanceRecord {
  section_id: number
  section_name: string
  date: string
  status: 'recorded' | 'no_session' | 'pending'
  strength: number
  absent_count: number | null
  present_count: number | null
  percentage: number | null
  no_session_reason?: string
}

export async function submitAttendance(
  data: SubmitAttendanceRequest
): Promise<AttendanceResponse> {
  return apiFetch('/attendance/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getAttendance(
  sectionId: number,
  date: string
): Promise<AttendanceRecord> {
  return apiFetch(`/attendance/${sectionId}/${date}`)
}

// ============ Teacher Dashboard ============

export interface TrendPoint {
  date: string
  percentage: number | null
  status: 'recorded' | 'no_session' | 'pending'
}

export interface QuickStats {
  best: number
  worst: number
  days_below_75: number
  average: number
  recorded_days: number
}

export interface TeacherDashboardData {
  section_id: number
  section_name: string
  department_id: number
  department_name: string
  strength: number
  today: {
    status: string
    percentage: number | null
    present: number | null
    absent: number | null
  }
  department_avg: number | null
  trend: TrendPoint[]
  quick_stats: QuickStats
}

export async function getTeacherDashboard(date: string): Promise<TeacherDashboardData> {
  return apiFetch(`/sections/my-section/dashboard?date=${date}`)
}

// ============ HOD Dashboard ============

export interface HodSectionData {
  section_id: number
  section_name: string
  strength: number
  status: 'recorded' | 'no_session' | 'pending'
  percentage: number | null
  present: number | null
  absent: number | null
  trend: number[]  // Last 10 days of recorded percentages
}

export interface PeerDepartment {
  department_id: number
  department_name: string
  department_code: string
  percentage: number | null
  is_mine: boolean
  rank: number
}

export interface HodDashboardStats {
  percentage: number | null
  total_present: number
  total_strength: number
  recorded_count: number
  pending_count: number
  no_session_count: number
  below_threshold_count: number
  my_rank: number
  total_departments: number
}

export interface HodDashboardData {
  department_id: number
  department_name: string
  department_code: string
  date: string
  stats: HodDashboardStats
  sections: HodSectionData[]
  peer_comparison: PeerDepartment[]
  trend: TrendPoint[]
}

export async function getHodDashboard(date: string): Promise<HodDashboardData> {
  return apiFetch(`/departments/my-department/dashboard?date=${date}`)
}

// ============ Dean Dashboard ============

export interface DeanSectionData {
  section_id: number
  name: string
  year: number
  semester: number
  stream: string
  strength: number
  status: 'recorded' | 'no_session' | 'pending'
  percentage: number | null
  present: number | null
  absent: number | null
}

export interface DeanDepartmentHeatmap {
  department_id: number
  department_name: string
  department_code: string
  percentage: number | null
  sections: DeanSectionData[]
}

export interface DeanDepartmentRanking {
  department_id: number
  department_name: string
  department_code: string
  percentage: number | null
  recorded_count: number
  pending_count: number
  no_session_count: number
  total_present: number
  total_strength: number
  rank: number
}

export interface DeanChronicOffender {
  section_id: string
  section_name: string
  department_id: string
  department_code: string
  department_name: string
  year: number
  semester: number
  consecutive_days: number
  current_percentage: number
}

export interface DeanBiggestDrop {
  section_id: string
  section_name: string
  department_id: string
  department_code: string
  department_name: string
  year: number
  drop: number
  previous_percentage: number
  current_percentage: number
  previous_date: string
}

export interface DeanDashboardStats {
  percentage: number | null
  total_present: number
  total_strength: number
  classes_above: number
  classes_below: number
  classes_pending: number
  classes_no_session: number
  total_classes: number
  departments_below_threshold: number
  total_departments: number
}

export interface DeanDashboardData {
  school_id: number
  school_name: string
  date: string
  threshold: number
  stats: DeanDashboardStats
  department_rankings: DeanDepartmentRanking[]
  chronic_offenders: DeanChronicOffender[]
  biggest_drop: DeanBiggestDrop | null
  trend: TrendPoint[]
  heatmap: DeanDepartmentHeatmap[]
}

export async function getDeanDashboard(date: string, threshold: number = 75): Promise<DeanDashboardData> {
  return apiFetch(`/schools/my-school/dashboard?date=${date}&threshold=${threshold}`)
}

// ============ Export Endpoints ============

/**
 * Download attendance CSV for a date range
 */
export function getAttendanceCsvUrl(fromDate: string, toDate: string, departmentId?: number): string {
  let url = `${API_BASE}/export/attendance/csv?from=${fromDate}&to=${toDate}`
  if (departmentId) {
    url += `&department_id=${departmentId}`
  }
  return url
}

/**
 * Download daily summary CSV
 */
export function getSummaryCsvUrl(date: string): string {
  return `${API_BASE}/export/summary/csv?date=${date}`
}

/**
 * Download monthly report CSV
 */
export function getMonthlyReportCsvUrl(year: number, month: number): string {
  return `${API_BASE}/export/report/csv?year=${year}&month=${month}`
}

/**
 * Trigger a file download with auth token
 */
export async function downloadWithAuth(url: string, filename: string): Promise<void> {
  const token = getToken()

  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (!response.ok) {
    throw new ApiError(`Download failed: ${response.status}`, response.status)
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}
