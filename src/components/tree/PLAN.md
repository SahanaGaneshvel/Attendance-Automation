# Recursive Node-View Component Architecture

## Overview

The org tree is depth-agnostic: a node can be institution, school, department, or class.
The UI must handle arbitrary depth while rendering appropriate widgets at each level.

## Component Hierarchy

```
<OrgNodeView>
├── <NodeHeader>           - Breadcrumb + title + back button
├── <NodeKPIs>             - Aggregated stats for this node
├── <NodeChildren>         - Grid of child summaries (clickable cards)
│   └── <ChildNodeCard>    - Summary card for each child
├── <NodeWidgets>          - Conditional widgets based on node type
│   ├── <AttendanceTrend>  - Trend chart (all levels)
│   ├── <DistributionBand> - Class distribution by % band
│   ├── <ChronicOffenders> - Classes below threshold for N days
│   ├── <BiggestMovers>    - Week-over-week changes
│   └── <ManualEntry>      - Only at leaf (class) level
└── <ComplianceTable>      - Classes still pending today (non-leaf only)
```

## OrgNodeView Props

```typescript
interface OrgNodeViewProps {
  nodeId: string          // Current node's ID
  nodeType: OrgUnitType   // 'institution' | 'school' | 'department' | 'class'
  path: OrgUnit[]         // Ancestor path for breadcrumb
}
```

## Rendering Rules by Node Type

### Institution / School / Department (Branch Nodes)
- Show aggregated KPIs (weighted average of descendants)
- Show child nodes as clickable cards
- Show trend chart
- Show distribution bands (how many classes in each % bucket)
- Show chronic offenders (classes below threshold for N days)
- Show biggest movers (week-over-week delta)
- Show compliance table (pending classes)
- NO manual entry

### Class (Leaf Node)
- Show daily attendance as KPI
- Show trend chart (class-specific)
- Show manual entry widget (fallback for missing ERP data)
- NO children to display
- NO chronic offenders (single class)
- NO distribution bands (single class)

## Data Flow

1. `useOrgNode(nodeId)` hook fetches node data
2. `useNodeStats(nodeId, date)` computes aggregated stats
3. `useNodeChildren(nodeId)` returns immediate children
4. Widgets use these hooks internally

## URL Structure

```
/                     → Institution root (or user's scope root)
/school/:schoolId     → School view
/dept/:deptId         → Department view
/class/:classId       → Class (section) view
```

For MVP, we keep the current flat structure:
```
/                     → College Overview (institution)
/department/:deptId   → Department view
/section/:sectionId   → Section (class) view
```

The recursive component design allows easy addition of school level later.

## Implementation Notes

- Use React Router's nested routes for drill-down
- Breadcrumb built from `path` prop (materialized path from OrgUnit)
- Widgets receive `nodeId` and `nodeType`, decide internally what to render
- Class-level widgets use `classId`, aggregate widgets use subtree

## Files to Create

1. `src/components/tree/OrgNodeView.tsx` - Main recursive container
2. `src/components/tree/NodeHeader.tsx` - Breadcrumb + title
3. `src/components/tree/NodeKPIs.tsx` - Wrapper that picks right KPI component
4. `src/components/tree/ChildNodeCard.tsx` - Summary card for children
5. `src/hooks/useOrgNode.ts` - Node data fetching hook
6. `src/hooks/useNodeStats.ts` - Aggregated stats hook

## Migration Path

1. **Now (pre-contract)**: Create component skeletons, defer to existing pages
2. **After Milestone 0**: Wire to actual tree data, replace existing pages
3. **After school level added**: Just add route, components handle it
