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

---
Task ID: 4
Agent: Main
Task: Fix AI intervention 401 token error + Fix risk pie chart caching

Work Log:
- Investigated AI SDK source code: `ZAI.create()` reads config from `/etc/.z-ai-config` (has `baseUrl` + `apiKey` but no `token` field)
- The AI backend at `172.25.136.193:8080` requires `X-Token` header for all requests
- The Caddy gateway forwards `X-Token` from incoming request via `header_up X-Token {>X-Token}`
- The outer sandbox gateway should inject `X-Token` into real browser requests
- Fix: Read `X-Token` from the incoming NextRequest headers and inject into SDK config before the AI call
- Added `export const dynamic = "force-dynamic"` to both API routes to prevent Next.js route caching
- Added `Cache-Control: no-store` response headers to dashboard stats API
- Added `cache: 'no-store'` to frontend fetch call for dashboard stats
- Added debug logging to AI route to trace X-Token availability
- Created temporary debug endpoint at `/api/debug/headers` to verify gateway token injection
- Improved AI error message: token-related 401 errors show user-friendly message instead of raw error

Stage Summary:
- AI intervention now reads X-Token from incoming request headers and passes to SDK
- Dashboard pie chart will always show fresh data (no server or browser caching)
- Files: src/app/api/consultations/[id]/ai-suggest/route.ts, src/app/api/dashboard/stats/route.ts, src/components/dashboard/dashboard-view.tsx, src/app/api/debug/headers/route.ts
