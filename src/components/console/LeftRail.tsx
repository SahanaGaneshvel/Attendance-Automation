import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import {
  departments,
  getSectionsByDepartment,
  getDepartmentDailyStats,
  getDailyClassAttendance,
  getCollegeStats,
} from '@/data/store'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// Build org tree structure from store data
interface OrgNode {
  id: string
  name: string
  code: string
  type: 'institution' | 'school' | 'department' | 'section'
  percentage?: number
  children?: OrgNode[]
}

function useOrgTree(selectedDate: string, threshold: number): OrgNode {
  return useMemo(() => {
    const collegeStats = getCollegeStats(selectedDate)

    // Build schools (grouped by department type for demo)
    const csciDepts = ['ai-ds', 'cse', 'it']
    const engDepts = ['ece', 'mech']

    const buildDepartmentNode = (deptId: string): OrgNode => {
      const dept = departments.find(d => d.id === deptId)
      if (!dept) return { id: deptId, name: 'Unknown', code: '???', type: 'department' }

      const stats = getDepartmentDailyStats(deptId, selectedDate)
      const sections = getSectionsByDepartment(deptId)

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        type: 'department',
        percentage: stats?.averagePercentage ?? 0,
        children: sections.map(section => {
          const attendance = getDailyClassAttendance(section.id, selectedDate)
          return {
            id: section.id,
            name: `Sec ${section.name}`,
            code: section.name,
            type: 'section' as const,
            percentage: attendance?.percentage ?? 0,
          }
        }),
      }
    }

    const schools: OrgNode[] = [
      {
        id: 'csci',
        name: 'School of Computing Sci...',
        code: 'CSCI',
        type: 'school',
        percentage: (() => {
          const deptStats = csciDepts.map(id => getDepartmentDailyStats(id, selectedDate))
          const totalPresent = deptStats.reduce((sum, s) => sum + (s?.totalPresent ?? 0), 0)
          const totalStrength = deptStats.reduce((sum, s) => sum + (s?.totalStrength ?? 0), 0)
          return totalStrength > 0 ? (totalPresent / totalStrength) * 100 : 0
        })(),
        children: csciDepts.map(buildDepartmentNode),
      },
      {
        id: 'eng',
        name: 'School of Engineering',
        code: 'ENGG',
        type: 'school',
        percentage: (() => {
          const deptStats = engDepts.map(id => getDepartmentDailyStats(id, selectedDate))
          const totalPresent = deptStats.reduce((sum, s) => sum + (s?.totalPresent ?? 0), 0)
          const totalStrength = deptStats.reduce((sum, s) => sum + (s?.totalStrength ?? 0), 0)
          return totalStrength > 0 ? (totalPresent / totalStrength) * 100 : 0
        })(),
        children: engDepts.map(buildDepartmentNode),
      },
      // Placeholder schools
      {
        id: 'mgmt',
        name: 'School of Management',
        code: 'MGMT',
        type: 'school',
        percentage: 0,
        children: [],
      },
      {
        id: 'law',
        name: 'School of Law',
        code: 'LAW',
        type: 'school',
        percentage: 0,
        children: [],
      },
      {
        id: 'arch',
        name: 'School of Architecture',
        code: 'ARCH',
        type: 'school',
        percentage: 0,
        children: [],
      },
      {
        id: 'health',
        name: 'Allied Health Sciences',
        code: 'AHS',
        type: 'school',
        percentage: 0,
        children: [],
      },
    ]

    return {
      id: 'hits',
      name: 'HITS — All Schools',
      code: 'HITS',
      type: 'institution',
      percentage: collegeStats.overallPercentage,
      children: schools,
    }
  }, [selectedDate, threshold])
}

interface TreeNodeProps {
  node: OrgNode
  level: number
  threshold: number
  selectedId: string
  expandedIds: Set<string>
  onSelect: (node: OrgNode) => void
  onToggle: (id: string) => void
}

function TreeNode({
  node,
  level,
  threshold,
  selectedId,
  expandedIds,
  onSelect,
  onToggle
}: TreeNodeProps) {
  const prefersReducedMotion = useReducedMotion()
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const hasChildren = node.children && node.children.length > 0
  const isPass = (node.percentage ?? 0) >= threshold

  const handleClick = () => {
    onSelect(node)
    if (hasChildren) {
      onToggle(node.id)
    }
  }

  return (
    <div className="tree-node">
      <motion.div
        onClick={handleClick}
        className={cn(
          'tree-node-content',
          isSelected && 'active'
        )}
        style={{ paddingLeft: `${12 + level * 12}px` }}
        whileHover={{ backgroundColor: 'var(--rail-surface)' }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Active indicator bar */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              layoutId="rail-indicator"
              className="tree-node-indicator"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </AnimatePresence>

        {/* Expand/collapse chevron */}
        {hasChildren && (
          <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-[var(--rail-muted)]"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.span>
        )}
        {!hasChildren && <span className="w-3.5" />}

        {/* Status dot */}
        {node.percentage !== undefined && node.percentage > 0 && (
          <span className={cn(
            'tree-node-status',
            isPass ? 'pass' : 'fail'
          )} />
        )}

        {/* Name */}
        <span className="tree-node-name">{node.name}</span>

        {/* Percentage value */}
        {node.percentage !== undefined && node.percentage > 0 && (
          <span className="tree-node-value">
            {node.percentage.toFixed(1)}
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="tree-children overflow-hidden"
          >
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                threshold={threshold}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LeftRail() {
  const {
    selectedDate,
    threshold,
    theme,
    toggleTheme,
    selectedScope,
    setSelectedScope
  } = useAppStore()

  const prefersReducedMotion = useReducedMotion()
  const orgTree = useOrgTree(selectedDate, threshold)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    new Set(['hits', 'csci', 'eng'])
  )

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelect = (node: OrgNode) => {
    // Build path for breadcrumbs
    const buildPath = (targetId: string, current: OrgNode, path: Array<{ type: string; id: string; name: string }> = []): Array<{ type: string; id: string; name: string }> | null => {
      if (current.id === targetId) {
        return [...path, { type: current.type, id: current.id, name: current.name }]
      }
      if (current.children) {
        for (const child of current.children) {
          const result = buildPath(targetId, child, [...path, { type: current.type, id: current.id, name: current.name }])
          if (result) return result
        }
      }
      return null
    }

    const fullPath = buildPath(node.id, orgTree) || []

    setSelectedScope({
      type: node.type,
      id: node.id,
      name: node.name,
      path: fullPath.slice(0, -1), // Exclude current node from path
    })
  }

  return (
    <>
      {/* Header */}
      <div className="rail-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--rail-bg)] font-display text-sm font-bold">
            H
          </div>
          <div>
            <h1 className="font-display text-sm text-[var(--rail-ink)]">Attendance Console</h1>
            <p className="text-xs text-[var(--rail-muted)]">HITS · First hour</p>
          </div>
        </div>
      </div>

      {/* Navigation Label */}
      <div className="px-4 py-2 mt-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--rail-muted)] font-medium">
          Institution
        </span>
      </div>

      {/* Tree Navigation */}
      <nav className="rail-nav">
        <TreeNode
          node={orgTree}
          level={0}
          threshold={threshold}
          selectedId={selectedScope.id}
          expandedIds={expandedIds}
          onSelect={handleSelect}
          onToggle={handleToggle}
        />
      </nav>

      {/* Footer */}
      <div className="rail-footer">
        <div className="flex items-center justify-between">
          {/* Live sync indicator */}
          <div className="flex items-center gap-2">
            <span className="relative">
              <span className="w-2 h-2 rounded-full bg-pass block" />
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-pass animate-ping opacity-75" />
            </span>
            <span className="text-xs text-[var(--rail-muted)]">Live · synced 9:42</span>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center gap-1">
            <motion.button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-[var(--rail-surface)] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <AnimatePresence mode="wait">
                {theme === 'light' ? (
                  <motion.span
                    key="sun"
                    initial={prefersReducedMotion ? {} : { rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? {} : { rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Sun className="w-4 h-4 text-[var(--accent)]" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={prefersReducedMotion ? {} : { rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? {} : { rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Moon className="w-4 h-4 text-[var(--accent)]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </>
  )
}
