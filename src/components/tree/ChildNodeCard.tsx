/**
 * ChildNodeCard - Summary card for a child node
 *
 * Displays:
 * - Node name and type
 * - Attendance percentage (weighted for branches, direct for class)
 * - Sparkline trend
 * - Warning badge if below threshold
 *
 * PLACEHOLDER: Currently returns null. Will be implemented after Milestone 0.
 */

import type { OrgUnit } from '@/data/types'

interface ChildNodeCardProps {
  node: OrgUnit
}

export function ChildNodeCard({ node: _node }: ChildNodeCardProps) {
  // TODO: Implement after contract shapes arrive
  // _node will be used to render card contents
  void _node // Mark as intentionally unused
  return null
}
