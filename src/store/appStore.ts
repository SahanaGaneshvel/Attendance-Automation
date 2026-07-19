import { create } from 'zustand'
import { TODAY } from '@/data/store'

// Demo role type (separate from canonical types.ts Role until backend is ready)
export type DemoRole = 'dean' | 'hod' | 'teacher' | 'admin'

// Theme type
export type Theme = 'light' | 'dark'

// Selected scope for master-detail navigation
export interface SelectedScope {
  type: 'institution' | 'school' | 'department' | 'section'
  id: string
  name: string
  // For breadcrumb trail
  path: Array<{ type: string; id: string; name: string }>
}

interface AppState {
  // Active navigation key (which page is shown)
  activeNavKey: string
  setActiveNavKey: (key: string) => void

  // Current date being viewed
  selectedDate: string
  setSelectedDate: (date: string) => void

  // Threshold for pass/fail coloring
  threshold: number
  setThreshold: (threshold: number) => void

  // Current user role (demo only)
  role: DemoRole
  setRole: (role: DemoRole) => void

  // Theme (light/dark)
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void

  // Selected scope for master-detail navigation
  selectedScope: SelectedScope
  setSelectedScope: (scope: SelectedScope) => void

  // Rail collapsed state (for responsive)
  railCollapsed: boolean
  setRailCollapsed: (collapsed: boolean) => void

  // Inspector collapsed state (for responsive)
  inspectorCollapsed: boolean
  setInspectorCollapsed: (collapsed: boolean) => void

  // Drill-down path for breadcrumbs
  drillPath: {
    departmentId?: string
    sectionId?: string
  }
  setDrillPath: (path: { departmentId?: string; sectionId?: string }) => void
  clearDrillPath: () => void

  // Loading state (for skeleton display)
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Toast notifications
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeNavKey: 'overview',
  setActiveNavKey: (key) => set({ activeNavKey: key }),

  selectedDate: TODAY,
  setSelectedDate: (date) => set({ selectedDate: date }),

  threshold: 75,
  setThreshold: (threshold) => set({ threshold }),

  role: 'dean',
  setRole: (role) => set({ role }),

  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  selectedScope: {
    type: 'institution',
    id: 'hits',
    name: 'HITS — All Schools',
    path: [],
  },
  setSelectedScope: (scope) => set({ selectedScope: scope }),

  railCollapsed: false,
  setRailCollapsed: (collapsed) => set({ railCollapsed: collapsed }),

  inspectorCollapsed: false,
  setInspectorCollapsed: (collapsed) => set({ inspectorCollapsed: collapsed }),

  drillPath: {},
  setDrillPath: (path) => set({ drillPath: path }),
  clearDrillPath: () => set({ drillPath: {} }),

  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    // Auto-clear after 3 seconds
    setTimeout(() => set({ toast: null }), 3000)
  },
  clearToast: () => set({ toast: null }),
}))
