---
Task ID: 1
Agent: Main
Task: Fix AI intervention - was failing with "AI service token not available"

Work Log:
- Investigated the AI suggest route which was expecting `x-token` from gateway headers
- The frontend calls the API directly without gateway token injection
- Replaced direct fetch approach with `z-ai-web-dev-sdk` server-side SDK call
- Added type casts for consultation field types to satisfy TypeScript strict mode
- Removed dependency on gateway-injected headers entirely

Stage Summary:
- AI intervention now uses `ZAI.create()` + `zai.chat.completions.create()` directly
- No more `x-token` header dependency - works in all environments
- File: src/app/api/consultations/[id]/ai-suggest/route.ts

---
Task ID: 2
Agent: Main
Task: Fix risk distribution pie chart not updating on dashboard

Work Log:
- Analyzed dashboard stats API - pie chart used patient table risk_level
- Consultation risk_level was saved to consultation table, not synced to patient table
- Added patient risk_level sync in consultation PUT route (when riskLevel is saved)
- Updated pie chart to use consultation-based risk counts (consultationsByRisk)
- Updated pie chart description and center label for clarity

Stage Summary:
- When consultation risk_level is saved, patient table is also updated
- Pie chart now shows "Consultation breakdown by assessed risk level"
- Center label shows total assessed consultations
- Files: src/app/api/consultations/[id]/route.ts, src/components/dashboard/dashboard-view.tsx

---
Task ID: 3
Agent: Main
Task: Fix input focus loss on new consultation (attempt 2)

Work Log:
- Previous fix (converting inline JSX elements to function calls) did not resolve the issue
- Replaced element-reference focus tracking with ID-based approach
- Added `handleFieldFocus` callback that stores focused field ID in a ref
- Added `onFocus` handlers to all 18 form inputs across all steps
- useLayoutEffect restores focus by `getElementById` after each render commit
- ID-based approach survives DOM element recreation (more robust than reference tracking)

Stage Summary:
- All form fields now track focus by their HTML element ID
- Focus is restored after every render using getElementById
- Files: src/components/consultations/consultation-view.tsx
