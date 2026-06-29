/**
 * NodeWidgets - Conditional widgets based on node type
 *
 * Renders different widget sets for branch vs leaf nodes:
 *
 * Branch nodes (institution, school, department):
 * - Attendance trend chart
 * - Distribution by percentage band
 * - Chronic offenders (classes below threshold for N days)
 * - Biggest movers (week-over-week delta)
 * - Compliance table (classes still pending)
 *
 * Leaf nodes (class):
 * - Attendance trend chart
 * - Manual entry widget
 *
 * PLACEHOLDER: Currently returns null. Will be implemented after Milestone 0.
 */

import type { OrgUnitType } from '@/data/types'

interface NodeWidgetsProps {
  nodeId: string
  nodeType: OrgUnitType
}

export function NodeWidgets({ nodeId: _nodeId, nodeType: _nodeType }: NodeWidgetsProps) {
  // TODO: Implement after contract shapes arrive
  // Will conditionally render widgets based on nodeType
  void _nodeId
  void _nodeType
  return null
}
