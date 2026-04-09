# Task B1-C1-C5: Dashboard Enhancement

## Work Done

### B1: Clickable Stat Cards
- Added `filterRisk` (string) and `filterReferralPending` (boolean) to Zustand app store with setters
- Both persisted via zustand/persist so navigation state survives page loads
- Updated patient-list-view.tsx to read store filter on mount and apply to local risk filter state
- Added `handleStatCardClick` handler in dashboard-view.tsx with switch logic:
  - Total Patients → navigate to patients with riskFilter='all'
  - Low Risk → navigate to patients with riskFilter='low'
  - High Risk Patients → navigate to patients with riskFilter='high'
  - Pending Referrals → navigate to patients with filterReferralPending=true
  - Recent Consultations → navigate to patients with riskFilter='all'
- Added `cursor-pointer` class and enhanced hover shadow (`hover:shadow-lg`) to all stat cards

### C1: Real Historical Sparkline Data
- Replaced `generateSparklineData()` (Math.random-based) with `deriveSparklineFromTrend()` 
- New function takes real `monthlyTrend` data and a target ratio to scale values proportionally
- Each card's sparkline is derived from actual monthly trend data:
  - Total Patients: scaled by totalPatients/trendTotal ratio
  - Low Risk: scaled by lowRiskPatients/trendTotal ratio
  - High Risk: scaled by highRiskPatients/trendTotal ratio
  - Pending Referrals: scaled by pendingReferrals/trendTotal ratio
  - Recent Consultations: scaled by recentConsultations.length/trendTotal ratio
- Properly memoized with `useMemo` to prevent re-render flicker
- Removed unused `generateMonthlyTrendData()` function that used Math.random()

### C5: Loading/Error States
- Added `statsError` state boolean
- `fetchStats` now sets `statsError=true` on both HTTP errors and network exceptions
- Error state is cleared when retry begins (`setStatsError(false)`)
- Added error banner between header and stats cards with:
  - AlertTriangle icon in red
  - "Failed to load dashboard data" title
  - "Check your connection and try again." subtitle
  - Retry button with RefreshCw icon that calls fetchStats

## Files Changed
1. `src/store/app-store.ts` - Added filterRisk, filterReferralPending state + setters
2. `src/components/patients/patient-list-view.tsx` - Reads store filter on mount
3. `src/components/dashboard/dashboard-view.tsx` - Clickable cards, real sparklines, error banner

## Lint Result
0 errors, 0 warnings
