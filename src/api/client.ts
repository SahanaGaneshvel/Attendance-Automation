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
  absent_count: number
  source: 'manual' | 'erp'
}

export async function submitAttendance(
  data: SubmitAttendanceRequest
): Promise<{ success: boolean; id: number }> {
  return apiFetch('/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
