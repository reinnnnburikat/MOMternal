import jsPDF from 'jspdf';

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSIONAL REFERRAL PDF — MOMternal
//  Design: Clean, minimal, soft medical aesthetic
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Color System ────────────────────────────────────────────────────────────
const CLR = {
  primary:    [190, 30, 45]  as const,   // brand red (muted)
  primaryLt:  [253, 237, 237] as const,  // very soft red
  teal:       [15, 118, 110] as const,   // medical teal
  tealLt:     [224, 247, 245] as const,  // soft teal
  amber:      [180, 83, 9]   as const,   // warm amber
  amberLt:    [254, 243, 199] as const,  // soft amber
  heading:    [31, 41, 55]   as const,   // slate-800
  body:       [55, 65, 81]   as const,   // slate-600
  label:      [100, 116, 139] as const,  // slate-500
  muted:      [148, 163, 184] as const,  // slate-400
  divider:    [226, 232, 240] as const,  // slate-200
  white:      [255, 255, 255] as const,
  pageBg:     [248, 250, 252] as const,  // slate-50
  emergencyRed: [220, 38, 38] as const, // vivid red for emergency
  emergencyRedLt: [254, 226, 226] as const, // soft red for emergency badge
};

type C3 = readonly [number, number, number];

// ─── Page Geometry (A4 portrait) ─────────────────────────────────────────────
const PW  = 210;
const PH  = 297;
const ML  = 22;                     // left margin
const MR  = 22;                     // right margin
const CW  = PW - ML - MR;          // 166mm content width
const FOOTER_Y = PH - 18;          // footer line position

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ReferralPdfData {
  consultationNo: string;
  consultationDate: string;
  patientName: string;
  patientId: string;
  patientDateOfBirth?: string;
  patientBarangay?: string;
  typeOfVisit?: string;
  chiefComplaint?: string;
  gravida?: string;
  para?: string;
  aog?: string;
  lmp?: string;
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  respiratoryRate?: string;
  oxygenSat?: string;
  painScale?: string;
  fetalHeartRate?: string;
  fundalHeight?: string;
  allergies?: string;
  medications?: string;
  riskLevel?: string;
  preventionLevel?: string;
  healthHistory?: {
    pastMedicalHistory?: string;
    previousSurgery?: string;
    historyOfTrauma?: string;
    historyOfBloodTransfusion?: string;
    familyHistoryPaternal?: string;
    familyHistoryMaternal?: string;
    smokingHistory?: string;
    alcoholIntake?: string;
    drugUse?: string;
    dietaryPattern?: string;
    physicalActivity?: string;
    sleepPattern?: string;
    allergies?: string;
    currentMedications?: string;
    immunizationStatus?: string;
    mentalHealthHistory?: string;
  };
  healthHistoryRefCode?: string;
  physicalExam?: string;
  labResults?: string;
  notes?: string;
  icd10Diagnosis?: string;
  nandaDiagnosis?: string;
  nandaCode?: string;
  nandaRelatedTo?: string;
  icd10AdditionalNotes?: string;
  aiRationale?: string;
  aiRiskIndicators?: string[];
  aiNursingConsiderations?: string[];
  aiPriorityIntervention?: string;
  aiFollowUpSchedule?: string;
  aiReferralNeeded?: boolean;
  aiReferralReason?: string;
  interventions: Array<{ name: string; description?: string; code?: string }>;
  interventionEvals?: Array<{
    nicCode: string;
    status: string;
    nocOutcome: string;
    nocOutcomeCode: string;
    notes: string;
  }>;
  evaluationNotes?: string;
  referralPriority?: string;
  referralFacility?: string;
  referralType?: string;
}

// ─── Low-level Helpers ────────────────────────────────────────────────────────
function setF(doc: jsPDF, sz: number, st: 'normal' | 'bold' | 'italic' = 'normal') {
  doc.setFont('helvetica', st);
  doc.setFontSize(sz);
}

function present(...v: (string | undefined | null)[]): boolean {
  return v.some((s) => s && s.trim() !== '');
}

function fmtDate(raw: string): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return raw; }
}

function hasHH(hh: ReferralPdfData['healthHistory'] | undefined): boolean {
  if (!hh) return false;
  return present(
    hh.pastMedicalHistory, hh.previousSurgery, hh.historyOfTrauma, hh.historyOfBloodTransfusion,
    hh.familyHistoryPaternal, hh.familyHistoryMaternal, hh.smokingHistory, hh.alcoholIntake,
    hh.drugUse, hh.dietaryPattern, hh.physicalActivity, hh.sleepPattern,
    hh.allergies, hh.currentMedications, hh.immunizationStatus, hh.mentalHealthHistory,
  );
}

// ─── Page Break — ensures content never enters footer zone ────────────────────
function pageBreak(doc: jsPDF, y: number, need: number): number {
  if (y + need > FOOTER_Y - 6) {
    doc.addPage();
    return 24;
  }
  return y;
}

// ─── Layout Primitives ────────────────────────────────────────────────────────

/** Section heading with underline accent */
function heading(doc: jsPDF, y: number, text: string, accent: C3 = CLR.primary): number {
  y = pageBreak(doc, y, 18);
  setF(doc, 9, 'bold');
  doc.setTextColor(...accent);
  doc.text(text.toUpperCase(), ML, y);
  y += 2;
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.4);
  doc.line(ML, y, ML + doc.getTextWidth(text.toUpperCase()), y);
  return y + 8;
}

/** Sub-section heading */
function subHead(doc: jsPDF, y: number, text: string): number {
  y = pageBreak(doc, y, 10);
  setF(doc, 8, 'bold');
  doc.setTextColor(...CLR.heading);
  doc.text(text, ML + 3, y);
  return y + 5;
}

/** Label: Value row. Returns y after the content. */
function kv(doc: jsPDF, y: number, label: string, value: string): number {
  if (!value || value.trim() === '' || value.trim() === 'N/A') return y;
  y = pageBreak(doc, y, 6);
  setF(doc, 8, 'bold');
  doc.setTextColor(...CLR.label);
  const lt = `${label}: `;
  const lw = doc.getTextWidth(lt);
  doc.text(lt, ML, y);
  setF(doc, 8, 'normal');
  doc.setTextColor(...CLR.body);
  const lines = doc.splitTextToSize(value, CW - lw);
  doc.text(lines, ML + lw, y);
  return y + lines.length * 4.2 + 1.5;
}

/**
 * Two-column grid — ROW-BASED layout.
 * Each row has 2 items. Multi-line values are handled per-row.
 * Returns y after the last row.
 */
function grid(
  doc: jsPDF, y: number,
  pairs: Array<{ label: string; value: string }>,
  cols = 2,
): number {
  const items = pairs.filter((p) => p.value && p.value.trim() !== '' && p.value.trim() !== 'N/A');
  if (!items.length) return y;

  const colW = CW / cols;
  let rowStartY = y;

  for (let i = 0; i < items.length; i += cols) {
    const rowItems = items.slice(i, i + cols);
    y = pageBreak(doc, y, 8);
    if (i > 0) y += 1.5; // row gap

    let maxLines = 1;

    // Measure all cells in this row first
    rowItems.forEach((item, col) => {
      const x = ML + col * colW;
      setF(doc, 8, 'bold');
      const lt = `${item.label}: `;
      const lw = doc.getTextWidth(lt);
      setF(doc, 8, 'normal');
      const valW = colW - lw - 4;
      const lines = doc.splitTextToSize(item.value, Math.max(valW, 15));
      item['__lines'] = lines;
      item['__lw'] = lw;
      item['__x'] = x;
      if (lines.length > maxLines) maxLines = lines.length;
    });

    // Draw all cells in this row
    rowItems.forEach((item: any) => {
      const x = item.__x;
      setF(doc, 8, 'bold');
      doc.setTextColor(...CLR.label);
      doc.text(`${item.label}: `, x, y);
      setF(doc, 8, 'normal');
      doc.setTextColor(...CLR.body);
      doc.text(item.__lines, x + item.__lw, y);
    });

    y += maxLines * 4.2 + 1;
  }

  return y + 4;
}

/** Rounded info box with background */
function box(
  doc: jsPDF, y: number, title: string, body: string,
  bg: C3, fg: C3, tf: C3,
): number {
  setF(doc, 7.5, 'normal');
  const bodyL = doc.splitTextToSize(body, CW - 14);
  setF(doc, 7.5, 'bold');
  const titleH = 5;
  const padTop = 6;
  const padBot = 5;
  const boxH = padTop + titleH + bodyL.length * 3.5 + padBot;

  y = pageBreak(doc, y, boxH + 2);
  doc.setFillColor(...bg);
  doc.roundedRect(ML, y, CW, boxH, 2, 2, 'F');

  let cy = y + padTop + 2;
  setF(doc, 7.5, 'bold');
  doc.setTextColor(...tf);
  doc.text(title, ML + 5, cy);
  cy += titleH;

  setF(doc, 7.5, 'normal');
  doc.setTextColor(...fg);
  doc.text(bodyL, ML + 5, cy);

  return y + boxH + 5;
}

/** Bullet list */
function list(doc: jsPDF, y: number, title: string, items: string[]): number {
  if (!items.length) return y;
  y = pageBreak(doc, y, 8);
  setF(doc, 8, 'bold');
  doc.setTextColor(...CLR.heading);
  doc.text(title, ML, y);
  y += 5;
  items.forEach((item) => {
    y = pageBreak(doc, y, 5);
    setF(doc, 7.5, 'normal');
    doc.setTextColor(...CLR.body);
    doc.text(`\u2022  ${item}`, ML + 3, y);
    y += 4;
  });
  return y + 2;
}

// ─── Main PDF Generator ───────────────────────────────────────────────────────
export async function generateReferralPdf(data: ReferralPdfData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEADER
  // ═══════════════════════════════════════════════════════════════════════════

  // Top accent stripe
  doc.setFillColor(...CLR.primary);
  doc.rect(0, 0, PW, 2.5, 'F');

  // Left: Brand
  setF(doc, 18, 'bold');
  doc.setTextColor(...CLR.primary);
  doc.text('MOMternal', ML, 14);

  setF(doc, 7, 'normal');
  doc.setTextColor(...CLR.muted);
  doc.text('Maternal Health Nursing Assessment System', ML, 19);

  // Left: Document type badge
  const badgeTxt = 'REFERRAL DOCUMENT';
  setF(doc, 6.5, 'bold');
  doc.setFillColor(...CLR.primaryLt);
  const bw = doc.getTextWidth(badgeTxt) + 8;
  doc.roundedRect(ML, 22, bw, 5.5, 2.5, 2.5, 'F');
  doc.setTextColor(...CLR.primary);
  doc.text(badgeTxt, ML + 4, 25.5);

  // Right: Metadata — stacked neatly
  setF(doc, 7, 'normal');
  doc.setTextColor(...CLR.muted);
  doc.text(`Consultation No: ${data.consultationNo}`, PW - MR, 12, { align: 'right' });
  doc.text(fmtDate(data.consultationDate), PW - MR, 17, { align: 'right' });

  // Right: Priority badge — supports emergency, urgent, same_day, non_urgent
  if (data.referralPriority && data.referralPriority !== 'none') {
    const pLabel = data.referralPriority === 'emergency' ? 'EMERGENCY'
      : data.referralPriority === 'urgent' ? 'URGENT'
      : data.referralPriority === 'same_day' ? 'SAME DAY' : 'NON-URGENT';
    setF(doc, 6, 'bold');
    const pw2 = doc.getTextWidth(pLabel) + 8;
    const px = PW - MR - pw2;

    let pbg: C3;
    let pfg: C3;
    if (data.referralPriority === 'emergency' || data.referralPriority === 'urgent') {
      pbg = CLR.emergencyRedLt;
      pfg = CLR.emergencyRed;
    } else if (data.referralPriority === 'same_day') {
      pbg = CLR.amberLt;
      pfg = CLR.amber;
    } else {
      pbg = CLR.tealLt;
      pfg = CLR.teal;
    }

    doc.setFillColor(...pbg);
    doc.roundedRect(px, 22, pw2, 5.5, 2.5, 2.5, 'F');
    doc.setTextColor(...pfg);
    doc.text(pLabel, px + 4, 25.5);
  }

  // Header bottom line
  doc.setDrawColor(...CLR.divider);
  doc.setLineWidth(0.3);
  doc.line(ML, 30, PW - MR, 30);

  y = 36;

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. PATIENT INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  y = heading(doc, y, 'Patient Information');

  setF(doc, 11, 'bold');
  doc.setTextColor(...CLR.heading);
  doc.text(data.patientName || 'N/A', ML, y);
  y += 7;

  y = grid(doc, y, [
    { label: 'Patient ID', value: data.patientId || 'N/A' },
    { label: 'Date of Birth', value: fmtDate(data.patientDateOfBirth || '') },
    { label: 'Barangay', value: data.patientBarangay || '' },
    { label: 'Type of Visit', value: data.typeOfVisit || '' },
  ]);

  // OB History
  const ob: Array<{ label: string; value: string }> = [];
  if (data.gravida) ob.push({ label: 'Gravida', value: data.gravida });
  if (data.para) ob.push({ label: 'Para', value: data.para });
  if (data.lmp) ob.push({ label: 'LMP', value: fmtDate(data.lmp) });
  if (data.aog) ob.push({ label: 'AOG', value: data.aog });
  if (ob.length) y = grid(doc, y, ob);

  // Risk Level badge — MODERATE=brown, HIGH=red, LOW=green
  if (data.riskLevel && data.riskLevel.trim()) {
    y += 2;
    const rv = data.riskLevel.toUpperCase();
    const rcMap: Record<string, C3> = {
      HIGH: [185, 28, 28],
      MODERATE: [180, 83, 9],
      LOW: [5, 150, 105],
    };
    const rc = rcMap[rv] ?? CLR.label;
    const rlbl = `Risk Level: ${rv}`;
    setF(doc, 7, 'bold');
    const rbw = doc.getTextWidth(rlbl) + 14;

    y = pageBreak(doc, y, 10);
    doc.setFillColor(...rc);
    doc.roundedRect(ML, y, rbw, 6, 2, 2, 'F');
    setF(doc, 7.5, 'bold');
    doc.setTextColor(...CLR.white);
    doc.text(rlbl, ML + 7, y + 4);

    if (data.preventionLevel) {
      const pl = `(Prevention: ${data.preventionLevel.charAt(0).toUpperCase() + data.preventionLevel.slice(1)})`;
      setF(doc, 7, 'italic');
      doc.setTextColor(...CLR.muted);
      doc.text(pl, ML + rbw + 5, y + 4);
    }
    y += 10;
  }

  y += 3;

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. CLINICAL ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════
  if (present(data.chiefComplaint, data.bloodPressure, data.temperature, data.allergies, data.medications,
    data.respiratoryRate, data.heartRate, data.oxygenSat, data.painScale,
    data.fetalHeartRate, data.fundalHeight, data.weight, data.height, data.bmi)) {
    y = heading(doc, y, 'Clinical Assessment');

    y = kv(doc, y, 'Chief Complaint', data.chiefComplaint || '');
    y += 1;

    // Vitals grid
    const vitals: Array<{ label: string; value: string }> = [];
    if (data.bloodPressure) vitals.push({ label: 'Blood Pressure', value: data.bloodPressure });
    if (data.heartRate) vitals.push({ label: 'Heart Rate', value: `${data.heartRate} bpm` });
    if (data.temperature) vitals.push({ label: 'Temperature', value: `${data.temperature}\u00B0C` });
    if (data.respiratoryRate) vitals.push({ label: 'Resp. Rate', value: `${data.respiratoryRate} cpm` });
    if (data.oxygenSat) vitals.push({ label: 'O2 Saturation', value: `${data.oxygenSat}%` });
    if (data.painScale) vitals.push({ label: 'Pain Scale', value: `${data.painScale}/10` });
    if (data.fetalHeartRate) vitals.push({ label: 'Fetal Heart Rate', value: data.fetalHeartRate });
    if (data.fundalHeight) vitals.push({ label: 'Fundal Height', value: data.fundalHeight });
    if (data.weight) vitals.push({ label: 'Weight', value: `${data.weight} kg` });
    if (data.height) vitals.push({ label: 'Height', value: `${data.height} cm` });
    if (data.bmi) vitals.push({ label: 'BMI', value: data.bmi });
    if (vitals.length) y = grid(doc, y, vitals);

    y = kv(doc, y, 'Allergies', data.allergies || '');
    y = kv(doc, y, 'Current Medications', data.medications || '');
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. HEALTH HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  if (hasHH(data.healthHistory)) {
    y = heading(doc, y, 'Health History', CLR.teal);
    const hh = data.healthHistory!;

    if (data.healthHistoryRefCode) {
      y = pageBreak(doc, y, 6);
      setF(doc, 6.5, 'italic');
      doc.setTextColor(...CLR.teal);
      doc.text(`Reference: ${data.healthHistoryRefCode}`, ML + 3, y);
      y += 5;
    }

    if (present(hh.pastMedicalHistory, hh.previousSurgery, hh.historyOfTrauma, hh.historyOfBloodTransfusion)) {
      y = subHead(doc, y, 'Medical & Surgical History');
      y = kv(doc, y, 'Past Medical History', hh.pastMedicalHistory || '');
      y = kv(doc, y, 'Previous Surgery', hh.previousSurgery || '');
      y = kv(doc, y, 'History of Trauma', hh.historyOfTrauma || '');
      y = kv(doc, y, 'Blood Transfusion', hh.historyOfBloodTransfusion || '');
      y += 2;
    }

    if (present(hh.familyHistoryPaternal, hh.familyHistoryMaternal)) {
      y = subHead(doc, y, 'Family History');
      y = kv(doc, y, 'Paternal Side', hh.familyHistoryPaternal || '');
      y = kv(doc, y, 'Maternal Side', hh.familyHistoryMaternal || '');
      y += 2;
    }

    if (present(hh.smokingHistory, hh.alcoholIntake, hh.drugUse, hh.dietaryPattern, hh.physicalActivity, hh.sleepPattern)) {
      y = subHead(doc, y, 'Personal & Social History');
      y = grid(doc, y, [
        { label: 'Smoking', value: hh.smokingHistory || '' },
        { label: 'Alcohol', value: hh.alcoholIntake || '' },
        { label: 'Drug Use', value: hh.drugUse || '' },
        { label: 'Diet', value: hh.dietaryPattern || '' },
        { label: 'Physical Activity', value: hh.physicalActivity || '' },
        { label: 'Sleep Pattern', value: hh.sleepPattern || '' },
      ]);
    }

    if (present(hh.allergies, hh.currentMedications, hh.immunizationStatus, hh.mentalHealthHistory)) {
      y = subHead(doc, y, 'Additional Information');
      y = kv(doc, y, 'Known Allergies', hh.allergies || '');
      y = kv(doc, y, 'Current Medications', hh.currentMedications || '');
      y = kv(doc, y, 'Immunization Status', hh.immunizationStatus || '');
      y = kv(doc, y, 'Mental Health History', hh.mentalHealthHistory || '');
      y += 2;
    }
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. FINDINGS
  // ═══════════════════════════════════════════════════════════════════════════
  if (present(data.physicalExam, data.labResults, data.notes)) {
    y = heading(doc, y, 'Additional Findings');
    y = kv(doc, y, 'Physical Examination', data.physicalExam || '');
    y = kv(doc, y, 'Laboratory Results', data.labResults || '');
    y = kv(doc, y, 'Notes', data.notes || '');
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. DIAGNOSIS
  // ═══════════════════════════════════════════════════════════════════════════
  if (present(data.icd10Diagnosis, data.nandaDiagnosis, data.nandaRelatedTo, data.icd10AdditionalNotes)) {
    y = heading(doc, y, 'Diagnosis');

    if (data.nandaDiagnosis) {
      y = kv(doc, y, 'NANDA-I Diagnosis', data.nandaDiagnosis);
      if (data.nandaCode) {
        setF(doc, 6.5, 'italic');
        doc.setTextColor(...CLR.muted);
        doc.text(`(Code: ${data.nandaCode})`, ML + 3, y);
        y += 4.5;
      }
    }
    if (data.nandaRelatedTo) y = kv(doc, y, 'Related to', data.nandaRelatedTo);
    if (data.icd10Diagnosis) y = kv(doc, y, 'ICD-10 Diagnosis', data.icd10Diagnosis);
    if (data.icd10AdditionalNotes) y = kv(doc, y, 'Additional Notes', data.icd10AdditionalNotes);
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  6. AI SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const hasAi = present(data.aiRationale, data.aiPriorityIntervention, data.aiFollowUpSchedule, data.aiReferralReason)
    || (data.aiRiskIndicators?.length ?? 0) > 0
    || (data.aiNursingConsiderations?.length ?? 0) > 0;

  if (hasAi) {
    y = heading(doc, y, 'AI-Assisted Summary');

    if (data.aiRationale) {
      y = box(doc, y, 'Rationale', data.aiRationale, CLR.primaryLt, CLR.primary, CLR.primary);
    }

    if (data.aiRiskIndicators?.length) {
      y = list(doc, y, 'Risk Indicators:', data.aiRiskIndicators);
    }

    if (data.aiNursingConsiderations?.length) {
      y = list(doc, y, 'Nursing Considerations:', data.aiNursingConsiderations);
    }

    if (data.aiFollowUpSchedule) y = kv(doc, y, 'Follow-up Schedule', data.aiFollowUpSchedule);
    if (data.aiReferralNeeded && data.aiReferralReason) y = kv(doc, y, 'AI Referral Reason', data.aiReferralReason);
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  6b. PRIORITY INTERVENTION — Prominent amber box after AI Summary
  // ═══════════════════════════════════════════════════════════════════════════
  if (data.aiPriorityIntervention) {
    y = box(doc, y, 'Priority Intervention', data.aiPriorityIntervention, CLR.amberLt, CLR.amber, CLR.amber);
    y += 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  7. CARE PLAN
  // ═══════════════════════════════════════════════════════════════════════════
  if (data.interventions.length || present(data.evaluationNotes)) {
    y = heading(doc, y, 'Nursing Care Plan');

    if (data.interventions.length) {
      setF(doc, 8, 'bold');
      doc.setTextColor(...CLR.heading);
      doc.text(`Selected Interventions (${data.interventions.length}):`, ML, y);
      y += 5;

      data.interventions.forEach((intv, idx) => {
        y = pageBreak(doc, y, 10);
        setF(doc, 8, 'bold');
        doc.setTextColor(...CLR.heading);
        const code = intv.code ? `[${intv.code}] ` : '';
        doc.text(`${idx + 1}. ${code}${intv.name}`, ML, y);
        y += 4.5;

        if (intv.description) {
          setF(doc, 7.5, 'normal');
          doc.setTextColor(...CLR.body);
          const dl = doc.splitTextToSize(intv.description, CW - 6);
          doc.text(dl, ML + 3, y);
          y += dl.length * 3.5 + 1;
        }

        const ev = data.interventionEvals?.find(
          (e) => e.nicCode === intv.code || e.nicCode === String(intv.code),
        );
        if (ev) {
          const scMap: Record<string, C3> = { met: [5, 150, 105], partially_met: [180, 83, 9], unmet: [185, 28, 28] };
          const sl = ev.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          y += 1;
          setF(doc, 7, 'bold');
          doc.setTextColor(...(scMap[ev.status] ?? CLR.label));
          doc.text(`Status: ${sl}`, ML + 3, y);
          y += 4;
          if (ev.nocOutcome) {
            setF(doc, 7, 'normal');
            doc.setTextColor(...CLR.body);
            const nl = ev.nocOutcomeCode ? `NOC [${ev.nocOutcomeCode}]: ` : 'NOC Outcome: ';
            doc.text(nl + ev.nocOutcome, ML + 3, y);
            y += 4;
          }
          if (ev.notes) {
            setF(doc, 7, 'italic');
            doc.setTextColor(...CLR.muted);
            const enl = doc.splitTextToSize(ev.notes, CW - 12);
            doc.text(enl, ML + 3, y);
            y += enl.length * 3.2 + 1;
          }
        }
        y += 2.5;
      });
    }

    if (data.evaluationNotes) y = kv(doc, y, 'Overall Outcome Summary', data.evaluationNotes);
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  8. REFERRAL DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  y = heading(doc, y, 'Referral Details');
  y = kv(doc, y, 'Referral Type', data.referralType || 'Refer to Doctor');

  if (data.referralPriority && data.referralPriority !== 'none') {
    const pl = data.referralPriority === 'emergency' ? 'Emergency'
      : data.referralPriority === 'urgent' ? 'Urgent'
      : data.referralPriority === 'same_day' ? 'Same Day' : 'Non-urgent';
    y = kv(doc, y, 'Priority', pl);
  }
  y = kv(doc, y, 'Referred Facility', data.referralFacility || 'Not specified');
  y += 5;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SIGNATURES — Proper 2×2 bordered table
  // ═══════════════════════════════════════════════════════════════════════════
  y = pageBreak(doc, y, 52);

  // Thin separator line before signature section
  doc.setDrawColor(...CLR.divider);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
  y += 6;

  // "Prepared by:" label
  setF(doc, 8, 'bold');
  doc.setTextColor(...CLR.heading);
  doc.text('Prepared by:', ML, y);
  y += 5;

  // ── Signature table dimensions ──
  const sigTableW = CW;
  const sigCellW = 82;                   // each cell width
  const sigCellH = 18;                   // each cell height
  const sigGap = sigTableW - (sigCellW * 2); // gap between the two columns
  const sigBorderClr = [200, 200, 200] as const; // light gray borders

  // Outer container border
  doc.setDrawColor(...sigBorderClr);
  doc.setLineWidth(0.35);
  doc.rect(ML, y, sigTableW, sigCellH * 2);

  // Draw each of the 4 cells with borders
  // Row 1, Col 1 — Nurse Signature
  doc.rect(ML, y, sigCellW, sigCellH);
  setF(doc, 6.5, 'normal');
  doc.setTextColor(...CLR.muted);
  doc.text('Nurse Signature over Printed Name', ML + 3, y + sigCellH / 2 + 2.2);

  // Row 1, Col 2 — Date & Time
  doc.rect(ML + sigCellW, y, sigTableW - sigCellW, sigCellH);
  doc.text('Date & Time', ML + sigCellW + 3, y + sigCellH / 2 + 2.2);

  // Row 2, Col 1 — Receiving Physician Signature
  doc.rect(ML, y + sigCellH, sigCellW, sigCellH);
  doc.text('Receiving Physician Signature over Printed Name', ML + 3, y + sigCellH + sigCellH / 2 + 2.2);

  // Row 2, Col 2 — Date & Time
  doc.rect(ML + sigCellW, y + sigCellH, sigTableW - sigCellW, sigCellH);
  doc.text('Date & Time', ML + sigCellW + 3, y + sigCellH + sigCellH / 2 + 2.2);

  // ═══════════════════════════════════════════════════════════════════════════
  //  FOOTER — rendered on every page ONCE at the end
  // ═══════════════════════════════════════════════════════════════════════════
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    // Footer line
    doc.setDrawColor(...CLR.divider);
    doc.setLineWidth(0.2);
    doc.line(ML, FOOTER_Y, PW - MR, FOOTER_Y);

    // Brand
    setF(doc, 6, 'normal');
    doc.setTextColor(...CLR.muted);
    doc.text('MOMternal \u2014 Maternal Health Nursing Assessment System', ML, FOOTER_Y + 4);

    // Page number
    doc.text(`Page ${p} of ${total}`, PW - MR, FOOTER_Y + 4, { align: 'right' });

    // Confidentiality
    setF(doc, 4.5, 'italic');
    doc.setTextColor(...CLR.divider);
    doc.text('Auto-generated referral document. Confidential.', ML, FOOTER_Y + 7.5);
  }

  return doc.output('blob');
}
