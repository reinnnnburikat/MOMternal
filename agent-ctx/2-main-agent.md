# Task ID: 2 — Fix reversed keystroke bug in MOMternal consultation form

## Agent: Main Agent

## Summary
Fixed the persistent character reversal bug (typing "rein" produces "nier") in the consultation form's VitalInput, HealthInput, and HealthTextarea components.

## Root Cause
VitalInput, HealthInput, HealthTextarea were wrapped in `memo()` but ALL props passed to them were unstable references:
- `onChange={v => handleVitalChange('bloodPressure', v)}` — new arrow function every render
- `icon={<Activity className="..." />}` — new JSX object every render  
- `getVitalColor(...)` — not memoized
- Parent has ~50+ state variables, so any keystroke triggered full re-render cascade

`memo()` was completely defeated because every render created new prop references, causing shallow equality checks to fail.

## Changes Made

### 1. Local State Buffering (Primary Fix)
Rewrote VitalInput, HealthInput, and HealthTextarea to maintain their own `localValue` state:
- On keystroke: updates localValue immediately, calls onChange to sync parent
- On external value change: syncs localValue from prop via useEffect
- Uses `isInternalChange` ref flag to prevent parent state updates from overwriting local typing

### 2. Stable Icon Constants
Extracted 10 icon JSX constants outside ConsultationView (ICON_BP, ICON_PULSE, etc.) to prevent re-creation every render.

### 3. Stable Field-Specific onChange Handlers
Created 7 useCallback wrappers for VitalInput fields (handleBloodPressureChange, handleHeartRateChange, etc.) instead of inline arrow functions.

### 4. Stable Callbacks for All Textarea/Input Fields
Created 23 useCallback handlers for every textarea and conditional input across all steps:
- Findings (3), Diagnosis (2), Care Plan (1), Referral (1), Health History (10), Custom Intervention (1)
- Replaced all inline `onChange={e => { ... }}` patterns

## File Modified
- `/home/z/my-project/src/components/consultations/consultation-view.tsx`

## Verification
- ✅ `bun run lint` — zero errors
- ✅ Dev server compiled successfully
