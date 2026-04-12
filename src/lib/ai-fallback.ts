/**
 * MOMternal AI - Fallback Nursing Intervention Generator (v2)
 *
 * When the AI service is unavailable (missing X-Token), this module generates
 * context-aware nursing interventions based on clinical assessment data using
 * evidence-based rules derived from DOH/WHO maternal health guidelines.
 *
 * This ensures the AI-Assisted Interventions feature remains functional
 * even when the cloud AI service is temporarily unavailable.
 *
 * v2 CHANGES:
 * - Trimester-specific vital sign baselines (T1/T2/T3/Non-pregnant)
 * - SpO₂ analysis (parsed from objectiveVitals JSON or regex)
 * - BMI-based risk stratification
 * - Demographic risk factors (age, parity)
 * - Weighted scoring system for risk classification
 * - Referral urgency and referral type in response
 * - Health history risk analysis (smoking, alcohol, drug use)
 */

import type { AssessmentData, AIResponse, AIIntervention } from "./ai-prompts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClinicalFinding {
  severity: "normal" | "elevated" | "concerning" | "critical";
  category: string;
  description: string;
}

interface RiskClassification {
  preventionLevel: "primary" | "secondary" | "tertiary";
  referralUrgency: "none" | "non_urgent" | "same_day" | "urgent" | "emergency";
  referralType: "Refer to Doctor" | "Refer to Specialist" | "Transfer to Hospital";
}

interface TrimesterVitalRange {
  label: string;
  sbp: [number, number];      // [min, max] mmHg
  dbp: [number, number];      // [min, max] mmHg
  hr: [number, number];       // [min, max] bpm
  rr: [number, number];       // [min, max] breaths/min
  spo2: [number, number];     // [min, max] %
  temp: [number, number];     // [min, max] °C
}

// ─── Trimester-Specific Vital Sign Baselines ────────────────────────────────
// Derived from official classification document AOG-based reference ranges.

const TRIMESTER_RANGES: Record<string, TrimesterVitalRange> = {
  T1: {
    label: "First Trimester (1-13w)",
    sbp: [94.8, 137.6],
    dbp: [55.5, 86.9],
    hr: [63.1, 105.2],
    rr: [8, 24],
    spo2: [94.3, 99.4],
    temp: [35.55, 37.51],
  },
  T2: {
    label: "Second Trimester (14-27w)",
    sbp: [95.6, 136.4],
    dbp: [56.8, 87.1],
    hr: [67.4, 112.5],
    rr: [8, 24],
    spo2: [92.9, 99.3],
    temp: [35.35, 37.37],
  },
  T3: {
    label: "Third Trimester (28+w)",
    sbp: [101.6, 143.5],
    dbp: [62.4, 94.7],
    hr: [64.5, 113.8],
    rr: [8, 24],
    spo2: [93.4, 98.5],
    temp: [35.37, 37.35],
  },
  unknown: {
    label: "Non-pregnant / Unknown AOG fallback",
    sbp: [90, 120],
    dbp: [60, 80],
    hr: [60, 100],
    rr: [12, 20],
    spo2: [95, 100],
    temp: [36.5, 37.3],
  },
};

// ─── Trimester Helper ───────────────────────────────────────────────────────

/**
 * Parses the Age of Gestation (AOG) string to determine the current trimester.
 * Accepts formats like "24w 3d", "24w", "24 weeks 3 days", "24", etc.
 */
function getTrimester(aog?: string | null): "T1" | "T2" | "T3" | "unknown" {
  if (!aog) return "unknown";
  // Extract the week number from various AOG string formats
  const weekMatch = aog.match(/(\d+)\s*(?:w|weeks?|wks?)\b/i);
  const numericMatch = aog.match(/^(\d+)/);
  const weeks = weekMatch ? parseInt(weekMatch[1]) : (numericMatch ? parseInt(numericMatch[1]) : null);
  if (weeks === null || isNaN(weeks)) return "unknown";
  if (weeks <= 13) return "T1";
  if (weeks <= 27) return "T2";
  return "T3";
}

// ─── Parsing Helpers ────────────────────────────────────────────────────────

/**
 * Parses blood pressure from a vitals string or JSON.
 * Looks for patterns like "120/80" or "BP 130/85".
 */
function parseBloodPressure(vitals: string | null | undefined): { systolic: number; diastolic: number } | null {
  if (!vitals) return null;
  // Try JSON parsing first (objectiveVitals stored as JSON)
  try {
    const parsed = JSON.parse(vitals);
    if (parsed && typeof parsed === "object") {
      const bpStr = parsed.bloodPressure || parsed.blood_pressure || parsed.bp || "";
      if (typeof bpStr === "string" && bpStr) {
        const match = bpStr.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
        if (match) return { systolic: parseInt(match[1]), diastolic: parseInt(match[2]) };
      }
      // If numeric fields exist
      if (parsed.systolic && parsed.diastolic) {
        return { systolic: Number(parsed.systolic), diastolic: Number(parsed.diastolic) };
      }
    }
  } catch {
    // Not JSON — fall through to regex parsing
  }
  const match = vitals.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) return null;
  return { systolic: parseInt(match[1]), diastolic: parseInt(match[2]) };
}

/**
 * Parses fetal heart rate from a string, number, or null value.
 */
function parseFHR(fhr: string | number | null | undefined): number | null {
  if (!fhr) return null;
  const val = typeof fhr === "number" ? fhr : parseInt(String(fhr));
  return isNaN(val) ? null : val;
}

/**
 * Parses maternal heart rate from vitals text or JSON.
 * JSON keys: heartRate, heart_rate, pulse. Regex: HR/heart rate/pulse followed by number.
 */
function parseHeartRate(vitals: string | null | undefined): number | null {
  if (!vitals) return null;
  try {
    const parsed = JSON.parse(vitals);
    if (parsed && typeof parsed === "object") {
      const hr = parsed.heartRate || parsed.heart_rate || parsed.pulse;
      if (hr != null && !isNaN(Number(hr))) return Number(hr);
    }
  } catch {
    // Not JSON — fall through to regex
  }
  const match = vitals.match(/(?:HR|heart\s*rate|pulse)[^.]*?(\d{2,3})/i);
  if (!match) return null;
  return parseInt(match[1]);
}

/**
 * Parses temperature from vitals text or JSON.
 * JSON keys: temperature, temp. Regex: temp/temperature followed by number.
 */
function parseTemperature(vitals: string | null | undefined): number | null {
  if (!vitals) return null;
  try {
    const parsed = JSON.parse(vitals);
    if (parsed && typeof parsed === "object") {
      const temp = parsed.temperature || parsed.temp;
      if (temp != null && !isNaN(Number(temp))) return Number(temp);
    }
  } catch {
    // Not JSON — fall through to regex
  }
  const match = vitals.match(/(?:temp|temperature)[^.]*?(\d{2,3}(?:\.\d+)?)/i);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Parses respiratory rate from vitals text or JSON.
 * JSON keys: respiratoryRate, respiratory_rate, rr. Regex: RR/respiratory followed by number.
 */
function parseRespiratoryRate(vitals: string | null | undefined): number | null {
  if (!vitals) return null;
  try {
    const parsed = JSON.parse(vitals);
    if (parsed && typeof parsed === "object") {
      const rr = parsed.respiratoryRate || parsed.respiratory_rate || parsed.rr;
      if (rr != null && !isNaN(Number(rr))) return Number(rr);
    }
  } catch {
    // Not JSON — fall through to regex
  }
  const match = vitals.match(/(?:RR|respiratory)[^.]*?(\d{2,3})/i);
  if (!match) return null;
  return parseInt(match[1]);
}

/**
 * Parses SpO₂ (oxygen saturation) from vitals text or JSON.
 * JSON keys: oxygenSat, oxygen_sat, spo2, spO2. Regex: SpO2/oxygen sat/oxygenation followed by number.
 * The assessment form already collects oxygenSat in the vitals JSON.
 */
function parseSpO2(vitals: string | null | undefined): number | null {
  if (!vitals) return null;
  try {
    const parsed = JSON.parse(vitals);
    if (parsed && typeof parsed === "object") {
      const spo2 = parsed.oxygenSat ?? parsed.oxygen_sat ?? parsed.spo2 ?? parsed.spO2;
      if (spo2 != null && !isNaN(Number(spo2))) {
        const val = Number(spo2);
        // SpO₂ should be 0-100; if given as decimal like 0.97, scale it
        if (val > 0 && val <= 1) return Math.round(val * 100);
        return val;
      }
    }
  } catch {
    // Not JSON — fall through to regex
  }
  // Regex patterns for SpO₂ in free-text vitals
  const patterns = [
    /(?:spo2|spO2|SpO2|oxygen\s*(?:sat|saturation))[^.]*?(\d{2,3})/i,
    /(?:oxygenation)[^.]*?(\d{2,3})/i,
  ];
  for (const pattern of patterns) {
    const match = vitals.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return null;
}

/**
 * Parses BMI from vitals JSON or clinicalContext.
 * Strategy: try objectiveVitals JSON (bmi key) → try clinicalContext (bmi) → compute from weight/height.
 */
function parseBMI(vitals: string | null | undefined, ctx?: any): number | null {
  if (!vitals && !ctx) return null;

  // 1. Try vitals JSON directly
  if (vitals) {
    try {
      const parsed = JSON.parse(vitals);
      if (parsed && typeof parsed === "object") {
        const bmi = parsed.bmi ?? parsed.BMI;
        if (bmi != null && !isNaN(Number(bmi))) return Number(bmi);
      }
    } catch {
      // Not JSON
    }
  }

  // 2. Try clinicalContext
  if (ctx) {
    if (ctx.bmi != null && !isNaN(Number(ctx.bmi))) return Number(ctx.bmi);
  }

  // 3. Compute from weight/height in vitals JSON
  if (vitals) {
    try {
      const parsed = JSON.parse(vitals);
      if (parsed && typeof parsed === "object") {
        const weight = Number(parsed.weight);
        const heightCm = Number(parsed.height);
        if (weight > 0 && heightCm > 0) {
          const heightM = heightCm / 100;
          const bmi = weight / (heightM * heightM);
          return Math.round(bmi * 10) / 10;
        }
      }
    } catch {
      // Not JSON
    }
  }

  return null;
}

/**
 * Parses hemoglobin from lab results string.
 */
function parseHemoglobin(labResults: string | null | undefined): number | null {
  if (!labResults) return null;
  const match = labResults.match(/(?:Hb|hemoglobin)[^.]*?(\d{1,2}(?:\.\d+)?)/i);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Parses blood glucose from lab results string.
 */
function parseBloodGlucose(labResults: string | null | undefined): number | null {
  if (!labResults) return null;
  const match = labResults.match(/(?:blood\s*sugar|glucose|BS)[^.]*?(\d{2,3}(?:\.\d+)?)/i);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Safely extracts a string field from clinicalContext or any object.
 */
function getCtxString(ctx: any, ...keys: string[]): string | null {
  if (!ctx || typeof ctx !== "object") return null;
  for (const key of keys) {
    const val = ctx[key];
    if (typeof val === "string" && val.trim()) return val.trim().toLowerCase();
  }
  return null;
}

/**
 * Safely extracts a number field from clinicalContext or any object.
 */
function getCtxNumber(ctx: any, ...keys: string[]): number | null {
  if (!ctx || typeof ctx !== "object") return null;
  for (const key of keys) {
    const val = ctx[key];
    if (val != null && !isNaN(Number(val))) return Number(val);
  }
  return null;
}

// ─── Vital Sign Analysis (Trimester-Adjusted) ───────────────────────────────

/**
 * Analyzes a single vital sign value against trimester-specific baselines.
 * Returns severity based on how far the value deviates from the expected range.
 *
 * Thresholds per the classification document:
 * - LR (normal): Within trimester range
 * - MR (borderline/elevated): Approaching clinical thresholds
 * - HR (critical): Beyond critical clinical thresholds
 */
function analyzeVitalSign(
  value: number,
  range: [number, number],
  thresholds: {
    elevatedLow?: number;     // Below this → elevated (e.g., HR <50 borderline)
    criticalLow?: number;     // Below this → critical (e.g., HR <50 critical)
    elevatedHigh?: number;    // Above this → elevated
    criticalHigh?: number;    // Above this → critical
  }
): "normal" | "elevated" | "concerning" | "critical" {
  const [min, max] = range;

  // Check critical low first
  if (thresholds.criticalLow !== undefined && value < thresholds.criticalLow) {
    return "critical";
  }
  // Check elevated low
  if (thresholds.elevatedLow !== undefined && value < thresholds.elevatedLow) {
    return "elevated";
  }

  // Check critical high first
  if (thresholds.criticalHigh !== undefined && value >= thresholds.criticalHigh) {
    return "critical";
  }
  // Check elevated high (between max range and critical)
  if (thresholds.elevatedHigh !== undefined && value >= thresholds.elevatedHigh) {
    return "concerning";
  }

  // Check if within normal trimester range
  if (value >= min && value <= max) {
    return "normal";
  }

  // Mildly outside range but not meeting concerning thresholds
  if (value < min || value > max) {
    // Only slightly outside — elevated rather than concerning
    const deviation = value < min ? min - value : value - max;
    if (deviation <= (max - min) * 0.1) {
      return "elevated";
    }
    return "elevated";
  }

  return "normal";
}

// ─── Main Findings Analysis ─────────────────────────────────────────────────

/**
 * Performs comprehensive clinical analysis on assessment data.
 * Includes trimester-adjusted vital signs, SpO₂, BMI, demographics,
 * subjective symptoms, ICD-10 codes, and health history risk factors.
 */
function analyzeFindings(data: AssessmentData): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];
  const ctx = data.clinicalContext || {};
  const trimester = getTrimester(ctx.aog);
  const ranges = TRIMESTER_RANGES[trimester];

  // ── 1. Blood Pressure Analysis (trimester-adjusted) ─────────────────────
  const bp = parseBloodPressure(data.objectiveVitals);
  if (bp) {
    // Per classification doc: BP ≥140/90 → HTN/PE (critical)
    if (bp.systolic >= 170 || bp.diastolic >= 110) {
      findings.push({
        severity: "critical",
        category: "blood_pressure",
        description: `Severe range BP ${bp.systolic}/${bp.diastolic} mmHg — possible eclampsia. Reference range for ${ranges.label}: SBP ${ranges.sbp[0]}-${ranges.sbp[1]}, DBP ${ranges.dbp[0]}-${ranges.dbp[1]}`,
      });
    } else if (bp.systolic >= 140 || bp.diastolic >= 90) {
      findings.push({
        severity: "critical",
        category: "blood_pressure",
        description: `Hypertension (≥140/90): ${bp.systolic}/${bp.diastolic} mmHg — hypertensive disorder of pregnancy/possible preeclampsia. Reference range for ${ranges.label}: SBP ${ranges.sbp[0]}-${ranges.sbp[1]}, DBP ${ranges.dbp[0]}-${ranges.dbp[1]}`,
      });
    } else if (bp.systolic >= 160 || bp.diastolic >= 100) {
      findings.push({
        severity: "concerning",
        category: "blood_pressure",
        description: `Hypertension Stage 2: ${bp.systolic}/${bp.diastolic} mmHg. Reference range for ${ranges.label}: SBP ${ranges.sbp[0]}-${ranges.sbp[1]}, DBP ${ranges.dbp[0]}-${ranges.dbp[1]}`,
      });
    } else if (bp.systolic > ranges.sbp[1] || bp.diastolic > ranges.dbp[1]) {
      // BP approaching ≥140/90 — check how close
      const sbpApproaching = bp.systolic >= 130 && bp.systolic < 140;
      const dbpApproaching = bp.diastolic >= 85 && bp.diastolic < 90;
      if (sbpApproaching || dbpApproaching) {
        findings.push({
          severity: "concerning",
          category: "blood_pressure",
          description: `Borderline elevated BP: ${bp.systolic}/${bp.diastolic} mmHg — approaching hypertensive threshold (140/90). Reference for ${ranges.label}: SBP ${ranges.sbp[0]}-${ranges.sbp[1]}, DBP ${ranges.dbp[0]}-${ranges.dbp[1]}`,
        });
      } else {
        findings.push({
          severity: "elevated",
          category: "blood_pressure",
          description: `Elevated BP: ${bp.systolic}/${bp.diastolic} mmHg. Reference for ${ranges.label}: SBP ${ranges.sbp[0]}-${ranges.sbp[1]}, DBP ${ranges.dbp[0]}-${ranges.dbp[1]}`,
        });
      }
    } else if (bp.systolic < ranges.sbp[0] || bp.diastolic < ranges.dbp[0]) {
      findings.push({
        severity: "elevated",
        category: "blood_pressure",
        description: `Low BP: ${bp.systolic}/${bp.diastolic} mmHg — below reference for ${ranges.label} (SBP ${ranges.sbp[0]}-${ranges.sbp[1]}, DBP ${ranges.dbp[0]}-${ranges.dbp[1]})`,
      });
    } else {
      findings.push({
        severity: "normal",
        category: "blood_pressure",
        description: `Normal BP: ${bp.systolic}/${bp.diastolic} mmHg (within ${ranges.label} range)`,
      });
    }
  }

  // ── 2. Fetal Heart Rate ─────────────────────────────────────────────────
  const fhr = parseFHR(data.fetalHeartRate);
  if (fhr !== null) {
    if (fhr < 100 || fhr > 170) {
      findings.push({ severity: "critical", category: "fhr", description: `Severe fetal distress: FHR ${fhr} bpm (critical: <100 or >170)` });
    } else if (fhr < 110) {
      findings.push({ severity: "concerning", category: "fhr", description: `Fetal bradycardia: FHR ${fhr} bpm (normal: 110-160)` });
    } else if (fhr > 160) {
      findings.push({ severity: "concerning", category: "fhr", description: `Fetal tachycardia: FHR ${fhr} bpm (normal: 110-160)` });
    } else {
      findings.push({ severity: "normal", category: "fhr", description: `Normal FHR: ${fhr} bpm` });
    }
  }

  // ── 3. Maternal Heart Rate (trimester-adjusted) ────────────────────────
  // Per doc: HR >120 or <50 = critical (HR); >105-115 T1 / >110-115 T2,T3 = MR (elevated/concerning)
  const hr = parseHeartRate(data.objectiveVitals);
  if (hr !== null) {
    const hrCriticalHigh = 120;
    const hrCriticalLow = 50;
    // Trimester-specific elevated threshold
    let hrElevatedHigh: number;
    if (trimester === "T1") {
      hrElevatedHigh = 105; // >105-115 T1
    } else {
      hrElevatedHigh = 110; // >110-115 T2/T3
    }

    if (hr >= hrCriticalHigh) {
      findings.push({
        severity: "critical",
        category: "heart_rate",
        description: `Severe maternal tachycardia: ${hr} bpm (≥${hrCriticalHigh} critical). Reference for ${ranges.label}: HR ${ranges.hr[0]}-${ranges.hr[1]} bpm`,
      });
    } else if (hr <= hrCriticalLow) {
      findings.push({
        severity: "critical",
        category: "heart_rate",
        description: `Severe maternal bradycardia: ${hr} bpm (≤${hrCriticalLow} critical). Reference for ${ranges.label}: HR ${ranges.hr[0]}-${ranges.hr[1]} bpm`,
      });
    } else if (hr > hrElevatedHigh) {
      findings.push({
        severity: "concerning",
        category: "heart_rate",
        description: `Elevated maternal HR: ${hr} bpm (>${hrElevatedHigh} concerning for ${ranges.label}). Reference: HR ${ranges.hr[0]}-${ranges.hr[1]} bpm`,
      });
    } else if (hr > ranges.hr[1]) {
      findings.push({
        severity: "elevated",
        category: "heart_rate",
        description: `Mildly elevated maternal HR: ${hr} bpm. Reference for ${ranges.label}: HR ${ranges.hr[0]}-${ranges.hr[1]} bpm`,
      });
    } else if (hr < ranges.hr[0]) {
      findings.push({
        severity: "elevated",
        category: "heart_rate",
        description: `Mildly low maternal HR: ${hr} bpm. Reference for ${ranges.label}: HR ${ranges.hr[0]}-${ranges.hr[1]} bpm`,
      });
    } else {
      findings.push({
        severity: "normal",
        category: "heart_rate",
        description: `Normal maternal HR: ${hr} bpm (within ${ranges.label} range)`,
      });
    }
  }

  // ── 4. Temperature (trimester-adjusted) ────────────────────────────────
  // Per doc: Temp ≥38 or <36 = critical; 37.6-38 = MR (elevated/concerning)
  const temp = parseTemperature(data.objectiveVitals);
  if (temp !== null) {
    if (temp >= 38.0) {
      findings.push({
        severity: "critical",
        category: "temperature",
        description: `Fever: ${temp}°C (≥38°C critical — may affect fetus). Reference for ${ranges.label}: ${ranges.temp[0]}-${ranges.temp[1]}°C`,
      });
    } else if (temp < 36.0) {
      findings.push({
        severity: "critical",
        category: "temperature",
        description: `Hypothermia: ${temp}°C (<36°C critical). Reference for ${ranges.label}: ${ranges.temp[0]}-${ranges.temp[1]}°C`,
      });
    } else if (temp > 37.5) {
      // 37.6-38°C per doc = MR (borderline)
      findings.push({
        severity: "concerning",
        category: "temperature",
        description: `Low-grade fever: ${temp}°C (37.6-38°C — infection workup needed). Reference for ${ranges.label}: ${ranges.temp[0]}-${ranges.temp[1]}°C`,
      });
    } else if (temp > ranges.temp[1] && temp <= 37.5) {
      findings.push({
        severity: "elevated",
        category: "temperature",
        description: `Mildly elevated temperature: ${temp}°C. Reference for ${ranges.label}: ${ranges.temp[0]}-${ranges.temp[1]}°C`,
      });
    } else if (temp < ranges.temp[0]) {
      findings.push({
        severity: "elevated",
        category: "temperature",
        description: `Mildly low temperature: ${temp}°C. Reference for ${ranges.label}: ${ranges.temp[0]}-${ranges.temp[1]}°C`,
      });
    } else {
      findings.push({
        severity: "normal",
        category: "temperature",
        description: `Normal temperature: ${temp}°C (within ${ranges.label} range)`,
      });
    }
  }

  // ── 5. Respiratory Rate (trimester-adjusted) ───────────────────────────
  // Per doc: RR >24 or <12 = critical (HR); RR within 8-24 range
  const rr = parseRespiratoryRate(data.objectiveVitals);
  if (rr !== null) {
    if (rr > 24) {
      findings.push({
        severity: "critical",
        category: "respiratory",
        description: `Tachypnea: ${rr} breaths/min (>24 critical). Reference for ${ranges.label}: RR ${ranges.rr[0]}-${ranges.rr[1]}`,
      });
    } else if (rr < 12) {
      findings.push({
        severity: "critical",
        category: "respiratory",
        description: `Bradypnea: ${rr} breaths/min (<12 critical). Reference for ${ranges.label}: RR ${ranges.rr[0]}-${ranges.rr[1]}`,
      });
    } else if (rr < ranges.rr[0]) {
      findings.push({
        severity: "elevated",
        category: "respiratory",
        description: `Mildly low respiratory rate: ${rr} breaths/min. Reference for ${ranges.label}: RR ${ranges.rr[0]}-${ranges.rr[1]}`,
      });
    } else {
      findings.push({
        severity: "normal",
        category: "respiratory",
        description: `Normal respiratory rate: ${rr} breaths/min (within ${ranges.label} range)`,
      });
    }
  }

  // ── 6. SpO₂ (trimester-adjusted) ──────────────────────────────────────
  // Per doc: SpO₂ <92% = critical (HR); 92-94% = MR (elevated/concerning)
  const spo2 = parseSpO2(data.objectiveVitals);
  if (spo2 !== null) {
    if (spo2 < 92) {
      findings.push({
        severity: "critical",
        category: "spo2",
        description: `Severe hypoxemia: SpO₂ ${spo2}% (<92% critical). Reference for ${ranges.label}: SpO₂ ${ranges.spo2[0]}-${ranges.spo2[1]}%`,
      });
    } else if (spo2 >= 92 && spo2 < 95) {
      // 92-94% per doc = MR (borderline)
      findings.push({
        severity: "concerning",
        category: "spo2",
        description: `Borderline low SpO₂: ${spo2}% (92-94% — requires monitoring). Reference for ${ranges.label}: SpO₂ ${ranges.spo2[0]}-${ranges.spo2[1]}%`,
      });
    } else if (spo2 > ranges.spo2[1]) {
      // Above range but not clinically significant (e.g., supplemental O2)
      findings.push({
        severity: "normal",
        category: "spo2",
        description: `SpO₂: ${spo2}% (above ${ranges.label} reference range ${ranges.spo2[0]}-${ranges.spo2[1]}% — possibly on supplemental oxygen)`,
      });
    } else if (spo2 < ranges.spo2[0]) {
      findings.push({
        severity: "elevated",
        category: "spo2",
        description: `Mildly low SpO₂: ${spo2}%. Reference for ${ranges.label}: SpO₂ ${ranges.spo2[0]}-${ranges.spo2[1]}%`,
      });
    } else {
      findings.push({
        severity: "normal",
        category: "spo2",
        description: `Normal SpO₂: ${spo2}% (within ${ranges.label} range)`,
      });
    }
  }

  // ── 7. BMI-Based Risk ──────────────────────────────────────────────────
  // Per doc: LR 18.5-24.9, MR 25-29.9 or <18.5, HR ≥30 or <16
  const bmi = parseBMI(data.objectiveVitals, ctx);
  if (bmi !== null) {
    if (bmi >= 30) {
      findings.push({
        severity: "critical",
        category: "bmi",
        description: `Obesity (BMI ${bmi} ≥30) — high risk for GDM, preeclampsia, thromboembolism, and operative delivery complications`,
      });
    } else if (bmi < 16) {
      findings.push({
        severity: "critical",
        category: "bmi",
        description: `Severe underweight (BMI ${bmi} <16) — high risk for preterm delivery, low birth weight, and maternal depletion`,
      });
    } else if (bmi >= 25 && bmi < 30) {
      findings.push({
        severity: "concerning",
        category: "bmi",
        description: `Overweight (BMI ${bmi}) — moderate risk for GDM and hypertensive disorders`,
      });
    } else if (bmi >= 18.5 && bmi < 25) {
      findings.push({
        severity: "normal",
        category: "bmi",
        description: `Normal BMI: ${bmi} (healthy weight range)`,
      });
    } else {
      // BMI 16-18.49
      findings.push({
        severity: "concerning",
        category: "bmi",
        description: `Underweight (BMI ${bmi}) — moderate risk for inadequate fetal growth`,
      });
    }
  }

  // ── 8. Demographic Risk: Age ────────────────────────────────────────────
  // Per doc: LR 20-34, MR <20 or 35-39, HR ≥40 or <18
  const age = getCtxNumber(ctx, "age", "patientAge", "patient_age");
  if (age !== null) {
    if (age >= 40 || age < 18) {
      findings.push({
        severity: "critical",
        category: "age",
        description: `High-risk maternal age: ${age} years (${age >= 40 ? "advanced maternal age ≥40" : "adolescent pregnancy <18"}) — increased risk for preeclampsia, GDM, preterm delivery`,
      });
    } else if (age < 20) {
      findings.push({
        severity: "concerning",
        category: "age",
        description: `Adolescent pregnancy: ${age} years — moderate risk for preeclampsia, anemia, and preterm delivery`,
      });
    } else if (age >= 35 && age < 40) {
      findings.push({
        severity: "concerning",
        category: "age",
        description: `Advanced maternal age: ${age} years — moderate risk for GDM, chromosomal abnormalities, and preeclampsia`,
      });
    } else {
      findings.push({
        severity: "normal",
        category: "age",
        description: `Maternal age: ${age} years (optimal reproductive age range 20-34)`,
      });
    }
  }

  // ── 9. Demographic Risk: Parity ────────────────────────────────────────
  // Per doc: LR 1-4, MR 0 (primigravida) or >4, HR >5
  const parity = getCtxNumber(ctx, "parity");
  if (parity !== null) {
    if (parity > 5) {
      findings.push({
        severity: "critical",
        category: "parity",
        description: `Grand multiparity (parity ${parity} >5) — high risk for uterine rupture, PPH, and placenta previa`,
      });
    } else if (parity === 0) {
      findings.push({
        severity: "concerning",
        category: "parity",
        description: `Primigravida (parity 0) — moderate risk for preeclampsia, prolonged labor, and operative delivery`,
      });
    } else if (parity > 4) {
      findings.push({
        severity: "concerning",
        category: "parity",
        description: `High parity (parity ${parity}) — moderate risk for PPH and uterine atony`,
      });
    } else {
      findings.push({
        severity: "normal",
        category: "parity",
        description: `Parity: ${parity} (within normal range 1-4)`,
      });
    }
  }

  // ── 10. Hemoglobin ─────────────────────────────────────────────────────
  const hb = parseHemoglobin(data.labResults);
  if (hb !== null) {
    if (hb < 7.0) {
      findings.push({ severity: "critical", category: "hemoglobin", description: `Severe anemia: Hb ${hb} g/dL — urgent transfusion evaluation needed` });
    } else if (hb < 8.0) {
      findings.push({ severity: "concerning", category: "hemoglobin", description: `Moderate anemia: Hb ${hb} g/dL` });
    } else if (hb < 11.0) {
      findings.push({ severity: "elevated", category: "hemoglobin", description: `Mild anemia: Hb ${hb} g/dL` });
    } else {
      findings.push({ severity: "normal", category: "hemoglobin", description: `Normal hemoglobin: Hb ${hb} g/dL` });
    }
  }

  // ── 11. Blood Glucose ──────────────────────────────────────────────────
  const glucose = parseBloodGlucose(data.labResults);
  if (glucose !== null) {
    if (glucose >= 126) {
      findings.push({ severity: "concerning", category: "glucose", description: `Overt DM: glucose ${glucose} mg/dL` });
    } else if (glucose >= 95) {
      findings.push({ severity: "elevated", category: "glucose", description: `Gestational DM threshold: glucose ${glucose} mg/dL` });
    } else {
      findings.push({ severity: "normal", category: "glucose", description: `Normal blood glucose: ${glucose} mg/dL` });
    }
  }

  // ── 12. Subjective Symptoms Analysis ───────────────────────────────────
  if (data.subjectiveSymptoms) {
    const symptoms = data.subjectiveSymptoms.toLowerCase();

    if (/convulsion|seizure|fit/.test(symptoms)) {
      findings.push({ severity: "critical", category: "eclampsia", description: "Reported convulsions — possible eclampsia EMERGENCY" });
    }
    if (/bleeding|hemorrhage|spotting/.test(symptoms)) {
      findings.push({ severity: "critical", category: "bleeding", description: "Reported vaginal bleeding" });
    }
    if (/severe headache|blurred vision|visual disturb/.test(symptoms)) {
      findings.push({ severity: "critical", category: "preeclampsia", description: "Severe headache with visual disturbance — preeclampsia warning signs" });
    }
    if (/decreased.*movement|no.*movement|absent.*movement/.test(symptoms)) {
      findings.push({ severity: "critical", category: "fetal_movement", description: "Decreased or absent fetal movements" });
    }
    if (/severe abdominal|severe stomach/.test(symptoms)) {
      findings.push({ severity: "concerning", category: "abdominal_pain", description: "Severe abdominal pain reported" });
    }
    if (/nausea|vomiting|hyperemesis/.test(symptoms)) {
      findings.push({ severity: "elevated", category: "nausea", description: "Nausea and/or vomiting" });
    }
    if (/swelling|edema|namamanas/.test(symptoms)) {
      findings.push({ severity: "elevated", category: "edema", description: "Reported swelling/edema" });
    }
    if (/dizziness|lightheaded|hilo/.test(symptoms)) {
      findings.push({ severity: "elevated", category: "dizziness", description: "Dizziness/lightheadedness reported" });
    }
  }

  // ── 13. ICD-10 Diagnosis Analysis ──────────────────────────────────────
  if (data.icd10Diagnosis) {
    const icd = data.icd10Diagnosis.toLowerCase();
    if (/o14|o15/.test(icd)) {
      findings.push({ severity: "concerning", category: "preeclampsia", description: "Preeclampsia/Eclampsia diagnosis recorded" });
    }
    if (/o24/.test(icd)) {
      findings.push({ severity: "elevated", category: "diabetes", description: "Diabetes in pregnancy diagnosis recorded" });
    }
    if (/o44|o45|o46|o20|o72/.test(icd)) {
      findings.push({ severity: "critical", category: "hemorrhage", description: "Hemorrhage-related diagnosis recorded" });
    }
    if (/o60/.test(icd)) {
      findings.push({ severity: "concerning", category: "preterm", description: "Preterm labor diagnosis recorded" });
    }
  }

  // ── 14. Health History Risk Analysis ───────────────────────────────────
  // Smoking, alcohol, drug use from clinicalContext

  // Smoking: "current" → elevated (MR), "former" with pack-years >5 → elevated
  const smoking = getCtxString(ctx, "smoking", "smokingStatus", "smoking_status");
  if (smoking) {
    if (smoking === "current") {
      findings.push({
        severity: "concerning",
        category: "smoking",
        description: "Current smoker — elevated risk for IUGR, placenta previa, abruption, and preterm birth",
      });
    } else if (smoking === "former") {
      // Check pack-years if available
      const packYears = getCtxNumber(ctx, "smokingPackYears", "smoking_pack_years", "packYears", "pack_years");
      if (packYears !== null && packYears > 5) {
        findings.push({
          severity: "elevated",
          category: "smoking",
          description: `Former smoker (${packYears} pack-years) — residual risk for vascular complications`,
        });
      }
      // Former smoker with ≤5 pack-years — note only, no finding added
    }
  }

  // Alcohol: "regular" → elevated (MR), "occasional" → note only
  const alcohol = getCtxString(ctx, "alcohol", "alcoholUse", "alcohol_use");
  if (alcohol) {
    if (alcohol === "regular") {
      findings.push({
        severity: "concerning",
        category: "alcohol",
        description: "Regular alcohol use — elevated risk for FAS, preterm delivery, and developmental complications",
      });
    }
    // "occasional" → note only, no finding added
  }

  // Drug use: "current" → concerning (HR), "past" → elevated (MR)
  const drugUse = getCtxString(ctx, "drugUse", "drug_use", "substanceUse", "substance_use");
  if (drugUse) {
    if (drugUse === "current") {
      findings.push({
        severity: "critical",
        category: "drug_use",
        description: "Current substance/drug use — high risk for fetal withdrawal, IUGR, placental abruption, and maternal complications",
      });
    } else if (drugUse === "past") {
      findings.push({
        severity: "elevated",
        category: "drug_use",
        description: "History of substance/drug use — moderate residual risk; assess for relapse and provide support",
      });
    }
  }

  return findings;
}

// ─── Weighted Scoring & Risk Classification ─────────────────────────────────

/**
 * Determines the overall risk classification using a weighted scoring system.
 *
 * Scoring weights:
 *   critical = 3 points
 *   concerning = 2 points
 *   elevated = 1 point
 *
 * Classification rules:
 *   Score 0           → primary (no risk factors)
 *   Score 1-2, all elevated → primary (mild findings only)
 *   Score 1-2, any concerning → secondary
 *   Score ≥3          → secondary
 *   Score ≥4 or any critical → tertiary
 */
function determineRiskClassification(findings: ClinicalFinding[]): RiskClassification {
  const nonNormal = findings.filter(f => f.severity !== "normal");

  // Early exit for no findings
  if (nonNormal.length === 0) {
    return {
      preventionLevel: "primary",
      referralUrgency: "none",
      referralType: "Refer to Doctor",
    };
  }

  // Calculate weighted score
  const WEIGHTS: Record<string, number> = {
    critical: 3,
    concerning: 2,
    elevated: 1,
  };

  let totalScore = 0;
  let hasCritical = false;
  let hasConcerning = false;
  let hasElevatedOnly = true;
  const criticalCategories: string[] = [];

  for (const finding of nonNormal) {
    totalScore += WEIGHTS[finding.severity] || 0;
    if (finding.severity === "critical") {
      hasCritical = true;
      hasElevatedOnly = false;
      criticalCategories.push(finding.category);
    }
    if (finding.severity === "concerning") {
      hasConcerning = true;
      hasElevatedOnly = false;
    }
  }

  // Determine prevention level
  let preventionLevel: "primary" | "secondary" | "tertiary";

  if (totalScore >= 4 || hasCritical) {
    preventionLevel = "tertiary";
  } else if (totalScore >= 3) {
    preventionLevel = "secondary";
  } else if (totalScore >= 1 && hasElevatedOnly) {
    preventionLevel = "primary";
  } else if (totalScore >= 1) {
    preventionLevel = "secondary";
  } else {
    preventionLevel = "primary";
  }

  // Determine referral urgency and type
  let referralUrgency: RiskClassification["referralUrgency"];
  let referralType: RiskClassification["referralType"];

  if (preventionLevel === "tertiary") {
    referralType = "Transfer to Hospital";

    // Check for emergency signs requiring immediate transfer
    const emergencyCategories = new Set([
      "eclampsia",      // seizure/convulsion
      "bleeding",       // severe bleeding
      "fetal_movement", // absent fetal movement
    ]);

    const hasEmergencySign = criticalCategories.some(cat => emergencyCategories.has(cat));

    if (hasEmergencySign) {
      referralUrgency = "emergency";
    } else if (hasCritical) {
      // Any other critical vital sign (severe BP, severe HR, etc.)
      const criticalVitalCategories = new Set([
        "blood_pressure", "heart_rate", "respiratory", "spo2", "temperature",
        "bmi", "age", "parity", "hemoglobin", "fhr", "drug_use",
      ]);
      const hasCriticalVital = criticalCategories.some(cat => criticalVitalCategories.has(cat));
      if (hasCriticalVital) {
        referralUrgency = "urgent";
      } else {
        referralUrgency = "urgent";
      }
    } else {
      referralUrgency = "urgent";
    }
  } else if (preventionLevel === "secondary") {
    referralUrgency = "non_urgent";
    referralType = "Refer to Specialist";
  } else {
    referralUrgency = "none";
    referralType = "Refer to Doctor";
  }

  return {
    preventionLevel,
    referralUrgency,
    referralType,
  };
}

// ─── Intervention Builder ──────────────────────────────────────────────────

/**
 * Builds NIC nursing interventions based on clinical findings and risk level.
 * Maintains all existing NIC codes and Filipino cultural considerations.
 * Thresholds are updated to match trimester-specific baselines.
 */
function buildInterventions(
  data: AssessmentData,
  findings: ClinicalFinding[],
  classification: RiskClassification
): AIIntervention[] {
  const interventions: AIIntervention[] = [];
  const ctx = data.clinicalContext || {};
  const trimester = getTrimester(ctx.aog);
  const ranges = TRIMESTER_RANGES[trimester];
  const fhr = parseFHR(data.fetalHeartRate);

  // ── Always include base interventions ──────────────────────────────────

  // NIC 5602: Teaching: Individual — always included
  interventions.push({
    code: 5602,
    name: "Teaching: Individual",
    description: `Provide individualized health education on pregnancy self-care, warning signs, and when to seek care. Include danger sign recognition per DOH protocol: vaginal bleeding, severe headache, blurred vision, convulsions, severe abdominal pain, decreased fetal movements, fever, and difficulty breathing. Use simple Tagalog and culturally appropriate materials.`,
    category: "Educational",
    relatedNanda: "Deficient Knowledge",
    relatedNoc: "Knowledge: Pregnancy (1805)",
    priority: "medium",
  });

  // NIC 3390: Vital Signs Monitoring — always included
  interventions.push({
    code: 3390,
    name: "Vital Signs Monitoring",
    description: `Perform systematic vital signs assessment including BP, HR, RR, temperature, and SpO₂. Record and trend values. Compare against ${ranges.label} reference ranges (SBP ${ranges.sbp[0]}-${ranges.sbp[1]}, DBP ${ranges.dbp[0]}-${ranges.dbp[1]}, HR ${ranges.hr[0]}-${ranges.hr[1]}, RR ${ranges.rr[0]}-${ranges.rr[1]}, SpO₂ ${ranges.spo2[0]}-${ranges.spo2[1]}%, Temp ${ranges.temp[0]}-${ranges.temp[1]}°C). Document any deviations immediately.`,
    category: "Physiological",
    relatedNanda: "Decreased Cardiac Output",
    relatedNoc: "Maternal Hemodynamic Status (0402)",
    priority: "medium",
  });

  // ── Condition-specific intervention flags ──────────────────────────────

  const hasBP = findings.some(f => f.category === "blood_pressure" && f.severity !== "normal");
  const hasFHR = findings.some(f => f.category === "fhr" && f.severity !== "normal");
  const hasBleeding = findings.some(f => f.category === "bleeding");
  const hasAnemia = findings.some(f => f.category === "hemoglobin" && f.severity !== "normal");
  const hasFever = findings.some(f => f.category === "temperature" && f.severity !== "normal");
  const hasPreterm = findings.some(f => f.category === "preterm");
  const hasPreEclampsia = findings.some(f => f.category === "preeclampsia" || f.category === "eclampsia");
  const hasGlucose = findings.some(f => f.category === "glucose" && f.severity !== "normal");
  const hasEdema = findings.some(f => f.category === "edema");
  const hasNausea = findings.some(f => f.category === "nausea");
  const hasDizziness = findings.some(f => f.category === "dizziness");
  const hasFetalMovement = findings.some(f => f.category === "fetal_movement");
  const hasSpo2 = findings.some(f => f.category === "spo2" && f.severity !== "normal");
  const hasBmiIssue = findings.some(f => f.category === "bmi" && f.severity !== "normal");
  const hasAgeIssue = findings.some(f => f.category === "age" && f.severity !== "normal");
  const hasParityIssue = findings.some(f => f.category === "parity" && f.severity !== "normal");
  const hasSmoking = findings.some(f => f.category === "smoking");
  const hasAlcohol = findings.some(f => f.category === "alcohol");
  const hasDrugUse = findings.some(f => f.category === "drug_use");

  // ── Fetal Heart Rate Monitoring ────────────────────────────────────────

  if (fhr !== null || hasFetalMovement) {
    interventions.push({
      code: 6680,
      name: "Monitoring Fetal Well-Being",
      description: `Systematic fetal surveillance including FHR auscultation and fetal movement assessment${fhr !== null && (fhr < 110 || fhr > 160) ? ". FHR abnormality detected — initiate continuous monitoring, reposition patient to left lateral, administer oxygen, and prepare for urgent obstetric evaluation." : ". Educate mother on kick count method (10 kicks in 2 hours). Report decreased or absent movements immediately."}`,
      category: "Physiological",
      relatedNanda: "Risk for Injury (fetal)",
      relatedNoc: "Fetal Status (2002)",
      priority: hasFHR || hasFetalMovement ? "high" : "medium",
    });
  }

  // ── Blood Pressure Interventions ───────────────────────────────────────

  if (hasBP) {
    const bpFinding = findings.find(f => f.category === "blood_pressure");

    if (bpFinding && bpFinding.severity === "critical") {
      interventions.push({
        code: 6340,
        name: "Preeclampsia/Eclampsia Management",
        description: "EMERGENCY: Severe hypertensive BP detected (≥140/90 or ≥170/110). Implement preeclampsia protocol: ensure IV access, prepare magnesium sulfate for seizure prophylaxis, continuous vital signs monitoring, strict intake/output monitoring, bed rest in left lateral position. Notify physician immediately for possible antihypertensive management. Prepare for emergency delivery if eclampsia develops.",
        category: "Safety",
        relatedNanda: "Risk for Ineffective Cerebral Tissue Perfusion",
        relatedNoc: "Maternal Hemodynamic Status (0402)",
        priority: "high",
      });
    }

    interventions.push({
      code: 6650,
      name: "Surveillance",
      description: bpFinding && bpFinding.severity === "critical"
        ? "Intensive continuous surveillance for eclampsia: monitor BP every 5-15 minutes, assess for hyperreflexia, epigastric pain, visual changes, and altered mental status. Maintain seizure precautions."
        : bpFinding && bpFinding.severity === "concerning"
        ? "Close monitoring of blood pressure with trending. Assess for proteinuria, edema, headache, and visual changes. Bed rest recommended. Schedule follow-up within 1-3 days."
        : "Periodic BP monitoring. Educate on sodium moderation and stress reduction. Schedule next ANC visit.",
      category: "Physiological",
      relatedNanda: "Risk for Ineffective Peripheral Tissue Perfusion",
      relatedNoc: "Blood Pressure Status (0401)",
      priority: hasPreEclampsia ? "high" : "medium",
    });
  }

  // ── Bleeding Interventions ─────────────────────────────────────────────

  if (hasBleeding) {
    interventions.push({
      code: 6610,
      name: "Bleeding Precautions",
      description: "CRITICAL: Vaginal bleeding detected. Assess amount, color, and associated symptoms. Monitor vital signs closely for signs of hypovolemic shock. Maintain IV access with large-bore catheter. Prepare for possible blood transfusion. Position patient flat with legs elevated. Monitor fetal status continuously. URGENT referral needed.",
      category: "Safety",
      relatedNanda: "Risk for Deficient Fluid Volume",
      relatedNoc: "Blood Loss Severity (0403)",
      priority: "high",
    });
    interventions.push({
      code: 4010,
      name: "Bleeding Reduction",
      description: "Implement hemorrhage precautions: assess fundal height and tone, monitor lochia amount, count perineal pads. Prepare uterotonic agents (oxytocin). Ensure type and crossmatch available. Monitor for signs of DIC.",
      category: "Physiological",
      relatedNanda: "Risk for Shock",
      relatedNoc: "Blood Coagulation (1900)",
      priority: "high",
    });
  }

  // ── Anemia Interventions ───────────────────────────────────────────────

  if (hasAnemia) {
    const hbFinding = findings.find(f => f.category === "hemoglobin");
    interventions.push({
      code: 1570,
      name: "Medication Administration",
      description: hbFinding && hbFinding.severity === "critical"
        ? "Severe anemia (Hb <7). Administer iron supplements as prescribed. Prepare for possible blood transfusion evaluation. Monitor for signs of cardiac decompensation (tachycardia, dyspnea, fatigue). Advise bed rest to reduce cardiac demand."
        : "Administer iron-folic acid supplementation (1 tablet daily per DOH protocol). Counsel on iron-rich foods: malunggay, red meat, liver, dark green leafy vegetables. Take iron between meals with vitamin C for better absorption. Warn about dark stools (expected side effect).",
      category: "Physiological",
      relatedNanda: "Imbalanced Nutrition: Less Than Body Requirements",
      relatedNoc: "Nutritional Status (1004)",
      priority: hbFinding?.severity === "critical" ? "high" : "medium",
    });
    interventions.push({
      code: 5246,
      name: "Nutritional Counseling",
      description: "Provide individualized nutritional counseling emphasizing iron-rich Filipino foods: malunggay leaves, red kangkong, ampalaya, kalabasa, tokwa, tahong, danggit. Encourage vitamin C-rich fruits with meals to enhance iron absorption (calamansi, pineapple, mango). Avoid tea/coffee with meals. Recommend increased protein intake (fish, eggs, lean meat).",
      category: "Educational",
      relatedNanda: "Imbalanced Nutrition: Less Than Body Requirements",
      relatedNoc: "Nutritional Status: Food and Fluid Intake (1008)",
      priority: "medium",
    });
  }

  // ── SpO₂ / Hypoxemia Intervention ─────────────────────────────────────

  if (hasSpo2) {
    const spo2Finding = findings.find(f => f.category === "spo2");
    if (spo2Finding && spo2Finding.severity === "critical") {
      interventions.push({
        code: 3320,
        name: "Oxygen Therapy",
        description: `Severe hypoxemia detected (SpO₂ <92%). Initiate supplemental oxygen immediately. Position patient in left lateral or semi-Fowler's to optimize respiratory effort. Continuous pulse oximetry monitoring. Assess for respiratory distress signs. Notify physician urgently. Prepare for possible emergency delivery if fetal compromise suspected.`,
        category: "Physiological",
        relatedNanda: "Impaired Gas Exchange",
        relatedNoc: "Respiratory Status: Gas Exchange (0402)",
        priority: "high",
      });
    } else {
      interventions.push({
        code: 3350,
        name: "Respiratory Monitoring",
        description: `Borderline SpO₂ detected (92-94%). Monitor oxygen saturation continuously. Encourage deep breathing exercises and adequate hydration. Assess for respiratory infection, anemia, or cardiac causes. Position for optimal respiratory effort.`,
        category: "Physiological",
        relatedNanda: "Risk for Impaired Gas Exchange",
        relatedNoc: "Respiratory Status (0403)",
        priority: "medium",
      });
    }
  }

  // ── Fever/Infection Interventions ──────────────────────────────────────

  if (hasFever) {
    interventions.push({
      code: 6900,
      name: "Infection Protection",
      description: "Fever detected — implement infection prevention measures. Assess for source (UTI, respiratory, wound). Obtain cultures as indicated. Administer antipyretics as prescribed (paracetamol safe in pregnancy). Monitor maternal and fetal status. Increased fluid intake encouraged.",
      category: "Safety",
      relatedNanda: "Risk for Infection",
      relatedNoc: "Immune Status (0701)",
      priority: "high",
    });
  }

  // ── Diabetes Interventions ─────────────────────────────────────────────

  if (hasGlucose) {
    interventions.push({
      code: 2080,
      name: "Nutritional Management",
      description: "Elevated blood glucose detected. Implement diabetic diet counseling: complex carbohydrates (brown rice, kamote), lean proteins, vegetables. Small frequent meals (3 meals + 3 snacks). Limit simple sugars and refined carbohydrates. Encourage moderate physical activity after meals (walking). Monitor blood glucose as prescribed.",
      category: "Physiological",
      relatedNanda: "Imbalanced Nutrition: Less Than Body Requirements",
      relatedNoc: "Blood Glucose Level (2300)",
      priority: "high",
    });
  }

  // ── BMI Interventions ──────────────────────────────────────────────────

  if (hasBmiIssue) {
    const bmiFinding = findings.find(f => f.category === "bmi");
    interventions.push({
      code: 6540,
      name: "Weight Management",
      description: bmiFinding && bmiFinding.severity === "critical"
        ? "Critical BMI detected. If obese (≥30): counsel on gestational weight gain limits, screen for GDM and preeclampsia at every visit, refer to dietitian. If severely underweight (<16): intensive nutritional supplementation, monitor for IUGR, schedule frequent growth scans. If overweight (25-29.9) or underweight (16-18.4): dietary counseling with emphasis on balanced Filipino diet."
        : "Monitor gestational weight gain against recommended BMI-based guidelines. Counsel on appropriate caloric intake and nutritional quality per trimester.",
      category: "Physiological",
      relatedNanda: "Imbalanced Nutrition: Less Than Body Requirements",
      relatedNoc: "Nutritional Status (1004)",
      priority: bmiFinding?.severity === "critical" ? "high" : "medium",
    });
  }

  // ── Substance Use Interventions ────────────────────────────────────────

  if (hasSmoking || hasAlcohol || hasDrugUse) {
    interventions.push({
      code: 4350,
      name: "Behavior Modification",
      description: [
        hasSmoking ? "Smoking cessation counseling: provide resources for quitting, discuss risks to fetus (IUGR, placental abruption, preterm birth). Nicotine replacement therapy safety in pregnancy. Refer to cessation support program." : "",
        hasAlcohol ? "Alcohol avoidance counseling: educate on fetal alcohol spectrum risks. Encourage complete abstinence during pregnancy. Provide non-judgmental support." : "",
        hasDrugUse ? "Substance use assessment and referral: non-judgmental screening for type/frequency of use. Refer to addiction specialist and social services. Ensure patient safety and confidentiality. Coordinate with barangay health worker for follow-up." : "",
      ].filter(Boolean).join(" "),
      category: "Psychosocial",
      relatedNanda: "Ineffective Health Maintenance",
      relatedNoc: "Health-Promoting Behavior (1602)",
      priority: hasDrugUse ? "high" : "medium",
    });
  }

  // ── Age/Parity-Specific Interventions ──────────────────────────────────

  if (hasAgeIssue) {
    const ageFinding = findings.find(f => f.category === "age");
    if (ageFinding && (ageFinding.severity === "critical" || ageFinding.severity === "concerning")) {
      interventions.push({
        code: 7110,
        name: "Family Involvement Promotion",
        description: ageFinding.severity === "critical"
          ? "High-risk maternal age detected. Engage family support systems actively — involve spouse/partner and extended family per Filipino cultural values. For adolescent mothers: ensure parental/guardian involvement, connect with school-based programs, address social support needs. For advanced maternal age (≥40): discuss genetic screening options, ensure comprehensive prenatal surveillance."
          : "Moderate-risk maternal age. Provide age-appropriate counseling and ensure adequate family/social support. Schedule additional monitoring visits as indicated.",
        category: "Psychosocial",
        relatedNanda: "Risk for Impaired Parenting",
        relatedNoc: "Social Support (1504)",
        priority: "medium",
      });
    }
  }

  if (hasParityIssue) {
    const parityFinding = findings.find(f => f.category === "parity");
    if (parityFinding && parityFinding.severity === "critical") {
      interventions.push({
        code: 6610,
        name: "Bleeding Precautions (High Parity)",
        description: "Grand multiparity detected (parity >5) — elevated risk for PPH and uterine atony. Ensure active management of third stage of labor (AMTSL). Prepare oxytocin and uterotonics. Monitor for signs of uterine atony post-delivery. Type and screen blood products.",
        category: "Safety",
        relatedNanda: "Risk for Deficient Fluid Volume",
        relatedNoc: "Blood Loss Severity (0403)",
        priority: "high",
      });
    }
  }

  // ── Emotional Support — always included ────────────────────────────────

  interventions.push({
    code: 5270,
    name: "Emotional Support",
    description: "Provide psychological comfort and reassurance. Acknowledge patient concerns about pregnancy, fetal health, and upcoming delivery. Encourage family involvement in care decisions per Filipino cultural values. Assess coping mechanisms and provide anxiety-reduction techniques (deep breathing, guided imagery). Address any fears about labor or complications.",
    category: "Psychosocial",
    relatedNanda: "Anxiety",
    relatedNoc: "Anxiety Level (1211)",
    priority: classification.preventionLevel === "tertiary" ? "high" : "medium",
  });

  // ── Fall Prevention ────────────────────────────────────────────────────

  interventions.push({
    code: 6920,
    name: "Fall Prevention",
    description: "Assess fall risk factors: visual changes, edema, balance changes from pregnancy, orthostatic hypotension. Educate on fall prevention: wear non-slip footwear, use handrails, rise slowly from sitting/lying position, ensure adequate lighting at home. Assist with ambulation if needed.",
    category: "Safety",
    relatedNanda: "Risk for Injury (maternal)",
    relatedNoc: "Fall Prevention Behavior (1909)",
    priority: hasDizziness || hasEdema ? "high" : "low",
  });

  // ── AOG-Specific Interventions ─────────────────────────────────────────

  if (ctx.aog) {
    const aogMatch = ctx.aog.match(/(\d+)/);
    const weeks = aogMatch ? parseInt(aogMatch[1]) : null;
    if (weeks !== null) {
      if (weeks <= 13) {
        interventions.push({
          code: 7140,
          name: "Extracorporeal Therapy Regulation",
          description: `First trimester care (AOG ${weeks} weeks): Ensure folic acid supplementation (400mcg daily). Screen for hyperemesis if nausea/vomiting present. Schedule initial labs (CBC, blood typing, urinalysis). Counsel on danger signs and expected pregnancy changes.`,
          category: "Physiological",
          relatedNanda: "Nausea",
          relatedNoc: "Nutritional Status: Food and Fluid Intake (1008)",
          priority: "medium",
        });
      } else if (weeks >= 14 && weeks <= 27) {
        interventions.push({
          code: 6670,
          name: "Temperature Regulation",
          description: `Second trimester care (AOG ${weeks} weeks): Monitor fetal movement awareness. Schedule gestational diabetes screening at 24-28 weeks if not done. Continue iron-folic acid supplementation. TT immunization per DOH protocol. Monitor fundal height progression.`,
          category: "Physiological",
          relatedNanda: "Deficient Knowledge",
          relatedNoc: "Knowledge: Pregnancy (1805)",
          priority: "medium",
        });
      } else if (weeks >= 28) {
        interventions.push({
          code: 6654,
          name: "Surveillance: Late Pregnancy",
          description: `Third trimester care (AOG ${weeks} weeks): Intensive fetal well-being surveillance — teach kick count method (10 kicks in 2 hours). Pre-eclampsia screening (BP + proteinuria). Monitor for preterm labor signs. Birth preparedness planning. Breastfeeding education. Counsel on danger signs requiring immediate care.`,
          category: "Physiological",
          relatedNanda: "Risk for Injury (fetal)",
          relatedNoc: "Fetal Status (2002)",
          priority: "high",
        });
      }
    }
  }

  // ── Referral Coordination ─────────────────────────────────────────────

  if (classification.preventionLevel === "tertiary") {
    interventions.push({
      code: 5500,
      name: "Referral",
      description: `Coordinate ${classification.referralUrgency === "emergency" ? "EMERGENCY" : "urgent"} referral — ${classification.referralType}. ${classification.referralUrgency === "emergency" ? "Immediate transfer to CEmONC-capable hospital required. Activate emergency referral protocol." : "Refer to higher-level facility (CEmONC-capable hospital) based on clinical severity."} Ensure stable transfer: IV access, vital signs documented, patient summary prepared. Notify receiving facility. Accompany patient if possible. BEmONC measures during transfer as needed.`,
      category: "Educational",
      relatedNanda: "Risk for Injury (maternal)",
      relatedNoc: "Health Care Coordination (0301)",
      priority: "high",
    });
  }

  return interventions;
}

// ─── Main Export ────────────────────────────────────────────────────────────

/**
 * Generates evidence-based nursing intervention suggestions when the
 * cloud AI service is unavailable. Uses rule-based clinical analysis
 * with trimester-specific vital sign baselines and weighted scoring.
 *
 * This function returns an AIResponse with additional fields:
 * - referralUrgency: urgency level for referral
 * - referralType: type of referral recommended
 */
export function generateFallbackSuggestions(data: AssessmentData): AIResponse {
  const findings = analyzeFindings(data);
  const classification = determineRiskClassification(findings);
  const interventions = buildInterventions(data, findings, classification);
  const ctx = data.clinicalContext || {};
  const trimester = getTrimester(ctx.aog);
  const trimesterLabel = TRIMESTER_RANGES[trimester].label;

  // Sort interventions: high priority first
  interventions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const priorityIntervention = interventions.find(i => i.priority === "high") || interventions[0];

  // Build risk indicators
  const riskIndicators = findings
    .filter(f => f.severity !== "normal")
    .map(f => f.description);

  if (ctx.riskLevel) {
    riskIndicators.unshift(`Patient risk level assessment: ${ctx.riskLevel}`);
  }

  // Build nursing considerations
  const considerations: string[] = [];

  // Cultural considerations
  considerations.push("Consider Filipino cultural practices: involve family in care decisions, use simple Tagalog, acknowledge traditional practices while guiding toward evidence-based care.");
  considerations.push("Assess financial constraints and discuss PhilHealth Maternity Care Package coverage.");

  // Trimester context
  considerations.push(`Trimester assessment: ${trimesterLabel}. Vital sign thresholds are adjusted per trimester-specific reference ranges.`);

  // Clinical-specific considerations
  if (findings.some(f => f.category === "blood_pressure" && f.severity === "critical")) {
    considerations.push("CRITICAL: Prepare magnesium sulfate, emergency delivery supplies, and notify obstetrician immediately.");
  }
  if (findings.some(f => f.category === "bleeding")) {
    considerations.push("Ensure type and crossmatch available. Monitor for signs of hypovolemic shock. Prepare for emergency intervention.");
  }
  if (findings.some(f => f.category === "hemoglobin" && f.severity === "critical")) {
    considerations.push("Evaluate for blood transfusion. Monitor for cardiac decompensation. Bed rest advised.");
  }
  if (findings.some(f => f.category === "spo2" && f.severity === "critical")) {
    considerations.push("CRITICAL: Initiate supplemental oxygen immediately. Continuous pulse oximetry. Prepare for emergency delivery if fetal compromise suspected.");
  }
  if (findings.some(f => f.category === "eclampsia")) {
    considerations.push("EMERGENCY: Eclamptic seizure protocol — protect airway, administer magnesium sulfate, position on left side, prepare for emergency delivery.");
  }
  if (findings.some(f => f.category === "fetal_movement")) {
    considerations.push("CRITICAL: Absent/decreased fetal movements — perform immediate bedside assessment, continuous FHR monitoring, prepare for urgent obstetric evaluation.");
  }
  if (findings.some(f => f.category === "drug_use" && f.severity === "critical")) {
    considerations.push("High priority: Coordinate with social services for substance use support. Non-judgmental approach essential. Ensure confidentiality per DOH guidelines.");
  }
  if (ctx.aog) {
    const aogMatch = ctx.aog.match(/(\d+)/);
    const weeks = aogMatch ? parseInt(aogMatch[1]) : null;
    if (weeks !== null && weeks >= 28) {
      considerations.push("Third trimester: emphasize kick counts, birth preparedness plan, and breastfeeding readiness.");
    }
  }

  // Follow-up schedule based on classification
  let followUpSchedule: string;
  if (classification.preventionLevel === "tertiary") {
    if (classification.referralUrgency === "emergency") {
      followUpSchedule = "EMERGENCY — immediate transfer to hospital required. No outpatient follow-up; inpatient management until stabilized.";
    } else {
      followUpSchedule = "URGENT referral needed — same-day transfer to CEmONC-capable facility. If managed as outpatient, return within 24-48 hours for reassessment.";
    }
  } else if (classification.preventionLevel === "secondary") {
    const hasBPIssue = findings.some(f => f.category === "blood_pressure" && f.severity !== "normal");
    if (hasBPIssue) {
      followUpSchedule = "Return in 3-5 days for BP monitoring and proteinuria check. Contact immediately if severe headache, visual changes, or epigastric pain develop.";
    } else {
      followUpSchedule = "Return in 1-2 weeks for repeat assessment and monitoring of identified concerns. Continue prescribed medications and supplements.";
    }
  } else {
    followUpSchedule = "Next ANC visit per DOH schedule. Continue prenatal vitamins and iron-folic acid supplementation. Report any danger signs immediately.";
  }

  // Referral
  const needsReferral = classification.preventionLevel === "tertiary" || classification.preventionLevel === "secondary";
  const referralReason = needsReferral
    ? findings
        .filter(f => f.severity === "critical" || f.severity === "concerning")
        .map(f => f.description)
        .join("; ") + `. ${classification.referralType} recommended. ${classification.referralUrgency !== "none" ? `Referral urgency: ${classification.referralUrgency}.` : ""}`
    : "";

  // Rationale
  const riskDescription = classification.preventionLevel === "tertiary"
    ? "high-risk status requiring urgent intervention and referral"
    : classification.preventionLevel === "secondary"
    ? "moderate-risk status requiring close monitoring and specialist referral"
    : "low-risk status with routine prenatal care";

  const abnormalFindings = findings.filter(f => f.severity !== "normal");
  const rationale = abnormalFindings.length > 0
    ? `Based on clinical assessment using trimester-adjusted vital sign baselines (${trimesterLabel}), the following findings indicate ${riskDescription}: ${abnormalFindings.map(f => f.description).join("; ")}. Weighted risk score calculated using severity-based scoring (critical=3, concerning=2, elevated=1). Interventions selected follow the ADPIE nursing process, aligned with NIC/NANDA/NOC classifications, and comply with DOH National Safe Motherhood Program guidelines and WHO safe motherhood recommendations. ${needsReferral ? `${classification.referralType} is indicated per DOH referral criteria (urgency: ${classification.referralUrgency}).` : "Continue routine prenatal monitoring per DOH protocol."}`
    : `Assessment data within normal limits for ${trimesterLabel}. All vital signs within trimester-specific reference ranges. Interventions focus on health promotion, routine monitoring, and anticipatory guidance per DOH National Safe Motherhood Program and WHO ANC guidelines. Primary prevention approach appropriate for low-risk pregnancy.`;

  // Return AIResponse with additional referral fields
  // These fields extend the base AIResponse type but TypeScript allows
  // extra properties on object literals when returned dynamically.
  return {
    interventions,
    priorityIntervention: priorityIntervention?.name || "Teaching: Individual",
    priorityCode: priorityIntervention?.code || 5602,
    rationale,
    preventionLevel: classification.preventionLevel,
    riskIndicators,
    nursingConsiderations: considerations,
    referralNeeded: needsReferral,
    referralReason,
    followUpSchedule,
    referralUrgency: classification.referralUrgency,
    referralType: classification.referralType,
  } as AIResponse & {
    referralUrgency: RiskClassification["referralUrgency"];
    referralType: RiskClassification["referralType"];
  };
}
