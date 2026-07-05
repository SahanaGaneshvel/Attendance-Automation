/**
 * API Module - Public exports
 */

// Client functions
export {
  login,
  logout,
  isAuthenticated,
  getToken,
  getCurrentUser,
  fetchCollegeStats,
  fetchChronicOffenders,
  fetchBiggestDrop,
  fetchBiggestMovers,
  fetchOverview,
  fetchDepartmentSummary,
  fetchSectionDetail,
  fetchTrend,
  fetchWorkingDays,
  fetchToday,
  submitAttendance,
  ApiError,
} from './client'

// Types
export type {
  SessionStatus,
  CollegeStatsResponse,
  DepartmentStats,
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

// Adapters
export {
  adaptCollegeStats,
  adaptDepartmentStats,
  adaptDepartmentsFromOverview,
  adaptSectionsFromOverview,
  adaptChronicOffenders,
  adaptBiggestDrop,
  adaptBiggestMovers,
  adaptDepartmentSummary,
  adaptSectionDetail,
  adaptTrend,
  adaptWorkingDays,
  romanToInt,
  intToRoman,
} from './adapters'

// Adapter types
export type {
  Department,
  SectionClass,
  DailyClassAttendance,
  DepartmentDailyStats,
  CollegeStats,
  ChronicOffender,
  BiggestMover,
  BiggestDropInfo,
  TrendPoint,
} from './adapters'
