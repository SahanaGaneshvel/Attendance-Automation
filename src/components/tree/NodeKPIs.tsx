/**
 * NodeKPIs - KPI cards for any org node
 *
 * Renders appropriate KPIs based on node type:
 * - Branch nodes: Aggregated stats (weighted average, class counts, etc.)
 * - Leaf nodes: Direct attendance percentage
 *
 * PLACEHOLDER: Currently returns null. Will be implemented after Milestone 0.
 */

import type { OrgUnitType } from '@/data/types'

interface NodeKPIsProps {
  nodeId: string
  nodeType: OrgUnitType
}

export function NodeKPIs({ nodeId: _nodeId, nodeType: _nodeType }: NodeKPIsProps) {
  // TODO: Implement after contract shapes arrive
  // For now, existing pages use their specific KPI components (KPIRow, DepartmentKPIs, etc.)
  void _nodeId
  void _nodeType
  return null
}
