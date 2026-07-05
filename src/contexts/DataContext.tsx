/**
 * Data Context
 * Provides data service functions to components with loading states.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  initializeData,
  getDepartments,
  getSections,
  getSectionsByDepartment,
  getDepartmentById,
  getSectionById,
  getWorkingDays,
  getToday,
  getCollegeStats,
  getDepartmentDailyStats,
  getAllDepartmentStats,
  getDailyClassAttendance,
  getChronicOffenders,
  getBiggestSingleDayDrop,
  getBiggestMovers,
  getCollegeTrend,
  getDepartmentTrend,
  getSectionTrend,
  type Department,
  type SectionClass,
  type CollegeStats,
  type DepartmentDailyStats,
  type DailyClassAttendance,
  type ChronicOffender,
  type BiggestDropInfo,
  type BiggestMover,
  type TrendPoint,
} from '@/data/service'

interface DataContextValue {
  isInitialized: boolean
  isLoading: boolean
  error: string | null

  // Sync data (from cache)
  departments: Department[]
  sections: SectionClass[]
  workingDays: string[]
  today: string
  getDepartmentById: (id: string) => Department | undefined
  getSectionById: (id: string) => SectionClass | undefined
  getSectionsByDepartment: (deptId: string) => SectionClass[]

  // Async data (may hit API)
  fetchCollegeStats: (date: string) => Promise<CollegeStats>
  fetchDepartmentStats: (deptId: string, date: string) => Promise<DepartmentDailyStats | null>
  fetchAllDepartmentStats: (date: string) => Promise<DepartmentDailyStats[]>
  fetchDailyClassAttendance: (sectionId: string, date: string) => Promise<DailyClassAttendance | null>
  fetchChronicOffenders: (minDays?: number, threshold?: number) => Promise<ChronicOffender[]>
  fetchBiggestDrop: (date: string) => Promise<BiggestDropInfo | null>
  fetchBiggestMovers: (date: string) => Promise<{ risers: BiggestMover[]; fallers: BiggestMover[] }>
  fetchCollegeTrend: () => Promise<TrendPoint[]>
  fetchDepartmentTrend: (deptId: string) => Promise<TrendPoint[]>
  fetchSectionTrend: (sectionId: string) => Promise<TrendPoint[]>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true)
        await initializeData()
        setIsInitialized(true)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize data')
        // Still set initialized - we fall back to mock data
        setIsInitialized(true)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  const value: DataContextValue = {
    isInitialized,
    isLoading,
    error,

    // Sync getters
    departments: getDepartments(),
    sections: getSections(),
    workingDays: getWorkingDays(),
    today: getToday(),
    getDepartmentById,
    getSectionById,
    getSectionsByDepartment,

    // Async fetchers
    fetchCollegeStats: getCollegeStats,
    fetchDepartmentStats: getDepartmentDailyStats,
    fetchAllDepartmentStats: getAllDepartmentStats,
    fetchDailyClassAttendance: getDailyClassAttendance,
    fetchChronicOffenders: getChronicOffenders,
    fetchBiggestDrop: getBiggestSingleDayDrop,
    fetchBiggestMovers: getBiggestMovers,
    fetchCollegeTrend: getCollegeTrend,
    fetchDepartmentTrend: getDepartmentTrend,
    fetchSectionTrend: getSectionTrend,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
