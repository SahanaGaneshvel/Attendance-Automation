/**
 * ChildNodeGrid - Grid of clickable cards for child nodes
 *
 * Shows immediate children of the current node as summary cards.
 * Clicking a card navigates to that child's detailed view.
 *
 * PLACEHOLDER: Currently returns null. Will be implemented after Milestone 0.
 */

interface ChildNodeGridProps {
  parentId: string
}

export function ChildNodeGrid({ parentId: _parentId }: ChildNodeGridProps) {
  // TODO: Implement after contract shapes arrive
  // Will use useNodeChildren(_parentId) to get children
  // Will render ChildNodeCard for each child
  void _parentId // Mark as intentionally unused
  return null
}
