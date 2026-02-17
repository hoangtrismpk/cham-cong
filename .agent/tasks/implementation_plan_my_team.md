# Implementation Plan: My Team Dashboard & Org Chart

## Goal
Implement a dedicated "My Team" dashboard for Managers to view their direct reports, statistics, and an interactive Organizational Chart.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI Libs**: Shadcn/UI, Lucide React
- **Visualization**: `@xyflow/react` (New ReactFlow) + `dagre` (Auto layout)
- **Database**: Supabase (using `manager_id` relationship)

## Tasks

### Phase 1: Setup & Dependencies
- [ ] Install `@xyflow/react` and `dagre`.
- [ ] Create folder structure `app/admin/my-team`.

### Phase 2: Backend Logic
- [ ] Create `actions/my-team.ts`:
    - `getMyTeamStats()`: Count active employees, present today, absent, late.
    - `getMyTeamTree()`: Recursive/Flat fetch of reports hierarchy for Org Chart.

### Phase 3: Frontend - Components
- [ ] `components/org-chart/OrgChart.tsx`: Wrapper for ReactFlow.
- [ ] `components/org-chart/CustomNode.tsx`: Card style node showing Avatar + Name + Role.
- [ ] `components/my-team/TeamStats.tsx`: Cards for KPIs.
- [ ] `components/my-team/TeamTable.tsx`: Simplified table view.

### Phase 4: Integration
- [ ] Create page `app/admin/my-team/page.tsx` with Tabs (Dashboard | Org Chart).
- [ ] Update `components/dashboard-sidebar.tsx` to add "My Team" link (visible to Admin/Manager).

### Phase 5: Verification
- [ ] Test with Admin account (Full hierarchy).
- [ ] Test with Manager account (Sub-tree hierarchy).
