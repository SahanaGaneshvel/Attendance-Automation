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
  getAttendance,
  getTeacherDashboard,
  getHodDashboard,
  getDeanDashboard,
  getAttendanceCsvUrl,
  getSummaryCsvUrl,
  getMonthlyReportCsvUrl,
  downloadWithAuth,
  ApiError,
} from './client'

// Client types
export type {
  SubmitAttendanceRequest,
  AttendanceResponse,
  AttendanceRecord,
  TeacherDashboardData,
  QuickStats,
  TrendPoint as ApiTrendPoint,
  HodDashboardData,
  HodSectionData,
  HodDashboardStats,
  PeerDepartment,
  DeanDashboardData,
  DeanDashboardStats,
  DeanDepartmentRanking,
  DeanDepartmentHeatmap,
  DeanSectionData,
  DeanChronicOffender,
  DeanBiggestDrop,
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
  UserScope,
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
