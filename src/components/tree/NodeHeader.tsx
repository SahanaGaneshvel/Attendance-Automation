/**
 * NodeHeader - Breadcrumb navigation and node title
 *
 * Renders:
 * - Back button (if not at root)
 * - Breadcrumb trail from root to current node
 * - Node title and type badge
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { OrgUnitType, OrgUnit } from '@/data/types'
import { cn } from '@/lib/utils'

interface NodeHeaderProps {
  nodeId: string
  nodeType: OrgUnitType
  path: OrgUnit[]
}

const typeLabels: Record<OrgUnitType, string> = {
  institution: 'Institution',
  school: 'School',
  department: 'Department',
  class: 'Class',
}

const typeBadgeColors: Record<OrgUnitType, string> = {
  institution: 'bg-brand/10 text-brand',
  school: 'bg-blue-100 text-blue-700',
  department: 'bg-amber-100 text-amber-700',
  class: 'bg-green-100 text-green-700',
}

export function NodeHeader({ nodeId: _nodeId, nodeType, path }: NodeHeaderProps) {
  void _nodeId // nodeId reserved for future use
  const navigate = useNavigate()

  // Get current node from path (last item)
  const currentNode = path[path.length - 1]
  const parentPath = path.slice(0, -1)

  const handleBack = () => {
    if (parentPath.length > 0) {
      const parent = parentPath[parentPath.length - 1]
      // Navigate to parent based on type
      switch (parent.type) {
        case 'institution':
          navigate('/')
          break
        case 'school':
          navigate(`/school/${parent.id}`)
          break
        case 'department':
          navigate(`/department/${parent.id}`)
          break
        default:
          navigate('/')
      }
    } else {
      navigate('/')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb */}
      {path.length > 1 && (
        <nav className="flex items-center gap-1 text-sm text-muted">
          {path.map((node, index) => (
            <span key={node.id} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              <span
                className={cn(
                  'transition-colors',
                  index === path.length - 1
                    ? 'text-ink font-medium'
                    : 'hover:text-brand cursor-pointer'
                )}
                onClick={index < path.length - 1 ? () => {
                  switch (node.type) {
                    case 'institution':
                      navigate('/')
                      break
                    case 'school':
                      navigate(`/school/${node.id}`)
                      break
                    case 'department':
                      navigate(`/department/${node.id}`)
                      break
                    default:
                      break
                  }
                } : undefined}
              >
                {node.name}
              </span>
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-center gap-3">
        {path.length > 1 && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">
            {currentNode?.name ?? 'Loading...'}
          </h1>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              typeBadgeColors[nodeType]
            )}
          >
            {typeLabels[nodeType]}
          </span>
        </div>
      </div>
    </div>
  )
}
