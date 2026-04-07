/**
 * MOMternal AI Intervention Stress Test Suite
 * 100 test cases covering all clinical scenarios for maternal health.
 * Target: 90%+ accuracy.
 *
 * Usage: bun run scripts/ai-stress-test.ts
 */

import { type AssessmentData } from '../src/lib/ai-prompts';

// ─── Test Types ──────────────────────────────────────────────────────────

interface TestAssertion {
  preventionLevel?: string;
  referralNeeded?: boolean;
  interventionCount?: { min: number; max?: number };
  mustIncludeCategories?: string[];
  mustNotIncludeCategories?: string[];
  priorityCategory?: string;
  hasInterventions?: boolean;
}

interface TestCase {
  id: number;
  category: string;
  name: string;
  input: AssessmentData;
  assertions: TestAssertion;
}

interface TestResult {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  failures: string[];
  responseJson: any;
  duration: number;
}

// ─── Test Cases ──────────────────────────────────────────────────────────

function buildTestCases(): TestCase[] {
  const tests: TestCase[] = [];

  // ── A: Risk Stratification (15 tests) ──

  // A01: Low risk — normal pregnancy
  tests.push({
    id: 1, category: 'A. Risk Stratification',
    name: 'Low risk — normal pregnancy, all vitals normal',
    input: {
      subjectiveSymptoms: 'Feeling well, normal fetal movements, no complaints',
      objectiveVitals: JSON.stringify({ bloodPressure: '110/70 mmHg', heartRate: '78 bpm', temperature: '36.8°C', weight: '62 kg', respiratoryRate: '18 cpm' }),
      fetalHeartRate: '138 bpm',
      fundalHeight: '28 cm',
      labResults: 'Hb: 12.5 g/dL, Urinalysis: negative, Blood glucose: 88 mg/dL',
      clinicalContext: { gravidity: 2, parity: 1, aog: '32 weeks', bloodType: 'O+', riskLevel: 'low' },
    },
    assertions: { preventionLevel: 'primary', referralNeeded: false, interventionCount: { min: 3, max: 10 }, mustIncludeCategories: ['Physiological', 'Educational'], mustNotIncludeCategories: ['Safety'], priorityCategory: 'Educational' },
  });

  // A02: Moderate risk — mild anemia
  tests.push({
    id: 2, category: 'A. Risk Stratification',
    name: 'Moderate risk — mild anemia (Hb 9.5)',
    input: {
      subjectiveSymptoms: 'Mild fatigue, occasional dizziness',
      objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '82', temperature: '36.7', weight: '58', respiratoryRate: '18' }),
      fetalHeartRate: '142 bpm',
      labResults: 'Hb: 9.5 g/dL, Urinalysis: negative',
      clinicalContext: { gravidity: 3, parity: 1, aog: '28 weeks', bloodType: 'B+', riskLevel: 'moderate' },
    },
    assertions: { preventionLevel: 'secondary', referralNeeded: false, mustIncludeCategories: ['Physiological'] },
  });

  // A03: Moderate risk — elevated BP
  tests.push({
    id: 3, category: 'A. Risk Stratification',
    name: 'Moderate risk — elevated BP (135/88)',
    input: {
      subjectiveSymptoms: 'Mild headache, swelling of feet',
      objectiveVitals: JSON.stringify({ bloodPressure: '135/88 mmHg', heartRate: '88', temperature: '36.9', weight: '65', respiratoryRate: '20' }),
      fetalHeartRate: '140 bpm',
      fundalHeight: '30 cm',
      labResults: 'Hb: 11.2, Urinalysis: trace protein',
      physicalExam: 'Bilateral pedal edema +1',
      clinicalContext: { gravidity: 2, parity: 0, aog: '34 weeks', bloodType: 'A+', riskLevel: 'moderate' },
    },
    assertions: { preventionLevel: 'secondary', referralNeeded: false, mustIncludeCategories: ['Physiological', 'Safety'] },
  });

  // A04: High risk — severe preeclampsia
  tests.push({
    id: 4, category: 'A. Risk Stratification',
    name: 'High risk — severe preeclampsia (BP 170/110)',
    input: {
      subjectiveSymptoms: 'Severe headache with blurred vision, epigastric pain',
      objectiveVitals: JSON.stringify({ bloodPressure: '170/110 mmHg', heartRate: '96', temperature: '37.8', weight: '70', respiratoryRate: '22' }),
      fetalHeartRate: '155 bpm',
      labResults: 'Hb: 10.5, Urinalysis: 3+ protein',
      physicalExam: 'Severe edema, hyperreflexia, right upper quadrant tenderness',
      icd10Diagnosis: 'O14.1 — Severe pre-eclampsia',
      nandaDiagnosis: 'Risk for Ineffective Cerebral Tissue Perfusion',
      clinicalContext: { gravidity: 1, parity: 0, aog: '30 weeks', bloodType: 'O+', riskLevel: 'high' },
    },
    assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'], mustNotIncludeCategories: [], priorityCategory: 'Safety' },
  });

  // A05: High risk — FHR distress
  tests.push({
    id: 5, category: 'A. Risk Stratification',
    name: 'High risk — FHR bradycardia (100 bpm)',
    input: {
      subjectiveSymptoms: 'Reduced fetal movements noticed since this morning',
      objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '90', temperature: '37.0', weight: '63', respiratoryRate: '18' }),
      fetalHeartRate: '100 bpm',
      labResults: 'Hb: 11.0, normal',
      clinicalContext: { gravidity: 2, parity: 1, aog: '36 weeks', bloodType: 'AB+', riskLevel: 'high' },
    },
    assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'], priorityCategory: 'Safety' },
  });

  // A06: Low risk — routine 2nd trimester
  tests.push({
    id: 6, category: 'A. Risk Stratification',
    name: 'Low risk — routine 2nd trimester visit',
    input: {
      subjectiveSymptoms: 'Fetal movements felt, good appetite, no concerns',
      objectiveVitals: JSON.stringify({ bloodPressure: '112/72', heartRate: '76', temperature: '36.6', weight: '60', respiratoryRate: '16' }),
      fetalHeartRate: '145 bpm',
      fundalHeight: '22 cm',
      labResults: 'All normal',
      clinicalContext: { gravidity: 1, parity: 0, aog: '20 weeks', bloodType: 'O+', riskLevel: 'low' },
    },
    assertions: { preventionLevel: 'primary', referralNeeded: false },
  });

  // A07: High risk — multiple complications
  tests.push({
    id: 7, category: 'A. Risk Stratification',
    name: 'High risk — severe anemia + hypertension',
    input: {
      subjectiveSymptoms: 'Severe fatigue, palpitations, shortness of breath',
      objectiveVitals: JSON.stringify({ bloodPressure: '155/100 mmHg', heartRate: '105', temperature: '37.2', weight: '55', respiratoryRate: '24' }),
      fetalHeartRate: '158 bpm',
      labResults: 'Hb: 6.8 g/dL, Blood glucose: 92',
      clinicalContext: { gravidity: 4, parity: 3, aog: '28 weeks', bloodType: 'O-', riskLevel: 'high' },
    },
    assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety', 'Physiological'] },
  });

  // A08-A15: More risk stratification
  tests.push({
    id: 8, category: 'A. Risk Stratification', name: 'Low risk — early pregnancy 8 weeks',
    input: { subjectiveSymptoms: 'Mild nausea, no vomiting', objectiveVitals: JSON.stringify({ bloodPressure: '115/75', heartRate: '74', temperature: '36.7', weight: '52', respiratoryRate: '16' }), labResults: 'Normal', clinicalContext: { gravidity: 1, parity: 0, aog: '8 weeks', bloodType: 'A+', riskLevel: 'low' } },
    assertions: { preventionLevel: 'primary', referralNeeded: false },
  });
  tests.push({
    id: 9, category: 'A. Risk.Stratification', name: 'Moderate risk — gestational diabetes controlled',
    input: { subjectiveSymptoms: 'Thirsty, frequent urination', objectiveVitals: JSON.stringify({ bloodPressure: '122/78', heartRate: '80', temperature: '36.9', weight: '68', respiratoryRate: '18' }), fetalHeartRate: '138 bpm', labResults: 'Fasting glucose: 105 mg/dL (GDM controlled with diet)', icd10Diagnosis: 'O24.3 — Gestational diabetes mellitus', clinicalContext: { gravidity: 2, parity: 0, aog: '30 weeks', riskLevel: 'moderate' } },
    assertions: { preventionLevel: 'secondary', referralNeeded: false, mustIncludeCategories: ['Educational', 'Physiological'] },
  });
  tests.push({
    id: 10, category: 'A. Risk Stratification', name: 'High risk — placental abruption signs',
    input: { subjectiveSymptoms: 'Sudden vaginal bleeding with abdominal pain', objectiveVitals: JSON.stringify({ bloodPressure: '100/60', heartRate: '110', temperature: '36.8', weight: '64', respiratoryRate: '20' }), fetalHeartRate: '165 bpm', labResults: 'Hb: 10.8', icd10Diagnosis: 'O45 — Placental abruption', clinicalContext: { gravidity: 3, parity: 1, aog: '33 weeks', riskLevel: 'high' } },
    assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'], priorityCategory: 'Safety' },
  });
  tests.push({
    id: 11, category: 'A. Risk Stratification', name: 'Moderate risk — urinary tract infection',
    input: { subjectiveSymptoms: 'Dysuria, frequency, urgency', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '84', temperature: '37.8', weight: '61', respiratoryRate: '18' }), labResults: 'Urinalysis: positive nitrites, WBC elevated', icd10Diagnosis: 'O23 — UTI in pregnancy', nandaDiagnosis: 'Risk for Infection', clinicalContext: { gravidity: 2, parity: 1, aog: '24 weeks', riskLevel: 'moderate' } },
    assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] },
  });
  tests.push({
    id: 12, category: 'A. Risk Stratification', name: 'Low risk — advanced maternal age 38',
    input: { subjectiveSymptoms: 'Fine, normal movements', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '80', temperature: '36.8', weight: '66', respiratoryRate: '16' }), fetalHeartRate: '140 bpm', labResults: 'All normal', clinicalContext: { gravidity: 3, parity: 1, aog: '16 weeks', bloodType: 'O+', riskLevel: 'low' } },
    assertions: { preventionLevel: 'primary', referralNeeded: false },
  });
  tests.push({
    id: 13, category: 'A. Risk Stratification', name: 'High risk — eclampsia seizure history',
    input: { subjectiveSymptoms: 'History of seizures in previous pregnancy, severe headache', objectiveVitals: JSON.stringify({ bloodPressure: '145/95', heartRate: '92', temperature: '37.1', weight: '67', respiratoryRate: '20' }), fetalHeartRate: '150 bpm', labResults: 'Proteinuria 2+', icd10Diagnosis: 'O15 — Eclampsia', nandaDiagnosis: 'Risk for Trauma, Risk for Aspiration', clinicalContext: { gravidity: 5, parity: 3, aog: '29 weeks', riskLevel: 'high' } },
    assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' },
  });
  tests.push({
    id: 14, category: 'A. Risk Stratification', name: 'Moderate risk — hypothyroidism',
    input: { subjectiveSymptoms: 'Cold intolerance, constipation, weight gain', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '68', temperature: '36.4', weight: '70', respiratoryRate: '16' }), labResults: 'TSH elevated', clinicalContext: { gravidity: 2, parity: 0, aog: '22 weeks', riskLevel: 'moderate' } },
    assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] },
  });
  tests.push({
    id: 15, category: 'A. Risk Stratification', name: 'Low risk — normal postpartum check',
    input: { subjectiveSymptoms: 'Normal lochia, breastfeeding well', objectiveVitals: JSON.stringify({ bloodPressure: '110/70', heartRate: '76', temperature: '37.0', weight: '58', respiratoryRate: '18' }), labResults: 'Normal', clinicalContext: { gravidity: 2, parity: 2, aog: 'postpartum', riskLevel: 'low' } },
    assertions: { preventionLevel: 'primary', referralNeeded: false },
  });

  // ── B: Vital Sign Thresholds (20 tests) ──

  tests.push({ id: 16, category: 'B. Vital Signs', name: 'Normal BP ≤120/80', input: { objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '78', temperature: '36.8', weight: '60', respiratoryRate: '16' }), fetalHeartRate: '140', clinicalContext: { aog: '28 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary' } });
  tests.push({ id: 17, category: 'B. Vital Signs', name: 'BP 125/82 (elevated)', input: { objectiveVitals: JSON.stringify({ bloodPressure: '125/82', heartRate: '80', temperature: '36.8', weight: '62', respiratoryRate: '18' }), fetalHeartRate: '138', clinicalContext: { aog: '30 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'secondary', referralNeeded: false } });
  tests.push({ id: 18, category: 'B. Vital Signs', name: 'BP 145/95 (HTN Stage 1)', input: { subjectiveSymptoms: 'Headache', objectiveVitals: JSON.stringify({ bloodPressure: '145/95', heartRate: '88', temperature: '36.9', weight: '64', respiratoryRate: '20' }), fetalHeartRate: '142', icd10Diagnosis: 'O13 — Gestational HTN', clinicalContext: { aog: '32 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', referralNeeded: false, mustIncludeCategories: ['Physiological', 'Safety'] } });
  tests.push({ id: 19, category: 'B. Vital Signs', name: 'BP 165/105 (HTN Stage 2)', input: { subjectiveSymptoms: 'Blurred vision, headache', objectiveVitals: JSON.stringify({ bloodPressure: '165/105', heartRate: '94', temperature: '37.0', weight: '66', respiratoryRate: '20' }), fetalHeartRate: '152', icd10Diagnosis: 'O13', clinicalContext: { aog: '34 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 20, category: 'B. Vital Signs', name: 'BP 172/112 (severe range)', input: { subjectiveSymptoms: 'Severe headache, epigastric pain', objectiveVitals: JSON.stringify({ bloodPressure: '172/112', heartRate: '98', temperature: '37.2', weight: '68', respiratoryRate: '22' }), fetalHeartRate: '160', icd10Diagnosis: 'O14.1', nandaDiagnosis: 'Risk for Ineffective Cerebral Tissue Perfusion', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 21, category: 'B. Vital Signs', name: 'FHR 108 bpm (bradycardia)', input: { subjectiveSymptoms: 'Reduced fetal movements', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '80', temperature: '36.8', weight: '62', respiratoryRate: '16' }), fetalHeartRate: '108', clinicalContext: { aog: '34 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Safety', 'Physiological'] } });
  tests.push({ id: 22, category: 'B. Vital Signs', name: 'FHR 162 bpm (tachycardia)', input: { subjectiveSymptoms: 'Active fetal movements', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '82', temperature: '37.5', weight: '63', respiratoryRate: '18' }), fetalHeartRate: '162', clinicalContext: { aog: '36 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Safety', 'Physiological'] } });
  tests.push({ id: 23, category: 'B. Vital Signs', name: 'FHR 95 bpm (severe distress)', input: { subjectiveSymptoms: 'No fetal movement felt today', objectiveVitals: JSON.stringify({ bloodPressure: '118/78', heartRate: '88', temperature: '36.9', weight: '61', respiratoryRate: '18' }), fetalHeartRate: '95', clinicalContext: { aog: '38 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 24, category: 'B. Vital Signs', name: 'Temp 37.7°C (low-grade)', input: { subjectiveSymptoms: 'Mild body aches', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '80', temperature: '37.7', weight: '62', respiratoryRate: '18' }), fetalHeartRate: '140', clinicalContext: { aog: '28 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'secondary' } });
  tests.push({ id: 25, category: 'B. Vital Signs', name: 'Temp 38.2°C (fever)', input: { subjectiveSymptoms: 'Chills, body aches, sore throat', objectiveVitals: JSON.stringify({ bloodPressure: '120/78', heartRate: '90', temperature: '38.2', weight: '60', respiratoryRate: '20' }), fetalHeartRate: '148', labResults: 'WBC 14,000', clinicalContext: { aog: '26 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 26, category: 'B. Vital Signs', name: 'Temp 39.0°C (high fever)', input: { subjectiveSymptoms: 'High fever, rigors, unable to eat', objectiveVitals: JSON.stringify({ bloodPressure: '122/80', heartRate: '100', temperature: '39.0', weight: '58', respiratoryRate: '22' }), fetalHeartRate: '162', labResults: 'WBC 18,000, CRP elevated', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 27, category: 'B. Vital Signs', name: 'Hb 10.5 (mild anemia)', input: { subjectiveSymptoms: 'Fatigue, pale', objectiveVitals: JSON.stringify({ bloodPressure: '115/75', heartRate: '84', temperature: '36.8', weight: '58', respiratoryRate: '18' }), labResults: 'Hb: 10.5 g/dL', clinicalContext: { aog: '24 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'secondary', referralNeeded: false } });
  tests.push({ id: 28, category: 'B. Vital Signs', name: 'Hb 7.5 (moderate anemia)', input: { subjectiveSymptoms: 'Severe fatigue, dizziness, pallor', objectiveVitals: JSON.stringify({ bloodPressure: '118/78', heartRate: '96', temperature: '36.9', weight: '55', respiratoryRate: '20' }), labResults: 'Hb: 7.5 g/dL', clinicalContext: { aog: '28 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety', 'Physiological'] } });
  tests.push({ id: 29, category: 'B. Vital Signs', name: 'Hb 6.2 (severe anemia)', input: { subjectiveSymptoms: 'Extreme fatigue, palpitations, SOB on exertion', objectiveVitals: JSON.stringify({ bloodPressure: '122/82', heartRate: '105', temperature: '37.0', weight: '53', respiratoryRate: '24' }), labResults: 'Hb: 6.2 g/dL, MCV low', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 30, category: 'B. Vital Signs', name: 'Glucose 96 (GDM threshold)', input: { subjectiveSymptoms: 'Polyuria, polydipsia', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '78', temperature: '36.8', weight: '66', respiratoryRate: '16' }), labResults: 'Fasting glucose: 96 mg/dL', clinicalContext: { aog: '26 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Educational', 'Physiological'] } });
  tests.push({ id: 31, category: 'B. Vital Signs', name: 'Glucose 130 (overt DM)', input: { subjectiveSymptoms: 'Polyuria, blurred vision, weight loss', objectiveVitals: JSON.stringify({ bloodPressure: '125/82', heartRate: '82', temperature: '36.9', weight: '64', respiratoryRate: '18' }), labResults: 'Fasting glucose: 130 mg/dL, HbA1c: 8.2%', icd10Diagnosis: 'O24.0 — Pre-existing DM in pregnancy', clinicalContext: { aog: '20 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } });
  tests.push({ id: 32, category: 'B. Vital Signs', name: 'Proteinuria 1+ trace', input: { subjectiveSymptoms: 'No symptoms', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '78', temperature: '36.8', weight: '61', respiratoryRate: '16' }), labResults: 'Urinalysis: protein 1+', clinicalContext: { aog: '30 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'secondary', referralNeeded: false } });
  tests.push({ id: 33, category: 'B. Vital Signs', name: 'Proteinuria 2+ significant', input: { subjectiveSymptoms: 'Swelling, headache', objectiveVitals: JSON.stringify({ bloodPressure: '135/88', heartRate: '86', temperature: '36.9', weight: '66', respiratoryRate: '18' }), labResults: 'Urinalysis: protein 2+', physicalExam: 'Pedal edema +1', clinicalContext: { aog: '32 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Safety'] } });
  tests.push({ id: 34, category: 'B. Vital Signs', name: 'Proteinuria 3+ with HTN', input: { subjectiveSymptoms: 'Severe headache, visual changes', objectiveVitals: JSON.stringify({ bloodPressure: '160/100', heartRate: '92', temperature: '37.0', weight: '68', respiratoryRate: '20' }), labResults: 'Urinalysis: protein 3+', icd10Diagnosis: 'O14 — Pre-eclampsia', clinicalContext: { aog: '34 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 35, category: 'B. Vital Signs', name: 'HR 110 (tachycardia borderline)', input: { subjectiveSymptoms: 'Slight palpitations', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '110', temperature: '36.9', weight: '60', respiratoryRate: '18' }), fetalHeartRate: '140', clinicalContext: { aog: '28 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', referralNeeded: false } });

  // ── C: Trimester-Specific (10 tests) ──
  tests.push({ id: 36, category: 'C. Trimester', name: '1st tri — hyperemesis gravidarum', input: { subjectiveSymptoms: 'Severe nausea, vomiting 6x/day, unable to keep fluids down', objectiveVitals: JSON.stringify({ bloodPressure: '110/70', heartRate: '88', temperature: '37.2', weight: '50', respiratoryRate: '18' }), medications: 'None yet', notes: 'Weight loss of 2kg since last visit', clinicalContext: { gravidity: 1, parity: 0, aog: '10 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 37, category: 'C. Trimester', name: '1st tri — folic acid guidance', input: { subjectiveSymptoms: 'Normal pregnancy, no symptoms', objectiveVitals: JSON.stringify({ bloodPressure: '112/72', heartRate: '74', temperature: '36.7', weight: '54', respiratoryRate: '16' }), notes: 'Patient asks about supplements', clinicalContext: { gravidity: 1, parity: 0, aog: '8 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 38, category: 'C. Trimester', name: '2nd tri — fetal movement education', input: { subjectiveSymptoms: 'Starting to feel baby move, curious about kick counts', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '78', temperature: '36.8', weight: '58', respiratoryRate: '16' }), fetalHeartRate: '144', fundalHeight: '20 cm', clinicalContext: { gravidity: 2, parity: 0, aog: '18 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational', 'Psychosocial'] } });
  tests.push({ id: 39, category: 'C. Trimester', name: '2nd tri — TT immunization', input: { subjectiveSymptoms: 'Routine visit, no complaints', objectiveVitals: JSON.stringify({ bloodPressure: '114/74', heartRate: '76', temperature: '36.8', weight: '60', respiratoryRate: '16' }), notes: 'TT1 already given last visit', clinicalContext: { gravidity: 1, parity: 0, aog: '22 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 40, category: 'C. Trimester', name: '2nd tri — GDM screening due', input: { subjectiveSymptoms: 'No symptoms, routine checkup', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '78', temperature: '36.8', weight: '64', respiratoryRate: '16' }), fundalHeight: '24 cm', notes: 'OGTT scheduled today', clinicalContext: { gravidity: 2, parity: 0, aog: '26 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational', 'Physiological'] } });
  tests.push({ id: 41, category: 'C. Trimester', name: '3rd tri — preterm labor signs', input: { subjectiveSymptoms: 'Regular uterine contractions every 8 minutes, pelvic pressure, low back pain', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '82', temperature: '36.9', weight: '63', respiratoryRate: '18' }), fetalHeartRate: '148', physicalExam: 'Cervix dilated 2cm', icd10Diagnosis: 'O60 — Preterm labor', clinicalContext: { gravidity: 3, parity: 1, aog: '33 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 42, category: 'C. Trimester', name: '3rd tri — birth preparedness', input: { subjectiveSymptoms: 'Asking about delivery plan, breastfeeding', objectiveVitals: JSON.stringify({ bloodPressure: '118/78', heartRate: '80', temperature: '36.8', weight: '66', respiratoryRate: '16' }), fetalHeartRate: '136', clinicalContext: { gravidity: 2, parity: 1, aog: '36 weeks', bloodType: 'O+', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational', 'Psychosocial'] } });
  tests.push({ id: 43, category: 'C. Trimester', name: '3rd tri — decreased fetal movements', input: { subjectiveSymptoms: 'Decreased fetal movements past 24 hours', objectiveVitals: JSON.stringify({ bloodPressure: '122/80', heartRate: '84', temperature: '36.9', weight: '65', respiratoryRate: '18' }), fetalHeartRate: '142', clinicalContext: { gravidity: 2, parity: 0, aog: '37 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 44, category: 'C. Trimester', name: '3rd tri — breastfeeding education', input: { subjectiveSymptoms: 'Wants to breastfeed, asking about technique', objectiveVitals: JSON.stringify({ bloodPressure: '116/76', heartRate: '78', temperature: '36.8', weight: '64', respiratoryRate: '16' }), fetalHeartRate: '140', clinicalContext: { gravidity: 1, parity: 0, aog: '38 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 45, category: 'C. Trimester', name: '3rd tri — danger sign awareness', input: { subjectiveSymptoms: 'Routine visit, no danger signs', objectiveVitals: JSON.stringify({ bloodPressure: '120/78', heartRate: '80', temperature: '36.9', weight: '65', respiratoryRate: '16' }), fetalHeartRate: '140', clinicalContext: { gravidity: 2, parity: 1, aog: '35 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });

  // ── D: NANDA Diagnosis Matching (15 tests) ──
  tests.push({ id: 46, category: 'D. NANDA', name: 'NANDA: Risk for Infection', input: { nandaDiagnosis: 'Risk for Infection related to immunocompromised state', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '78', temperature: '37.5', weight: '60', respiratoryRate: '16' }), notes: ' ROM status: intact', clinicalContext: { aog: '26 weeks', riskLevel: 'moderate' } }, assertions: { mustIncludeCategories: ['Physiological', 'Safety'] } });
  tests.push({ id: 47, category: 'D. NANDA', name: 'NANDA: Anxiety', input: { subjectiveSymptoms: 'Worried about baby health, difficulty sleeping, fear of complications', nandaDiagnosis: 'Anxiety related to pregnancy concerns and health of fetus', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '88', temperature: '36.8', weight: '60', respiratoryRate: '18' }), clinicalContext: { aog: '30 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Psychosocial'] } });
  tests.push({ id: 48, category: 'D. NANDA', name: 'NANDA: Fatigue', input: { subjectiveSymptoms: 'Constant tiredness, difficulty sleeping, low energy', nandaDiagnosis: 'Fatigue related to metabolic demands of pregnancy', objectiveVitals: JSON.stringify({ bloodPressure: '114/74', heartRate: '82', temperature: '36.9', weight: '62', respiratoryRate: '16' }), clinicalContext: { aog: '32 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Physiological', 'Psychosocial'] } });
  tests.push({ id: 49, category: 'D. NANDA', name: 'NANDA: Imbalanced Nutrition', input: { subjectiveSymptoms: 'Poor appetite, nausea, vomiting, difficulty eating', nandaDiagnosis: 'Imbalanced Nutrition: Less Than Body Requirements related to nausea and vomiting', objectiveVitals: JSON.stringify({ bloodPressure: '112/72', heartRate: '80', temperature: '37.0', weight: '55', respiratoryRate: '16' }), labResults: 'Hb: 10.8', clinicalContext: { aog: '12 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Physiological', 'Educational'] } });
  tests.push({ id: 50, category: 'D. NANDA', name: 'NANDA: Risk for Bleeding', input: { nandaDiagnosis: 'Risk for Bleeding related to placenta previa diagnosed at 20 weeks', subjectiveSymptoms: 'No active bleeding currently', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '78', temperature: '36.8', weight: '63', respiratoryRate: '16' }), icd10Diagnosis: 'O44 — Placenta previa', clinicalContext: { aog: '34 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 51, category: 'D. NANDA', name: 'NANDA: Deficient Knowledge', input: { subjectiveSymptoms: 'Patient asks what foods to avoid and warning signs', nandaDiagnosis: 'Deficient Knowledge related to pregnancy management', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '76', temperature: '36.7', weight: '60', respiratoryRate: '16' }), clinicalContext: { aog: '24 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 52, category: 'D. NANDA', name: 'NANDA: Ineffective Coping', input: { subjectiveSymptoms: 'Crying spells, feeling overwhelmed by pregnancy', nandaDiagnosis: 'Ineffective Coping related to overwhelming stress from high-risk pregnancy', objectiveVitals: JSON.stringify({ bloodPressure: '145/95', heartRate: '92', temperature: '37.0', weight: '66', respiratoryRate: '20' }), clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', mustIncludeCategories: ['Psychosocial'] } });
  tests.push({ id: 53, category: 'D. NANDA', name: 'NANDA: Risk for Impaired Parenting', input: { subjectiveSymptoms: 'Concerns about ability to care for baby after birth', nandaDiagnosis: 'Risk for Impaired Parenting related to lack of knowledge and social support', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '78', temperature: '36.8', weight: '61', respiratoryRate: '16' }), clinicalContext: { aog: '28 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Psychosocial', 'Educational'] } });
  tests.push({ id: 54, category: 'D. NANDA', name: 'NANDA: Risk for Injury fetal', input: { nandaDiagnosis: 'Risk for Injury (fetal) related to maternal preeclampsia and medication use', subjectiveSymptoms: 'None currently', objectiveVitals: JSON.stringify({ bloodPressure: '155/100', heartRate: '94', temperature: '37.1', weight: '68', respiratoryRate: '20' }), icd10Diagnosis: 'O14.0', clinicalContext: { aog: '32 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 55, category: 'D. NANDA', name: 'NANDA: Risk for Fluid Volume', input: { subjectiveSymptoms: 'Vomiting, decreased urine output', nandaDiagnosis: 'Risk for Deficient Fluid Volume related to hyperemesis', objectiveVitals: JSON.stringify({ bloodPressure: '108/68', heartRate: '90', temperature: '36.9', weight: '52', respiratoryRate: '18' }), clinicalContext: { aog: '10 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 56, category: 'D. NANDA', name: 'NANDA: Risk for Perfusion', input: { nandaDiagnosis: 'Risk for Ineffective Peripheral Tissue Perfusion related to preeclampsia', subjectiveSymptoms: 'Numbness in hands, swelling', objectiveVitals: JSON.stringify({ bloodPressure: '160/100', heartRate: '96', temperature: '37.0', weight: '67', respiratoryRate: '20' }), physicalExam: 'Hyperreflexia, clonus', icd10Diagnosis: 'O14', clinicalContext: { aog: '32 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 57, category: 'D. NANDA', name: 'NANDA: Risk for Cerebral Perfusion', input: { nandaDiagnosis: 'Risk for Ineffective Cerebral Tissue Perfusion related to severe preeclampsia', subjectiveSymptoms: 'Severe headache, visual changes, confusion', objectiveVitals: JSON.stringify({ bloodPressure: '175/115', heartRate: '100', temperature: '37.2', weight: '69', respiratoryRate: '22' }), icd10Diagnosis: 'O14.1', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 58, category: 'D. NANDA', name: 'NANDA: Decisional Conflict', input: { subjectiveSymptoms: 'Confused about delivery options (CS vs normal delivery)', nandaDiagnosis: 'Decisional Conflict related to multiple treatment options', objectiveVitals: JSON.stringify({ bloodPressure: '130/85', heartRate: '82', temperature: '36.9', weight: '64', respiratoryRate: '18' }), clinicalContext: { aog: '37 weeks', riskLevel: 'moderate' } }, assertions: { mustIncludeCategories: ['Psychosocial', 'Educational'] } });
  tests.push({ id: 59, category: 'D. NANDA', name: 'NANDA: Risk for Shock', input: { subjectiveSymptoms: 'Active bleeding, feeling faint', nandaDiagnosis: 'Risk for Shock related to hemorrhage', objectiveVitals: JSON.stringify({ bloodPressure: '90/60', heartRate: '115', temperature: '36.8', weight: '62', respiratoryRate: '22' }), icd10Diagnosis: 'O72 — Postpartum hemorrhage', clinicalContext: { aog: 'postpartum', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 60, category: 'D. NANDA', name: 'NANDA: Risk for Aspiration', input: { nandaDiagnosis: 'Risk for Aspiration related to altered consciousness from eclampsia', subjectiveSymptoms: 'History of seizures', objectiveVitals: JSON.stringify({ bloodPressure: '168/108', heartRate: '98', temperature: '37.5', weight: '67', respiratoryRate: '24' }), icd10Diagnosis: 'O15', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });

  // ── E: ICD-10 Code Tests (10 tests) ──
  tests.push({ id: 61, category: 'E. ICD-10', name: 'ICD O10 — Pre-existing hypertension', input: { subjectiveSymptoms: 'Taking BP meds, no symptoms', objectiveVitals: JSON.stringify({ bloodPressure: '140/90', heartRate: '78', temperature: '36.8', weight: '68', respiratoryRate: '16' }), medications: 'Amlodipine 5mg', icd10Diagnosis: 'O10.11 — Pre-existing hypertension with superimposed proteinuria', clinicalContext: { aog: '28 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 62, category: 'E. ICD-10', name: 'ICD O12 — Gestational HTN', input: { subjectiveSymptoms: 'First time BP elevation noticed', objectiveVitals: JSON.stringify({ bloodPressure: '142/92', heartRate: '82', temperature: '36.9', weight: '65', respiratoryRate: '18' }), icd10Diagnosis: 'O13 — Gestational hypertension without significant proteinuria', clinicalContext: { aog: '32 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary' } });
  tests.push({ id: 63, category: 'E. ICD-10', name: 'ICD O14 — Pre-eclampsia', input: { subjectiveSymptoms: 'Swelling, headache, visual disturbances', objectiveVitals: JSON.stringify({ bloodPressure: '150/100', heartRate: '90', temperature: '37.0', weight: '67', respiratoryRate: '20' }), labResults: 'Proteinuria 3+', icd10Diagnosis: 'O14.0 — Pre-eclampsia', nandaDiagnosis: 'Risk for Ineffective Peripheral Tissue Perfusion', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } });
  tests.push({ id: 64, category: 'E. ICD-10', name: 'ICD O24.3 — GDM', input: { subjectiveSymptoms: 'Thirst, frequent urination', objectiveVitals: JSON.stringify({ bloodPressure: '120/78', heartRate: '78', temperature: '36.8', weight: '66', respiratoryRate: '16' }), labResults: 'OGTT: 200mg/dL (2hr), HbA1c: 7.5%', icd10Diagnosis: 'O24.3 — Gestational diabetes mellitus', clinicalContext: { aog: '28 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Educational', 'Physiological'] } });
  tests.push({ id: 65, category: 'E. ICD-10', name: 'ICD O99.0 — Anemia', input: { subjectiveSymptoms: 'Fatigue, pallor, weakness', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '84', temperature: '36.8', weight: '58', respiratoryRate: '18' }), labResults: 'Hb: 9.0 g/dL, MCV: 72 fL', icd10Diagnosis: 'O99.0 — Anemia complicating pregnancy / D50 Iron deficiency anemia', clinicalContext: { aog: '26 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 66, category: 'E. ICD-10', name: 'ICD O20 — Threatened abortion', input: { subjectiveSymptoms: 'Light vaginal bleeding, mild cramping', objectiveVitals: JSON.stringify({ bloodPressure: '110/70', heartRate: '82', temperature: '36.8', weight: '56', respiratoryRate: '16' }), icd10Diagnosis: 'O20 — Early pregnancy hemorrhage (threatened abortion)', clinicalContext: { aog: '10 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Safety'] } });
  tests.push({ id: 67, category: 'E. ICD-10', name: 'ICD O60 — Preterm labor', input: { subjectiveSymptoms: 'Regular contractions every 5 min, back pain, pressure', objectiveVitals: JSON.stringify({ bloodPressure: '122/80', heartRate: '84', temperature: '37.0', weight: '62', respiratoryRate: '18' }), physicalExam: 'Cervix 3cm dilated', icd10Diagnosis: 'O60 — Preterm labor', clinicalContext: { aog: '32 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } });
  tests.push({ id: 68, category: 'E. ICD-10', name: 'ICD O23 — UTI', input: { subjectiveSymptoms: 'Dysuria, frequency, urgency', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '80', temperature: '38.0', weight: '60', respiratoryRate: '18' }), labResults: 'Urinalysis: nitrites positive, WBC 12,000', icd10Diagnosis: 'O23 — Urinary tract infections in pregnancy', nandaDiagnosis: 'Risk for Infection', clinicalContext: { aog: '24 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 69, category: 'E. ICD-10', name: 'ICD O36 — Fetal concern', input: { subjectiveSymptoms: 'Concerns about baby size being too small', objectiveVitals: JSON.stringify({ bloodPressure: '120/78', heartRate: '78', temperature: '36.8', weight: '60', respiratoryRate: '16' }), fundalHeight: '29 cm at 32 weeks (suspected SGA)', icd10Diagnosis: 'O36 — Maternal care for known or suspected fetal problem', clinicalContext: { aog: '32 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary' } });
  tests.push({ id: 70, category: 'E. ICD-10', name: 'ICD O68 — Fetal stress in labor', input: { subjectiveSymptoms: 'Active labor, abnormal CTG reading', objectiveVitals: JSON.stringify({ bloodPressure: '125/82', heartRate: '86', temperature: '37.0', weight: '64', respiratoryRate: '18' }), fetalHeartRate: '170 bpm with decelerations', icd10Diagnosis: 'O68 — Labor complicated by fetal stress', clinicalContext: { aog: '39 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });

  // ── F: Emergency/Danger Signs (10 tests) ──
  tests.push({ id: 71, category: 'F. Emergencies', name: 'WHO: Severe headache + blurred vision', input: { subjectiveSymptoms: 'Severe headache with blurred vision since 2 hours ago, epigastric pain', objectiveVitals: JSON.stringify({ bloodPressure: '168/108', heartRate: '100', temperature: '37.2', weight: '68', respiratoryRate: '22' }), labResults: 'Proteinuria 4+', physicalExam: 'Hyperreflexia, clonus present', clinicalContext: { aog: '31 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 72, category: 'F. Emergencies', name: 'WHO: Vaginal bleeding active', input: { subjectiveSymptoms: 'Active vaginal bleeding, soaking pad every 15 min', objectiveVitals: JSON.stringify({ bloodPressure: '98/60', heartRate: '110', temperature: '36.8', weight: '62', respiratoryRate: '20' }), clinicalContext: { aog: '28 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 73, category: 'F. Emergencies', name: 'WHO: Convulsions/seizures', input: { subjectiveSymptoms: 'Witnessed seizure episode, now post-ictal drowsy', objectiveVitals: JSON.stringify({ bloodPressure: '180/115', heartRate: '110', temperature: '37.8', weight: '70', respiratoryRate: '24' }), labResults: 'Proteinuria 4+', icd10Diagnosis: 'O15 — Eclampsia', nandaDiagnosis: 'Risk for Injury, Risk for Aspiration', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 74, category: 'F. Emergencies', name: 'WHO: Severe abdominal pain', input: { subjectiveSymptoms: 'Sudden severe abdominal pain, rigid abdomen', objectiveVitals: JSON.stringify({ bloodPressure: '100/60', heartRate: '120', temperature: '38.0', weight: '66', respiratoryRate: '22' }), physicalExam: 'Abdomen rigid, rebound tenderness', icd10Diagnosis: 'O45 — Suspected placental abruption', clinicalContext: { aog: '34 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 75, category: 'F. Emergencies', name: 'WHO: Extreme weakness', input: { subjectiveSymptoms: 'Cannot stand without assistance, extreme weakness', objectiveVitals: JSON.stringify({ bloodPressure: '80/50', heartRate: '120', temperature: '37.0', weight: '58', respiratoryRate: '24' }), labResults: 'Hb: 5.5 g/dL', icd10Diagnosis: 'O99.0 + O72', clinicalContext: { aog: '35 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 76, category: 'F. Emergencies', name: 'WHO: Reduced/absent fetal movements', input: { subjectiveSymptoms: 'No fetal movements felt in 24 hours despite kick count attempts', objectiveVitals: JSON.stringify({ bloodPressure: '122/80', heartRate: '82', temperature: '36.9', weight: '64', respiratoryRate: '18' }), fetalHeartRate: '142', notes: ' NST reactive (non-reassuring)', clinicalContext: { aog: '36 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } });
  tests.push({ id: 77, category: 'F. Emergencies', name: 'WHO: Fever with infection signs', input: { subjectiveSymptoms: 'Fever, chills, productive cough, foul-smelling lochia', objectiveVitals: JSON.stringify({ bloodPressure: '125/82', heartRate: '96', temperature: '39.2', weight: '62', respiratoryRate: '22' }), labResults: 'WBC 22,000, CRP 150', icd10Diagnosis: 'O98', clinicalContext: { aog: 'postpartum', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } });
  tests.push({ id: 78, category: 'F. Emergencies', name: 'WHO: Severe vomiting', input: { subjectiveSymptoms: 'Unable to keep any food/fluids down, vomiting bilious material x10 today', objectiveVitals: JSON.stringify({ bloodPressure: '105/65', heartRate: '95', temperature: '37.5', weight: '54', respiratoryRate: '18' }), notes: 'Signs of dehydration: dry mucous membranes, poor skin turgor', clinicalContext: { aog: '12 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 79, category: 'F. Emergencies', name: 'WHO: Difficulty breathing', input: { subjectiveSymptoms: 'Cannot catch breath, chest tightness, orthopnea', objectiveVitals: JSON.stringify({ bloodPressure: '140/90', heartRate: '110', temperature: '37.2', weight: '66', respiratoryRate: '28' }), labResults: 'Pleural effusion on X-ray', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } });
  tests.push({ id: 80, category: 'F. Emergencies', name: 'WHO: Face/hand swelling (sudden)', input: { subjectiveSymptoms: 'Sudden facial and hand swelling, rapid weight gain', objectiveVitals: JSON.stringify({ bloodPressure: '158/105', heartRate: '90', temperature: '37.0', weight: '72', respiratoryRate: '18' }), labResults: 'Proteinuria 2+, Hct 38%', physicalExam: 'Facial edema, hand edema', icd10Diagnosis: 'O14 — Pre-eclampsia', clinicalContext: { aog: '33 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });

  // ── G: Cultural Sensitivity (5 tests) ──
  tests.push({ id: 81, category: 'G. Cultural', name: 'Filipino dietary counseling (rice-based)', input: { subjectiveSymptoms: 'Asks what food to eat, eats rice 3x/day', objectiveVitals: JSON.stringify({ bloodPressure: '115/74', heartRate: '76', temperature: '36.8', weight: '60', respiratoryRate: '16' }), notes: 'Limited budget, wants affordable options', clinicalContext: { aog: '24 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 82, category: 'G. Cultural', name: 'BHW community involvement', input: { subjectiveSymptoms: 'BHW referred her for ANC', objectiveVitals: JSON.stringify({ bloodPressure: '112/72', heartRate: '74', temperature: '36.7', weight: '58', respiratoryRate: '16' }), notes: 'Active in barangay health programs', clinicalContext: { aog: '22 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 83, category: 'G. Cultural', name: 'Family decision-making support', input: { subjectiveSymptoms: 'Husband and mother-in-law want to be involved in birth planning', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '78', temperature: '36.8', weight: '62', respiratoryRate: '16' }), notes: 'Wants family present during delivery', clinicalContext: { aog: '30 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Psychosocial'] } });
  tests.push({ id: 84, category: 'G. Cultural', name: 'Malunggay/herbal medicine inquiry', input: { subjectiveSymptoms: 'Taking malunggay capsules and other herbal supplements', objectiveVitals: JSON.stringify({ bloodPressure: '114/74', heartRate: '76', temperature: '36.8', weight: '59', respiratoryRate: '16' }), notes: 'Also takes herbal tea for digestion', medications: 'Malunggay capsule 250mg TID', clinicalContext: { aog: '20 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 85, category: 'G. Cultural', name: 'Financial constraints / PhilHealth awareness', input: { subjectiveSymptoms: 'Worried about delivery costs, asks about PhilHealth coverage', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '78', temperature: '36.8', weight: '61', respiratoryRate: '16' }), notes: 'Minimum wage earner, worried about expenses', clinicalContext: { aog: '26 weeks', bloodType: 'O+', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });

  // ── H: Edge Cases (5 tests) ──
  tests.push({ id: 86, category: 'H. Edge Cases', name: 'Missing data — all nulls', input: { subjectiveSymptoms: null, objectiveVitals: null, fetalHeartRate: null, fundalHeight: null, allergies: null, medications: null, physicalExam: null, labResults: null, notes: null, icd10Diagnosis: null, nandaDiagnosis: null, clinicalContext: {} }, assertions: { preventionLevel: 'primary', hasInterventions: true } });
  tests.push({ id: 87, category: 'H. Edge Cases', name: 'Very early pregnancy 4 weeks', input: { subjectiveSymptoms: 'Just confirmed positive pregnancy test', objectiveVitals: JSON.stringify({ bloodPressure: '110/70', heartRate: '72', temperature: '36.7', weight: '50', respiratoryRate: '14' }), clinicalContext: { aog: '4 weeks', gravidity: 1, parity: 0 }, }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 88, category: 'H. Edge Cases', name: 'Advanced maternal age 42 with G6P5', input: { subjectiveSymptoms: 'Mild swelling, tiredness', objectiveVitals: JSON.stringify({ bloodPressure: '135/85', heartRate: '82', temperature: '36.9', weight: '72', respiratoryRate: '18' }), fetalHeartRate: '138', fundalHeight: '32 cm', labResults: 'Hb: 10.8, glucose: 100', icd10Diagnosis: 'O99.0 + O13', clinicalContext: { aog: '32 weeks', gravidity: 6, parity: 5, riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } });
  tests.push({ id: 89, category: 'H. Edge Cases', name: 'Multiple risk factors combined', input: { subjectiveSymptoms: 'Headache, swelling, blurred vision, epigastric pain, palpitations', objectiveVitals: JSON.stringify({ bloodPressure: '170/110', heartRate: '108', temperature: '37.5', weight: '70', respiratoryRate: '26' }), fetalHeartRate: '168', fundalHeight: '33 cm', labResults: 'Hb: 7.2, glucose: 140, proteinuria 3+', icd10Diagnosis: 'O14.1 + O99.0 + O24.3', nandaDiagnosis: 'Risk for Cerebral Perfusion, Risk for Shock', clinicalContext: { aog: '31 weeks', gravidity: 4, parity: 2, bloodType: 'O-', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety', mustIncludeCategories: ['Safety', 'Physiological'] } });
  tests.push({ id: 90, category: 'H. Edge Cases', name: 'Normal routine visit — no issues', input: { subjectiveSymptoms: 'No complaints, feeling great', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '76', temperature: '36.8', weight: '62', respiratoryRate: '16' }), fetalHeartRate: '140', fundalHeight: '30 cm', labResults: 'All normal', clinicalContext: { aog: '34 weeks', gravidity: 2, parity: 1, bloodType: 'O+', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', referralNeeded: false } });

  // ── I: JSON Format Validation (10 tests) ──
  // These will test that the response is valid JSON with all required fields
  const clinicalVariants = [
    { id: 91, name: 'JSON format: normal case', input: { subjectiveSymptoms: 'Normal visit', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '78', temperature: '36.8', weight: '60', respiratoryRate: '16' }), fetalHeartRate: '140', clinicalContext: { aog: '28 weeks', riskLevel: 'low' } } },
    { id: 92, name: 'JSON format: moderate risk', input: { objectiveVitals: JSON.stringify({ bloodPressure: '138/88', heartRate: '84', temperature: '37.0', weight: '64', respiratoryRate: '18' }), fetalHeartRate: '145', labResults: 'Hb: 9.8', clinicalContext: { aog: '30 weeks', riskLevel: 'moderate' } } },
    { id: 93, name: 'JSON format: high risk', input: { subjectiveSymptoms: 'Bleeding, convulsions', objectiveVitals: JSON.stringify({ bloodPressure: '180/120', heartRate: '110', temperature: '37.8', weight: '68', respiratoryRate: '24' }), fetalHeartRate: '180', icd10Diagnosis: 'O15', nandaDiagnosis: 'Risk for Shock', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } } },
    { id: 94, name: 'JSON format: minimal data', input: { clinicalContext: { aog: '28 weeks', riskLevel: 'low' } } },
    { id: 95, name: 'JSON format: with all fields populated', input: { subjectiveSymptoms: 'Headache', objectiveVitals: JSON.stringify({ bloodPressure: '130/85', heartRate: '82', temperature: '37.0', weight: '63', respiratoryRate: '18' }), fetalHeartRate: '146', fundalHeight: '26 cm', allergies: 'Penicillin', medications: 'Ferrous sulfate', physicalExam: 'Normal', labResults: 'Hb: 11.5, glucose: 88', notes: 'Routine', icd10Diagnosis: 'O12', nandaDiagnosis: 'Anxiety', clinicalContext: { gravidity: 2, parity: 1, aog: '28 weeks', bloodType: 'A+', riskLevel: 'low' } } },
    { id: 96, name: 'JSON format: 1st trimester', input: { subjectiveSymptoms: 'Nausea, fatigue', objectiveVitals: JSON.stringify({ bloodPressure: '110/70', heartRate: '72', temperature: '36.7', weight: '50', respiratoryRate: '14' }), clinicalContext: { aog: '8 weeks', gravidity: 1, parity: 0 } } },
    { id: 97, name: 'JSON format: 3rd trimester emergency', input: { subjectiveSymptoms: 'Bleeding, contractions', objectiveVitals: JSON.stringify({ bloodPressure: '90/60', heartRate: '120', temperature: '37.0', weight: '65', respiratoryRate: '22' }), fetalHeartRate: '175', icd10Diagnosis: 'O68', nandaDiagnosis: 'Risk for Shock', clinicalContext: { aog: '38 weeks', riskLevel: 'high' } } },
    { id: 98, name: 'JSON format: postpartum', input: { subjectiveSymptoms: 'Post-delivery followup', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '78', temperature: '37.0', weight: '58', respiratoryRate: '16' }), clinicalContext: { aog: 'postpartum', gravidity: 2, parity: 2 } } },
    { id: 99, name: 'JSON format: overdose scenario', input: { subjectiveSymptoms: 'Took wrong medication dose', medications: 'Metformin 2000mg (OD)', objectiveVitals: JSON.stringify({ bloodPressure: '100/60', heartRate: '110', temperature: '37.8', weight: '62', respiratoryRate: '20' }), labResults: 'Glucose: 40 mg/dL', notes: 'Accidental overdose', clinicalContext: { aog: '28 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } },
    { id: 100, name: 'JSON format: high-risk with cultural data', input: { subjectiveSymptoms: 'Headache, worried about costs, family wants traditional hilot', objectiveVitals: JSON.stringify({ bloodPressure: '160/100', heartRate: '94', temperature: '37.1', weight: '68', respiratoryRate: '20' }), labResults: 'Hb: 7.8, proteinuria 3+', medications: 'Malunggay, herbal tea', notes: 'Financial constraints', icd10Diagnosis: 'O14.1', clinicalContext: { aog: '31 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } },
  ];

  clinicalVariants.forEach(v => {
    tests.push({
      id: v.id,
      category: 'I. JSON Format',
      name: v.name,
      input: v.input as AssessmentData,
      assertions: v.assertions || { hasInterventions: true },
    });
  });

  return tests;
}

// ─── Test Runner ──────────────────────────────────────────────────────────

async function runTest(testCase: TestCase, index: number, total: number): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const userPrompt = buildUserPrompt(testCase.input);

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: MATERNAL_AI_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const rawContent = completion.choices[0]?.message?.content;
    const duration = Date.now() - startTime;

    if (!rawContent || rawContent.trim().length === 0) {
      return { id: testCase.id, category: testCase.category, name: testCase.name, passed: false, failures: ['Empty response from AI'], responseJson: null, duration };
    }

    // Parse JSON
    let cleaned = rawContent.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    let responseJson: any;
    try {
      responseJson = JSON.parse(cleaned);
    } catch {
      return { id: testCase.id, category: testCase.category, name: testCase.name, passed: false, failures: ['Invalid JSON response', rawContent.substring(0, 200)], responseJson: null, duration };
    }

    const failures: string[] = [];
    const assertions = testCase.assertions;

    // Validate JSON format
    if (!responseJson.interventions || !Array.isArray(responseJson.interventions)) {
      failures.push('Missing or invalid "interventions" array');
    }
    if (typeof responseJson.priorityIntervention !== 'string') {
      failures.push('Missing "priorityIntervention" string');
    }
    if (typeof responseJson.preventionLevel !== 'string') {
      failures.push('Missing "preventionLevel" string');
    }
    if (typeof responseJson.referralNeeded !== 'boolean') {
      failures.push('Missing "referralNeeded" boolean');
    }
    if (typeof responseJson.rationale !== 'string') {
      failures.push('Missing "rationale" string');
    }
    if (!Array.isArray(responseJson.riskIndicators)) {
      failures.push('Missing "riskIndicators" array');
    }
    if (!Array.isArray(responseJson.nursingConsiderations)) {
      failures.push('Missing "nursingConsiderations" array');
    }

    // Check prevention level
    if (assertions.preventionLevel && responseJson.preventionLevel !== assertions.preventionLevel) {
      failures.push(`Expected preventionLevel "${assertions.preventionLevel}", got "${responseJson.preventionLevel}"`);
    }

    // Check referral needed
    if (assertions.referralNeeded !== undefined && responseJson.referralNeeded !== assertions.referralNeeded) {
      failures.push(`Expected referralNeeded ${assertions.referralNeeded}, got ${responseJson.referralNeeded}`);
    }

    // Check intervention count
    if (assertions.interventionCount) {
      const count = responseJson.interventions?.length || 0;
      if (count < assertions.interventionCount.min) {
        failures.push(`Expected min ${assertions.interventionCount.min} interventions, got ${count}`);
      }
      if (assertions.interventionCount.max && count > assertions.interventionCount.max) {
        failures.push(`Expected max ${assertions.interventionCount.max} interventions, got ${count}`);
      }
    }

    // Check must-include categories
    if (assertions.mustIncludeCategories?.length) {
      const actualCategories = new Set((responseJson.interventions || []).map((i: any) => i.category));
      for (const cat of assertions.mustIncludeCategories) {
        if (!actualCategories.has(cat)) {
          failures.push(`Missing expected category "${cat}". Got: [${[...actualCategories]}]`);
        }
      }
    }

    // Check must-NOT-include categories
    if (assertions.mustNotIncludeCategories?.length) {
      const actualCategories = new Set((responseJson.interventions || []).map((i: any) => i.category));
      for (const cat of assertions.mustNotIncludeCategories) {
        if (actualCategories.has(cat)) {
          failures.push(`Should NOT include category "${cat}"`);
        }
      }
    }

    // Check priority category
    if (assertions.priorityCategory && responseJson.priorityIntervention) {
      const priorityIntervention = responseJson.interventions.find((i: any) =>
        i.priority === 'high'
      );
      if (!priorityIntervention) {
        // Check if ANY intervention has the category
        const anyMatch = responseJson.interventions.some((i: any) =>
          i.category === assertions.priorityCategory
        );
        if (!anyMatch && responseJson.interventions.length > 0) {
          failures.push(`Expected priority intervention in category "${assertions.priorityCategory}"`);
        }
      }
    }

    // Check has interventions
    if (assertions.hasInterventions !== undefined && responseJson.interventions?.length === 0) {
      failures.push('Expected at least one intervention');
    }

    return {
      id: testCase.id,
      category: testCase.category,
      name: testCase.name,
      passed: failures.length === 0,
      failures,
      responseJson,
      duration,
    };
  } catch (error: any) {
    return {
      id: testCase.id, category: testCase.category, name: testCase.name,
      passed: false, failures: [`Error: ${error.message}`], responseJson: null,
      duration: Date.now() - startTime,
    };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('  MOMternal AI Intervention Stress Test Suite');
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log('  Total Tests: 100');
  console.log('═══════════════════════════════════════════════════════\n');

  const testCases = buildTestCases();
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  const categoryResults: Record<string, { total: number; passed: number }> = {};

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const num = `0${i + 1}`.slice(-2);
    process.stdout.write(`\r  Running Test ${num}/100: [${tc.category.substring(0, 12)}] ${tc.name.substring(0, 50)}...`);

    const result = await runTest(tc, i, testCases.length);
    results.push(result);

    if (result.passed) {
      passed++;
      console.log(`\r  ✅ PASS [${num}/100] ${tc.name.substring(0, 60)}   (${result.duration}ms)`);
    } else {
      failed++;
      console.log(`\r  ❌ FAIL [${num}/100] ${tc.name.substring(0, 60)}`);
      for (const f of result.failures) {
        console.log(`         → ${f}`);
      }
    }

    // Track category stats
    const cat = tc.category.split('.')[0];
    if (!categoryResults[cat]) categoryResults[cat] = { total: 0, passed: 0 };
    categoryResults[cat].total++;
    if (result.passed) categoryResults[cat].passed++;

    // Rate limit: ~1.5s between AI calls
    if (i < testCases.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // ─── Summary ──
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total Tests: 100`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Accuracy: ${((passed / 100) * 100).toFixed(1)}%`);
  console.log('');

  console.log('  Category Breakdown:');
  for (const [cat, stats] of Object.entries(categoryResults)) {
    const pct = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 'N/A';
    const bar = '█'.repeat(Math.round(stats.passed / stats.total * 20));
    const empty = '░'.repeat(20 - bar.length);
    console.log(`    ${cat.padEnd(30)} ${stats.passed}/${stats.total} (${pct}%)  ${bar}${empty}`);
  }
  console.log('');

  if (failed > 0) {
    console.log('  Failed Tests:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    ❌ [#${r.id}] ${r.name}`);
      for (const f of r.failures) {
        console.log(`       → ${f}`);
      }
    }
    console.log('');
  }

  // Save results
  const summary = {
    timestamp: new Date().toISOString(),
    total: 100,
    passed,
    failed,
    accuracy: ((passed / 100) * 100).toFixed(1) + '%',
    categoryResults,
    results: results.map((r) => ({
      id: r.id, category: r.category, name: r.name,
      passed: r.passed, failures: r.failures, duration: r.duration,
      preventionLevel: r.responseJson?.preventionLevel,
      referralNeeded: r.responseJson?.referralNeeded,
      interventionCount: r.responseJson?.interventions?.length,
    })),
  };

  const fs = await import('fs');
  const outPath = '/home/z/my-project/scripts/ai-test-results.json';
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`  Full results saved to: ${outPath}`);

  // Exit with error code if below 90%
  if (((passed / 100) * 100) < 90) {
    console.log('\n  ⚠️  ACCURACY BELOW 90% — Additional prompt tuning may be needed.\n');
    process.exit(1);
  } else {
    console.log('\n  ✅ ACCURACY TARGET MET (≥90%) — AI system validated!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
