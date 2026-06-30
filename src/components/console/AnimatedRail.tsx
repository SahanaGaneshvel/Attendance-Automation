import { useState, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'motion/react'
import {
  ChevronRight,
  ChevronLeft,
  Building2,
  Users,
  GraduationCap,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  departments,
  getSectionsByDepartment,
  getDepartmentDailyStats,
  getDailyClassAttendance,
} from '@/data/store'
import { cn } from '@/lib/utils'
import { SPRING, TIMING } from '@/lib/motion'

interface TreeNode {
  id: string
  name: string
  type: 'institution' | 'department' | 'section'
  percentage?: number
  children?: TreeNode[]
}

// Build the org tree
function buildOrgTree(date: string, _threshold: number): TreeNode {
  const deptNodes: TreeNode[] = departments.map((dept) => {
    const stats = getDepartmentDailyStats(dept.id, date)
    const sections = getSectionsByDepartment(dept.id)

    const sectionNodes: TreeNode[] = sections.map((section) => {
      const attendance = getDailyClassAttendance(section.id, date)
      return {
        id: section.id,
        name: section.name,
        type: 'section' as const,
        percentage: attendance?.percentage ?? undefined,
      }
    })

    return {
      id: dept.id,
      name: dept.code,
      type: 'department' as const,
      percentage: stats?.averagePercentage,
      children: sectionNodes,
    }
  })

  return {
    id: 'institution',
    name: 'All Departments',
    type: 'institution',
    children: deptNodes,
  }
}

// Tree node component with animations
function TreeNodeItem({
  node,
  level,
  activeId,
  onSelect,
  threshold,
}: {
  node: TreeNode
  level: number
  activeId: string
  onSelect: (id: string) => void
  threshold: number
}) {
  const [expanded, setExpanded] = useState(level === 0)
  const prefersReducedMotion = useReducedMotion()
  const hasChildren = node.children && node.children.length > 0
  const isActive = activeId === node.id
  const isPass = node.percentage !== undefined && node.percentage >= threshold
  const isFail = node.percentage !== undefined && node.percentage < threshold

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded)
    }
    onSelect(node.id)
  }

  const Icon = level === 0 ? Building2 : level === 1 ? GraduationCap : Users

  return (
    <div className="tree-node">
      <motion.div
        className={cn(
          'tree-node-content',
          level === 0 && 'l1',
          level === 1 && 'l2',
          level === 2 && 'l3',
          isActive && 'active'
        )}
        onClick={handleClick}
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
        transition={{ duration: TIMING.fast }}
      >
        {/* Chevron for expandable nodes */}
        {hasChildren && (
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : SPRING.snappy}
            className="w-4 h-4 flex items-center justify-center text-chrome-muted"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>
        )}

        {/* Icon */}
        {!hasChildren && (
          <Icon className="w-3.5 h-3.5 text-chrome-muted" />
        )}

        {/* Name */}
        <span className="tree-node-name">{node.name}</span>

        {/* Status dot - pulses only on critical */}
        {node.percentage !== undefined && (
          <motion.div
            className={cn(
              'tree-node-status',
              isPass ? 'pass' : 'fail'
            )}
            animate={
              isFail && !prefersReducedMotion
                ? {
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.7, 1],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'loop',
            }}
          />
        )}

        {/* Value */}
        {node.percentage !== undefined && (
          <span className="tree-node-value">
            {Math.round(node.percentage)}
          </span>
        )}
      </motion.div>

      {/* Animated children container */}
      <AnimatePresence initial={false}>
        {hasChildren && expanded && (
          <motion.div
            className="tree-children overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : SPRING.gentle}
          >
            {node.children!.map((child, index) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        ...SPRING.gentle,
                        delay: index * TIMING.stagger,
                      }
                }
              >
                <TreeNodeItem
                  node={child}
                  level={level + 1}
                  activeId={activeId}
                  onSelect={onSelect}
                  threshold={threshold}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AnimatedRail() {
  const {
    selectedDate,
    threshold,
    role,
    railCollapsed,
    setRailCollapsed,
  } = useAppStore()
  const prefersReducedMotion = useReducedMotion()
  const [activeNodeId, setActiveNodeId] = useState('institution')

  const orgTree = buildOrgTree(selectedDate, threshold)

  const handleToggleCollapse = useCallback(() => {
    setRailCollapsed(!railCollapsed)
  }, [railCollapsed, setRailCollapsed])

  const roleLabels: Record<string, string> = {
    dean: 'Dean · Institution',
    hod: 'HOD · Department',
    teacher: 'Teacher · Class',
    admin: 'Admin',
  }

  return (
    <LayoutGroup>
      <motion.div
        className="rail h-full relative"
        animate={railCollapsed ? 'collapsed' : 'expanded'}
        variants={{
          expanded: { width: 248 },
          collapsed: { width: 64 },
        }}
        transition={prefersReducedMotion ? { duration: 0 } : SPRING.smooth}
      >
        {/* Header */}
        <div className="rail-header">
          <div className="rail-logo">A</div>
          <AnimatePresence>
            {!railCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : SPRING.smooth}
                className="overflow-hidden"
              >
                <div className="rail-title">Attendance</div>
                <div className="rail-subtitle">{roleLabels[role]}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Tree */}
        <AnimatePresence>
          {!railCollapsed && (
            <motion.nav
              className="rail-nav"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: TIMING.standard }}
            >
              <div className="rail-label">Organization</div>
              <TreeNodeItem
                node={orgTree}
                level={0}
                activeId={activeNodeId}
                onSelect={setActiveNodeId}
                threshold={threshold}
              />
            </motion.nav>
          )}
        </AnimatePresence>

        {/* Collapsed icons */}
        {railCollapsed && (
          <div className="flex flex-col items-center gap-2 py-4">
            <button className="p-2 rounded-lg hover:bg-chrome-2 text-chrome-ink">
              <Building2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="rail-footer">
          <div className="rail-avatar">
            {role.charAt(0).toUpperCase()}
          </div>
          <AnimatePresence>
            {!railCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : SPRING.smooth}
                className="overflow-hidden whitespace-nowrap"
              >
                Demo User
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle button */}
        <motion.button
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-chrome-2 border border-chrome-line text-chrome-ink flex items-center justify-center z-10 hover:bg-accent"
          onClick={handleToggleCollapse}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: railCollapsed ? 0 : 180 }}
            transition={prefersReducedMotion ? { duration: 0 } : SPRING.snappy}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.div>
        </motion.button>
      </motion.div>
    </LayoutGroup>
  )
}
