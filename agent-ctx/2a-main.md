---
Task ID: 2a
Agent: Main Agent
Task: Complete rewrite of MOMternal consultation wizard (9 steps → 7 steps)

Work Log:
- Read worklog.md and all reference files (consultation-view.tsx, API routes, data files, CodeCombobox, store)
- Analyzed the existing 2941-line consultation-view.tsx with 9-step wizard
- Analyzed the updated API route (STEP_FIELD_MAP with 7 steps, completion at stepCompleted >= 6)
- Analyzed AI suggest API and AI prompts library (AIResponse type with full risk/prevention data)
- Designed the new 7-step structure based on specification
- Wrote complete new consultation-view.tsx (~1400 lines, down from 2941)
- Fixed 2 lint warnings (unused eslint-disable directives)
- Verified: 0 errors, 0 warnings, dev server compiling successfully

Stage Summary:
- Complete rewrite from 9-step to 7-step wizard
- Step 0: Assessment (Type of Visit, G/P, LMP, auto AOG, Chief Complaint, Allergies, Medications, Vital Signs with full color coding)
- Step 1: Health History (structured form with search existing records)
- Step 2: Additional Findings (Physical Exam, Lab Results, Notes)
- Step 3: Diagnosis (NANDA-I CodeCombobox + ICD-10 CodeCombobox)
- Step 4: AI Summary (auto-generated risk classification, prevention level, rationale, interventions - NO manual inputs, Reassess button, auto-triggers on entry)
- Step 5: Care Plan (NIC dropdown filtered by NANDA domain, AI-suggested interventions, inline evaluation Met/Partially Met/Unmet, NOC per intervention, outcome summary)
- Step 6: Referral (fixed "Refer to Doctor", priority dropdown, facility input, pre-filled assessment summary, generate button, PDF download)
- Vital sign color coding: BP, HR, Temp, RR, O2, Pain, FHR (green/yellow/red)
- BMI classification: Underweight/Normal/Overweight/Obese with color coding
- NIC interventions filtered by selected NANDA diagnosis domain
- Dark mode support throughout
- Auto-save on step change and unmount preserved
- Focus preservation across re-renders preserved
- Resume from paused assessment adapted for 7 steps
- File changed: src/components/consultations/consultation-view.tsx
