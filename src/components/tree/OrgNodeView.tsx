/**
 * OrgNodeView - Recursive container for any org tree node
 *
 * This component renders the appropriate view for any level of the org tree:
 * - Institution (root)
 * - School
 * - Department
 * - Class (leaf)
 *
 * The tree depth is arbitrary; the component adapts based on node type.
 *
 * PLACEHOLDER: Will be wired to actual tree data after Milestone 0 contract shapes arrive.
 */

import type { OrgUnitType, OrgUnit } from '@/data/types'
import { NodeHeader } from './NodeHeader'
import { NodeKPIs } from './NodeKPIs'
import { ChildNodeGrid } from './ChildNodeGrid'
import { NodeWidgets } from './NodeWidgets'

export interface OrgNodeViewProps {
  nodeId: string
  nodeType: OrgUnitType
  path: OrgUnit[] // Ancestors for breadcrumb (root first)
}

export function OrgNodeView({ nodeId, nodeType, path }: OrgNodeViewProps) {
  const isLeaf = nodeType === 'class'

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb + title + back navigation */}
      <NodeHeader nodeId={nodeId} nodeType={nodeType} path={path} />

      {/* KPIs - weighted aggregation for branches, direct for leaves */}
      <NodeKPIs nodeId={nodeId} nodeType={nodeType} />

      {/* Child nodes grid - only for branch nodes */}
      {!isLeaf && <ChildNodeGrid parentId={nodeId} />}

      {/* Widgets - conditionally rendered based on node type */}
      <NodeWidgets nodeId={nodeId} nodeType={nodeType} />
    </div>
  )
}
