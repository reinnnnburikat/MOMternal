# Worklog: Fix Past Diagnoses Accumulation — Separate useEffect Refactor

## Date: 2025-01-22

## Task
Fix Health History past diagnoses not accumulating across consultations (1st, 2nd, 3rd consultations' diagnoses not showing when viewing the 4th consultation).

## Investigation
- Re-read full data flow: `/api/consultations/[id]` → `data.patient.id` → `/api/patients/[id]` → filter/map → `setPastDiagnoses()`
- Verified `/api/patients/[id]/route.ts` returns ALL consultations (no pagination), correctly mapped via `mapConsultationFromDb` (`icd10_diagnosis` → `icd10Diagnosis`, `nanda_diagnosis` → `nandaDiagnosis`)
- Verified `mapConsultationFromDb` in `src/lib/case.ts` correctly maps all diagnosis fields
- Analyzed the previous fix's approach: nested fetch inside `fetchConsultation()` with `data.patient?.id`

## Root Cause
The past diagnoses fetch was **nested deeply inside** the `fetchConsultation()` async function (lines 1036-1133), which caused several problems:

1. **No AbortController cleanup** — React Strict Mode double-mount fires the `useEffect` twice with no cleanup, creating two concurrent `fetchConsultation()` invocations. The second invocation's `setPastDiagnoses([])` could race with the first invocation's `setPastDiagnoses(diagnoses)`, causing the state to be reset after being populated.

2. **Tightly coupled to consultation fetch** — If the outer consultation fetch succeeded but any intermediate state-setting code threw, the past diagnoses fetch would never execute.

3. **Single point of failure via `data.patient?.id`** — If the nested `patient` object was undefined for any reason, the fetch was silently skipped.

4. **No handling for pre-parsed JSON** — `JSON.parse()` was called on `c.icd10Diagnosis` which could already be a parsed array if the DB driver auto-parses JSON columns, causing a silent catch that skipped the data.

## Changes Made

### Files Modified
- `src/components/consultations/consultation-view.tsx`

### 1. Added `patientId` to `ConsultationData` interface (Line 118)
- Added `patientId?: string;` field so we can use it as a fallback if `consultation.patient.id` is ever undefined
- Both fields (`patient.id` and `patientId`) map to the same patient DB UUID

### 2. Extracted past diagnoses fetch into separate `useEffect` (Lines 1055-1176)
- **New `useEffect` with `[consultation]` dependency** — fires whenever the consultation state is set/updated
- **AbortController cleanup** — properly handles Strict Mode double-mounts and unmounts by aborting stale fetches
- **Dual patientId source**: `consultation.patient?.id || consultation.patientId` — falls back to the direct foreign key field if the nested patient object is missing
- **Robust JSON parsing**: `typeof raw === 'string' ? JSON.parse(raw) : raw` — handles both JSON strings and already-parsed objects
- **Typed filter/map**: Changed `any` to `Record<string, unknown>` with explicit type assertions for better type safety
- **AbortError detection**: Silently ignores `AbortError` (expected during cleanup) while still logging real errors

### 3. Removed nested fetch from `fetchConsultation()` (Lines 1036-1133, removed)
- The `setPastDiagnoses([])` reset at line 932 still runs in the consultation fetch `useEffect` to clear stale data when switching consultations
- The `setHealthHistoryRefCode` and `startStep` logic flows directly after the reset, no longer blocked by the past diagnoses fetch

## Verification
- ESLint: 0 errors
- Dev server: Compiled successfully (Turbopack hot reload)
- No rendering code changes — only data fetching logic was modified

---

# Worklog: Enhanced Add Patient Form Layout & Visual Polish

## Date: 2025-01-22

## Task
Enhance the Add Patient form in `src/components/patients/new-patient-view.tsx` to maximize space utilization and improve visual presentation. Layout-only changes — no functionality, validation, or data handling modifications.

## Changes Made

### Files Modified
- `src/components/patients/new-patient-view.tsx`

### 1. Form Max Width (Line 325)
- Changed `max-w-6xl` (1152px) to `max-w-7xl` (1280px) for maximum width utilization on large screens.

### 2. Card 1 — Personal Information Header (Lines 329-330)
- Added `hover:shadow-md transition-shadow duration-200 overflow-hidden` to Card for subtle hover elevation effect.
- Replaced `bg-rose-50/40 rounded-t-xl` header with gradient `bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-950/20 dark:to-transparent`.
- Added `border-l-4 border-l-rose-500` left accent border for strong visual hierarchy.
- Increased padding: `px-5 lg:px-6 pt-5` (was `px-4 pt-4`).

### 3. Card 1 Content Padding (Line 339)
- Changed to `px-5 lg:px-6 pb-5 space-y-5` (was `px-4 pb-4 space-y-4`) for more breathing room.

### 4. Patient Name Fields — 4-Column on XL (Lines 341-415)
- Upgraded grid from `lg:grid-cols-3` to `lg:grid-cols-3 xl:grid-cols-4`.
- Merged Name Extension into the same grid row as Surname, First Name, Middle Initial.
- Removed separate Name Extension grid wrapper — all 4 name fields now share one grid.
- Result: on XL screens, all name fields appear in a single row.

### 5. Address Sub-Section Styling (Lines 442-443)
- Replaced `border-t` separator with `border-l-2 border-l-rose-200 dark:border-l-rose-800` left accent.
- Added subtle background: `bg-rose-50/30 dark:bg-rose-950/10 rounded-r-lg`.
- Upgraded label to uppercase with tracking: `font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider`.

### 6. Occupation & Demographics Sub-Section (Lines 496-501)
- Added matching left border accent wrapper (same rose styling as Address section).
- Added new sub-header: "OCCUPATION & DEMOGRAPHICS" with Briefcase icon.
- Upgraded grid from `lg:grid-cols-3` to `lg:grid-cols-3 xl:grid-cols-4`.
- Wrapped in the same styled container as Address for visual consistency.

### 7. Card 2 — Health History Header (Lines 629-630)
- Same hover/shadow treatment as Card 1.
- Switched color accent from rose to **sky/blue** (`border-l-sky-500`, `from-sky-50/50`, `text-sky-500`) to visually distinguish the two cards.
- Heart icon now uses sky-500 color instead of rose-500.

### 8. Card 2 Content Padding (Line 639)
- Changed to `px-5 lg:px-6 pb-6 space-y-6` for more generous section spacing.

### 9. Checkbox Grids — 4-Column on XL (Lines 669, 702, 811)
- **Past Medical History**: `lg:grid-cols-3` → `lg:grid-cols-3 xl:grid-cols-4`
- **Previous Surgery**: `lg:grid-cols-3` → `lg:grid-cols-3 xl:grid-cols-4`
- **Family History**: `lg:grid-cols-3` → `lg:grid-cols-3 xl:grid-cols-4`

## Responsive Breakpoint Summary
| Breakpoint | Name Fields | Occupation Grid | Checkbox Grids |
|-----------|------------|-----------------|----------------|
| Mobile (<640px) | 1 col | 1 col | 1 col |
| Tablet (sm: 640px+) | 2 col | 2 col | 2 col |
| Desktop (lg: 1024px+) | 3 col | 3 col | 3 col |
| Large Desktop (xl: 1280px+) | **4 col** | **4 col** | **4 col** |

## Verification
- ESLint: 0 errors
- TypeScript: No new errors
- No functionality changes — purely layout/presentation improvements

---

# Worklog: Past Diagnoses Fix & Status Indicator

## Date: 2025-01-21

## Task
Fix Past Diagnoses (ICD-10 & NANDA) not showing in Health History section, add Completed/In Progress status indicator, and perform whole system check.

## Investigation
- Verified database has consultation records with `icd10_diagnosis` and `nanda_diagnosis` populated (JSON array format)
- Verified `/api/patients/[id]` returns consultations with correct camelCase field mapping (`icd10Diagnosis`, `nandaDiagnosis`)
- Verified `/api/consultations/[id]` returns `patient.id` for fetching related consultations
- Simulated full data flow: consultation load → patient fetch → filter → parse → display
- All API endpoints return correct data format

## Root Cause
The code logic was fundamentally correct. The issue was likely:
1. State not being reset when switching between consultations (stale `pastDiagnoses`)
2. No error visibility if the fetch silently failed
3. Past diagnoses only shown on Health History step (step 1), not on Diagnosis step (step 3)

## Changes Made

### Files Modified
- `src/components/consultations/consultation-view.tsx`

### 1. State Reset (Line ~932)
- Added `setPastDiagnoses([])` at the start of `fetchConsultation` to clear stale data when switching consultations

### 2. Comprehensive Console Logging (Lines ~1038-1128)
- Added detailed `[PastDiagnoses]` prefixed console logs throughout the fetch flow
- Logs: consultation loaded, patient ID, API response status, consultation count, filtered count, parsed results
- Warning logs for: non-OK response, missing format, no patientId

### 3. Completed/In Progress Status Indicator (Lines ~1877-1883, 2243-2248)
- Added colored Badge next to each past consultation showing its status
- **Completed**: Emerald green badge with "✓ Completed"
- **In Progress**: Amber badge with "◷ In Progress"

### 4. Past Diagnoses on Diagnosis Step (Lines ~2226-2269)
- Added compact past diagnoses reference section at the top of the Diagnosis step (step 3)
- Shows consultation number, status badge, date, and diagnosis code pills
- More compact than the Health History version (max-h-48, condensed pills)

### 5. Improved Error Handling
- Added detailed warning messages for each failure point in the fetch chain
- Non-blocking: past diagnoses fetch failure doesn't prevent consultation loading

## Verification
- ESLint: 0 errors
- API tested: `/api/patients/[id]` returns correct consultations with diagnoses
- API tested: `/api/consultations/[id]` returns correct patient.id
- Dev server: Compiled successfully (GET / 200)
- Git push: d15e610

---

# Worklog: Optimize Add Patient Form Layout

## Date: 2025-01-20

## Task
Optimize the Add Patient form in `src/components/patients/new-patient-view.tsx` for better space utilization on desktop screens.

## Changes Made

### 1. Form Max Width (Line 325)
- Changed `max-w-3xl` (768px) to `max-w-6xl` (1152px) to use more horizontal space on desktop.

### 2. Patient Name Fields (Lines 341-418)
- Combined Surname + First Name + Middle Initial into a single 3-column grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`)
- Name Extension remains in its own row with the same 3-col grid class

### 3. Address Section (Line 450)
- Changed the inner `<div className="space-y-4">` to `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">`
- Barangay and Block/Lot/Street now appear side-by-side on tablet and desktop

### 4. Combined Personal Info Fields (Lines 498-619)
- Merged the three separate grid sections (Occupation/Religion, Marital Status/Family Composition, Income Bracket) into a single 3-column grid
- Fields now flow: Occupation, Religion, Marital Status, Family Composition, Income
- Responsive: 1-col mobile, 2-col tablet, 3-col desktop

### 5. Health History Checkbox Grids (Lines 666, 699, 807)
- Updated Past Medical History checkboxes: `grid-cols-1 sm:grid-cols-2` -> `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Updated Previous Surgery checkboxes: same change
- Updated Family History checkboxes: same change

### 6. Health History Dropdown Pairs (Side-by-Side)
- **Trauma + Blood Transfusion** (Lines 725-774): Wrapped in `grid grid-cols-1 sm:grid-cols-2 gap-4`
- **Smoking + Alcohol Intake** (Lines 836-891): Wrapped in `grid grid-cols-1 sm:grid-cols-2 gap-4`
- **Physical Activity + Sleep Pattern** (Lines 949-988): Wrapped in `grid grid-cols-1 sm:grid-cols-2 gap-4`
- Drug Use and Dietary Pattern remain full-width (they have conditional text inputs)

## Verification
- ESLint passed with no errors
- No functionality changes - only layout adjustments
- All responsive breakpoints maintained: 1-col mobile, 2-col tablet (sm:), 3-col desktop (lg:)

---

# Worklog: Batch Features Implementation

## Date: 2025-01-20

## Overview
Implemented 4 features in a single batch: Offline Mode Fix, Delete Patient, Health History Past Diagnoses, and Add Patient Form Layout.

---

## Task 1: Offline Mode Fix (HIGH PRIORITY)

### Files Created
- `src/lib/offline-fetch.ts` — Global fetch interceptor

### Files Modified
- `src/lib/offline-queue.ts` — Added `delete-patient` action type, 200ms delay between queue items
- `src/components/patients/new-patient-view.tsx` — Uses offlineFetch for patient creation
- `src/components/patients/patient-list-view.tsx` — Uses offlineFetch for patient list and consultation creation
- `src/components/patients/patient-profile-view.tsx` — Uses offlineFetch for profile fetch and consultation creation

### Changes
- Created a drop-in `offlineFetch()` replacement for native `fetch()` that handles offline scenarios
- GET requests offline: returns cached data from localStorage
- POST/PUT/PATCH offline: enqueues to offline-queue and returns mock success
- Network failures on mutations: auto-queue for retry
- All patient-related components now use offlineFetch

---

## Task 2: Delete Patient with Cascade

### Files Modified
- `src/app/api/patients/[id]/route.ts` — Updated DELETE handler for cascade deletion
- `src/components/patients/patient-profile-view.tsx` — Added delete button + confirmation dialog

### Changes
- DELETE API now cascades: counts consultations → deletes consultations → deletes health_history → deletes patient
- Removed 409 block that previously prevented deletion
- Added red "Delete Patient" button next to "Edit Patient"
- AlertDialog shows patient name, consultation count warning, and "cannot be undone" message
- Audit logging includes consultationsDeleted count

---

## Task 3: Health History Past Diagnoses

### Files Modified
- `src/components/consultations/consultation-view.tsx`

### Changes
- Removed "Search Existing Health History" search bar and all related code
- Added `pastDiagnoses` state to hold past consultation diagnoses
- Fetches past completed consultations when consultation loads
- Shows read-only Past Diagnoses section with ICD-10 (blue pills) and NANDA (amber pills)
- Each past consultation shows: consultation number, date, nurse name
- Only appears on 2nd+ consultation (when past diagnoses exist)
- Simplified health history header (removed ref code display)

---

## Task 4: Add Patient Form Layout

### Files Modified
- `src/components/patients/new-patient-view.tsx`

### Changes
- Changed form max-width from `max-w-3xl` to `max-w-6xl`
- Combined Surname + First Name + Middle Initial into 3-column row
- Address section: Barangay + Street in 3-column grid
- Merged 3 separate grids into one unified 3-column grid for Occupation/Religion/Marital Status/Family/Income
- Checkbox grids upgraded to 3-column on desktop
- Health history dropdowns paired side-by-side (Trauma+Blood Tx, Smoking+Alcohol, Physical+Sleep)

## Verification
- ESLint: 0 errors
- Dev server: Compiled successfully (GET / 200)
- All pre-existing TS errors remain unchanged (unrelated to changes)
