import jsPDF from 'jspdf';

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFESSIONAL REFERRAL PDF — MOMternal
//  Design: Clean, minimal, well-spaced medical document
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Text Sanitizer — jsPDF Helvetica cannot render Unicode symbols ──────────
function sanitize(text: string): string {
  if (!text) return '';
  return text
    // Replace Unicode math/comparison symbols
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↔/g, '<->')
    .replace(/•/g, '-')
    .replace(/°/g, ' deg ')
    .replace(/±/g, '+/-')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/—/g, '--')
    .replace(/–/g, '-')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/…/g, '...')
    .replace(/\u200B/g, '')   // zero-width space
    .replace(/\u200C/g, '')   // zero-width non-joiner
    .replace(/\u200D/g, '')   // zero-width joiner
    .replace(/\u00A0/g, ' ')  // non-breaking space
    .replace(/\u202F/g, ' ')  // narrow no-break space
    .replace(/\u205F/g, ' ')  // medium mathematical space
    .replace(/\u3000/g, ' ')  // ideographic space
    .replace(/[^\x00-\x7F]/g, (ch) => {
      // Map common Latin extended characters to ASCII
      const map: Record<string, string> = {
        '\u00C0': 'A', '\u00C1': 'A', '\u00C2': 'A', '\u00C3': 'A', '\u00C4': 'A', '\u00C5': 'A',
        '\u00E0': 'a', '\u00E1': 'a', '\u00E2': 'a', '\u00E3': 'a', '\u00E4': 'a', '\u00E5': 'a',
        '\u00C8': 'E', '\u00C9': 'E', '\u00CA': 'E', '\u00CB': 'E',
        '\u00E8': 'e', '\u00E9': 'e', '\u00EA': 'e', '\u00EB': 'e',
        '\u00CC': 'I', '\u00CD': 'I', '\u00CE': 'I', '\u00CF': 'I',
        '\u00EC': 'i', '\u00ED': 'i', '\u00EE': 'i', '\u00EF': 'i',
        '\u00D2': 'O', '\u00D3': 'O', '\u00D4': 'O', '\u00D5': 'O', '\u00D6': 'O',
        '\u00F2': 'o', '\u00F3': 'o', '\u00F4': 'o', '\u00F5': 'o', '\u00F6': 'o',
        '\u00D9': 'U', '\u00DA': 'U', '\u00DB': 'U', '\u00DC': 'U',
        '\u00F9': 'u', '\u00FA': 'u', '\u00FB': 'u', '\u00FC': 'u',
        '\u00D1': 'N', '\u00F1': 'n',
        '\u00C7': 'C', '\u00E7': 'c',
        '\u00DF': 'ss',
      };
      return map[ch] || '?';
    });
}

// ─── Color System ────────────────────────────────────────────────────────────
const CLR = {
  primary:    [190, 30, 45]  as const,
  primaryLt:  [253, 237, 237] as const,
  teal:       [15, 118, 110] as const,
  tealLt:     [224, 247, 245] as const,
  amber:      [180, 83, 9]   as const,
  amberLt:    [254, 243, 199] as const,
  heading:    [31, 41, 55]   as const,
  body:       [55, 65, 81]   as const,
  label:      [100, 116, 139] as const,
  muted:      [148, 163, 184] as const,
  divider:    [226, 232, 240] as const,
  white:      [255, 255, 255] as const,
  pageBg:     [248, 250, 252] as const,
  emergencyRed: [220, 38, 38] as const,
  emergencyRedLt: [254, 226, 226] as const,
};

type C3 = readonly [number, number, number];

// ─── Page Geometry (A4 portrait) ─────────────────────────────────────────────
const PW  = 210;
const PH  = 297;
const ML  = 20;
const MR  = 20;
const CW  = PW - ML - MR;
const FOOTER_Y = PH - 15;

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

// ─── Page Break ──────────────────────────────────────────────────────────────
function pageBreak(doc: jsPDF, y: number, need: number): number {
  if (y + need > FOOTER_Y - 8) {
    doc.addPage();
    return 22;
  }
  return y;
}

// ─── Layout Primitives ────────────────────────────────────────────────────────

/** Section heading with colored accent bar */
function sectionHeading(doc: jsPDF, y: number, text: string, accent: C3 = CLR.primary): number {
  y = pageBreak(doc, y, 20);

  // Small colored bar before heading text
  doc.setFillColor(...accent);
  doc.rect(ML, y - 3, 3, 8, 'F');

  setF(doc, 10, 'bold');
  doc.setTextColor(...accent);
  doc.text(sanitize(text.toUpperCase()), ML + 6, y + 2.5);

  // Thin separator line
  y += 6;
  doc.setDrawColor(...CLR.divider);
  doc.setLineWidth(0.25);
  doc.line(ML, y, PW - MR, y);
  return y + 8;
}

/** Sub-section heading */
function subHead(doc: jsPDF, y: number, text: string): number {
  y = pageBreak(doc, y, 10);
  setF(doc, 8, 'bold');
  doc.setTextColor(...CLR.heading);
  doc.text(sanitize(text), ML + 4, y);
  return y + 5;
}

/** Label: Value row */
function kv(doc: jsPDF, y: number, label: string, value: string): number {
  if (!value || value.trim() === '' || value.trim() === 'N/A') return y;
  y = pageBreak(doc, y, 6);
  setF(doc, 7.5, 'bold');
  doc.setTextColor(...CLR.label);
  const lt = sanitize(`${label}: `);
  const lw = doc.getTextWidth(lt);
  doc.text(lt, ML, y);
  setF(doc, 7.5, 'normal');
  doc.setTextColor(...CLR.body);
  const cleanVal = sanitize(value);
  const lines = doc.splitTextToSize(cleanVal, CW - lw - 2);
  doc.text(lines, ML + lw, y);
  return y + lines.length * 4 + 2;
}

/**
 * Two-column grid
 */
function grid(
  doc: jsPDF, y: number,
  pairs: Array<{ label: string; value: string }>,
  cols = 2,
): number {
  const items = pairs.filter((p) => p.value && p.value.trim() !== '' && p.value.trim() !== 'N/A');
  if (!items.length) return y;

  const colW = CW / cols;

  for (let i = 0; i < items.length; i += cols) {
    const rowItems = items.slice(i, i + cols);
    y = pageBreak(doc, y, 8);
    if (i > 0) y += 2;

    let maxLines = 1;

    // Measure all cells
    rowItems.forEach((item, col) => {
      const x = ML + col * colW;
      setF(doc, 7.5, 'bold');
      const lt = sanitize(`${item.label}: `);
      const lw = doc.getTextWidth(lt);
      setF(doc, 7.5, 'normal');
      const valW = colW - lw - 4;
      const cleanVal = sanitize(item.value);
      const lines = doc.splitTextToSize(cleanVal, Math.max(valW, 15));
      (item as any).__lines = lines;
      (item as any).__lw = lw;
      (item as any).__x = x;
      if (lines.length > maxLines) maxLines = lines.length;
    });

    // Draw cells
    rowItems.forEach((item: any) => {
      setF(doc, 7.5, 'bold');
      doc.setTextColor(...CLR.label);
      doc.text(sanitize(`${item.label}: `), item.__x, y);
      setF(doc, 7.5, 'normal');
      doc.setTextColor(...CLR.body);
      doc.text(item.__lines, item.__x + item.__lw, y);
    });

    y += maxLines * 4 + 2;
  }

  return y + 3;
}

/** Colored info box */
function infoBox(
  doc: jsPDF, y: number, title: string, body: string,
  bg: C3, fg: C3, tf: C3,
): number {
  const cleanBody = sanitize(body);
  setF(doc, 7, 'normal');
  const bodyL = doc.splitTextToSize(cleanBody, CW - 16);
  setF(doc, 7, 'bold');
  const padTop = 7;
  const padBot = 6;
  const titleH = 5;
  const boxH = padTop + titleH + bodyL.length * 3.3 + padBot;

  y = pageBreak(doc, y, boxH + 2);
  doc.setFillColor(...bg);
  doc.roundedRect(ML, y, CW, boxH, 2, 2, 'F');

  let cy = y + padTop + 2;
  setF(doc, 7.5, 'bold');
  doc.setTextColor(...tf);
  doc.text(sanitize(title), ML + 6, cy);
  cy += titleH;

  setF(doc, 7, 'normal');
  doc.setTextColor(...fg);
  doc.text(bodyL, ML + 6, cy);

  return y + boxH + 5;
}

/** Bullet list with proper spacing */
function bulletList(doc: jsPDF, y: number, title: string, items: string[]): number {
  if (!items.length) return y;
  y = pageBreak(doc, y, 8);
  setF(doc, 7.5, 'bold');
  doc.setTextColor(...CLR.heading);
  doc.text(sanitize(title), ML, y);
  y += 5;

  items.forEach((item) => {
    y = pageBreak(doc, y, 5);
    const cleanItem = sanitize(item);
    setF(doc, 7, 'normal');
    doc.setTextColor(...CLR.body);
    const bulletText = `- ${cleanItem}`;
    const lines = doc.splitTextToSize(bulletText, CW - 6);
    lines.forEach((line: string) => {
      y = pageBreak(doc, y, 4);
      doc.text(line, ML + 4, y);
      y += 3.5;
    });
    y += 1;
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

  // Top accent bar
  doc.setFillColor(...CLR.primary);
  doc.rect(0, 0, PW, 3, 'F');

  // Brand name
  setF(doc, 20, 'bold');
  doc.setTextColor(...CLR.primary);
  doc.text('MOMternal', ML, 16);

  setF(doc, 7.5, 'normal');
  doc.setTextColor(...CLR.muted);
  doc.text('Maternal Health Nursing Assessment System', ML, 21);

  // Document type badge
  const badgeTxt = 'REFERRAL DOCUMENT';
  setF(doc, 6.5, 'bold');
  doc.setFillColor(...CLR.primaryLt);
  const bw = doc.getTextWidth(badgeTxt) + 10;
  doc.roundedRect(ML, 24, bw, 6, 3, 3, 'F');
  doc.setTextColor(...CLR.primary);
  doc.text(badgeTxt, ML + 5, 27.8);

  // Right side metadata
  setF(doc, 7.5, 'normal');
  doc.setTextColor(...CLR.body);
  doc.text(`Consultation No: ${sanitize(data.consultationNo)}`, PW - MR, 14, { align: 'right' });
  doc.text(fmtDate(data.consultationDate), PW - MR, 19, { align: 'right' });

  // Priority badge
  if (data.referralPriority && data.referralPriority !== 'none') {
    const pLabel = data.referralPriority === 'emergency' ? 'EMERGENCY'
      : data.referralPriority === 'urgent' ? 'URGENT'
      : data.referralPriority === 'same_day' ? 'SAME DAY' : 'NON-URGENT';
    setF(doc, 6.5, 'bold');
    const pw2 = doc.getTextWidth(pLabel) + 10;
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
    doc.roundedRect(px, 24, pw2, 6, 3, 3, 'F');
    doc.setTextColor(...pfg);
    doc.text(pLabel, px + 5, 27.8);
  }

  // Header bottom divider
  doc.setDrawColor(...CLR.divider);
  doc.setLineWidth(0.3);
  doc.line(ML, 33, PW - MR, 33);

  y = 39;

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. PATIENT INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  y = sectionHeading(doc, y, 'Patient Information');

  // Patient name - prominent
  setF(doc, 12, 'bold');
  doc.setTextColor(...CLR.heading);
  doc.text(sanitize(data.patientName || 'N/A'), ML, y);
  y += 8;

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

  // Risk Level badge
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
    setF(doc, 7.5, 'bold');
    const rbw = doc.getTextWidth(rlbl) + 16;

    y = pageBreak(doc, y, 11);
    doc.setFillColor(...rc);
    doc.roundedRect(ML, y, rbw, 7, 2, 2, 'F');
    setF(doc, 8, 'bold');
    doc.setTextColor(...CLR.white);
    doc.text(rlbl, ML + 8, y + 4.8);

    if (data.preventionLevel) {
      const pl = `(Prevention: ${data.preventionLevel.charAt(0).toUpperCase() + data.preventionLevel.slice(1)})`;
      setF(doc, 7.5, 'italic');
      doc.setTextColor(...CLR.muted);
      doc.text(pl, ML + rbw + 5, y + 4.8);
    }
    y += 12;
  }

  y += 4;

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. CLINICAL ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════
  if (present(data.chiefComplaint, data.bloodPressure, data.temperature, data.allergies, data.medications,
    data.respiratoryRate, data.heartRate, data.oxygenSat, data.painScale,
    data.fetalHeartRate, data.fundalHeight, data.weight, data.height, data.bmi)) {
    y = sectionHeading(doc, y, 'Clinical Assessment');

    if (data.chiefComplaint) {
      y = kv(doc, y, 'Chief Complaint', data.chiefComplaint);
      y += 2;
    }

    // Vitals grid - 3 columns for compact but readable layout
    const vitals: Array<{ label: string; value: string }> = [];
    if (data.bloodPressure) vitals.push({ label: 'Blood Pressure', value: data.bloodPressure });
    if (data.heartRate) vitals.push({ label: 'Heart Rate', value: `${data.heartRate} bpm` });
    if (data.temperature) vitals.push({ label: 'Temperature', value: `${data.temperature} deg C` });
    if (data.respiratoryRate) vitals.push({ label: 'Resp. Rate', value: `${data.respiratoryRate} cpm` });
    if (data.oxygenSat) vitals.push({ label: 'O2 Saturation', value: `${data.oxygenSat}%` });
    if (data.painScale) vitals.push({ label: 'Pain Scale', value: `${data.painScale}/10` });
    if (data.fetalHeartRate) vitals.push({ label: 'Fetal Heart Rate', value: data.fetalHeartRate });
    if (data.fundalHeight) vitals.push({ label: 'Fundal Height', value: data.fundalHeight });
    if (data.weight) vitals.push({ label: 'Weight', value: `${data.weight} kg` });
    if (data.height) vitals.push({ label: 'Height', value: `${data.height} cm` });
    if (data.bmi) vitals.push({ label: 'BMI', value: data.bmi });
    if (vitals.length) y = grid(doc, y, vitals, 3);

    y = kv(doc, y, 'Allergies', data.allergies || '');
    y = kv(doc, y, 'Current Medications', data.medications || '');
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. HEALTH HISTORY
  // ═══════════════════════════════════════════════════════════════════════════
  if (hasHH(data.healthHistory)) {
    y = sectionHeading(doc, y, 'Health History', CLR.teal);
    const hh = data.healthHistory!;

    if (data.healthHistoryRefCode) {
      y = pageBreak(doc, y, 6);
      setF(doc, 6.5, 'italic');
      doc.setTextColor(...CLR.teal);
      doc.text(sanitize(`Reference: ${data.healthHistoryRefCode}`), ML + 4, y);
      y += 5;
    }

    if (present(hh.pastMedicalHistory, hh.previousSurgery, hh.historyOfTrauma, hh.historyOfBloodTransfusion)) {
      y = subHead(doc, y, 'Medical & Surgical History');
      y = kv(doc, y, 'Past Medical History', hh.pastMedicalHistory || '');
      y = kv(doc, y, 'Previous Surgery', hh.previousSurgery || '');
      y = kv(doc, y, 'History of Trauma', hh.historyOfTrauma || '');
      y = kv(doc, y, 'Blood Transfusion', hh.historyOfBloodTransfusion || '');
      y += 3;
    }

    if (present(hh.familyHistoryPaternal, hh.familyHistoryMaternal)) {
      y = subHead(doc, y, 'Family History');
      y = kv(doc, y, 'Paternal Side', hh.familyHistoryPaternal || '');
      y = kv(doc, y, 'Maternal Side', hh.familyHistoryMaternal || '');
      y += 3;
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
      y += 3;
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. FINDINGS
  // ═══════════════════════════════════════════════════════════════════════════
  if (present(data.physicalExam, data.labResults, data.notes)) {
    y = sectionHeading(doc, y, 'Additional Findings');
    y = kv(doc, y, 'Physical Examination', data.physicalExam || '');
    y = kv(doc, y, 'Laboratory Results', data.labResults || '');
    y = kv(doc, y, 'Notes', data.notes || '');
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. DIAGNOSIS
  // ═══════════════════════════════════════════════════════════════════════════
  if (present(data.icd10Diagnosis, data.nandaDiagnosis, data.nandaRelatedTo, data.icd10AdditionalNotes)) {
    y = sectionHeading(doc, y, 'Diagnosis');

    if (data.nandaDiagnosis) {
      y = kv(doc, y, 'NANDA-I Diagnosis', data.nandaDiagnosis);
      if (data.nandaCode) {
        setF(doc, 6.5, 'italic');
        doc.setTextColor(...CLR.muted);
        doc.text(sanitize(`(Code: ${data.nandaCode})`), ML + 4, y);
        y += 5;
      }
    }
    if (data.nandaRelatedTo) y = kv(doc, y, 'Related to', data.nandaRelatedTo);
    if (data.icd10Diagnosis) y = kv(doc, y, 'ICD-10 Diagnosis', data.icd10Diagnosis);
    if (data.icd10AdditionalNotes) y = kv(doc, y, 'Additional Notes', data.icd10AdditionalNotes);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  6. AI SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const hasAi = present(data.aiRationale, data.aiPriorityIntervention, data.aiFollowUpSchedule, data.aiReferralReason)
    || (data.aiRiskIndicators?.length ?? 0) > 0
    || (data.aiNursingConsiderations?.length ?? 0) > 0;

  if (hasAi) {
    y = sectionHeading(doc, y, 'AI-Assisted Summary');

    if (data.aiRationale) {
      y = infoBox(doc, y, 'Rationale', data.aiRationale, CLR.primaryLt, CLR.primary, CLR.primary);
    }

    if (data.aiRiskIndicators?.length) {
      y = bulletList(doc, y, 'Risk Indicators:', data.aiRiskIndicators);
    }

    if (data.aiNursingConsiderations?.length) {
      y = bulletList(doc, y, 'Nursing Considerations:', data.aiNursingConsiderations);
    }

    if (data.aiFollowUpSchedule) y = kv(doc, y, 'Follow-up Schedule', data.aiFollowUpSchedule);
    if (data.aiReferralNeeded && data.aiReferralReason) y = kv(doc, y, 'AI Referral Reason', data.aiReferralReason);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  6b. PRIORITY INTERVENTION
  // ═══════════════════════════════════════════════════════════════════════════
  if (data.aiPriorityIntervention) {
    y = infoBox(doc, y, 'Priority Intervention', data.aiPriorityIntervention, CLR.amberLt, CLR.amber, CLR.amber);
    y += 2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  7. CARE PLAN
  // ═══════════════════════════════════════════════════════════════════════════
  if (data.interventions.length || present(data.evaluationNotes)) {
    y = sectionHeading(doc, y, 'Nursing Care Plan');

    if (data.interventions.length) {
      setF(doc, 8, 'bold');
      doc.setTextColor(...CLR.heading);
      doc.text(sanitize(`Selected Interventions (${data.interventions.length}):`), ML, y);
      y += 6;

      data.interventions.forEach((intv, idx) => {
        y = pageBreak(doc, y, 10);
        setF(doc, 7.5, 'bold');
        doc.setTextColor(...CLR.heading);
        const code = intv.code ? `[${sanitize(intv.code)}] ` : '';
        doc.text(sanitize(`${idx + 1}. ${code}${intv.name}`), ML, y);
        y += 5;

        if (intv.description) {
          setF(doc, 7, 'normal');
          doc.setTextColor(...CLR.body);
          const dl = doc.splitTextToSize(sanitize(intv.description), CW - 8);
          doc.text(dl, ML + 4, y);
          y += dl.length * 3.3 + 2;
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
          doc.text(sanitize(`Status: ${sl}`), ML + 4, y);
          y += 4;
          if (ev.nocOutcome) {
            setF(doc, 7, 'normal');
            doc.setTextColor(...CLR.body);
            const nl = ev.nocOutcomeCode ? `NOC [${sanitize(ev.nocOutcomeCode)}]: ` : 'NOC Outcome: ';
            doc.text(sanitize(nl + ev.nocOutcome), ML + 4, y);
            y += 4;
          }
          if (ev.notes) {
            setF(doc, 7, 'italic');
            doc.setTextColor(...CLR.muted);
            const enl = doc.splitTextToSize(sanitize(ev.notes), CW - 14);
            doc.text(enl, ML + 4, y);
            y += enl.length * 3.2 + 2;
          }
        }
        y += 3;
      });
    }

    if (data.evaluationNotes) y = kv(doc, y, 'Overall Outcome Summary', data.evaluationNotes);
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  8. REFERRAL DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  y = sectionHeading(doc, y, 'Referral Details');

  // Referral info in a clean box
  const refType = data.referralType || 'Refer to Doctor';
  const refPriority = data.referralPriority && data.referralPriority !== 'none'
    ? (data.referralPriority === 'emergency' ? 'Emergency'
       : data.referralPriority === 'urgent' ? 'Urgent'
       : data.referralPriority === 'same_day' ? 'Same Day' : 'Non-urgent')
    : '';
  const refFacility = data.referralFacility || 'Not specified';

  // Light background box for referral details
  y = pageBreak(doc, y, 16);
  const refBoxH = refPriority ? 16 : 10;
  doc.setFillColor(...CLR.tealLt);
  doc.roundedRect(ML, y, CW, refBoxH, 2, 2, 'F');

  let ry = y + 7;
  setF(doc, 7.5, 'bold');
  doc.setTextColor(...CLR.teal);
  doc.text(sanitize(`Referral Type: ${refType}`), ML + 6, ry);

  if (refPriority) {
    setF(doc, 7.5, 'normal');
    doc.setTextColor(...CLR.body);
    doc.text(sanitize(`Priority: ${refPriority}`), ML + 6, ry + 5);
  }

  // Facility on right side
  setF(doc, 7.5, 'normal');
  doc.setTextColor(...CLR.body);
  doc.text(sanitize(`Facility: ${refFacility}`), PW - MR - 2, ry, { align: 'right' });

  y += refBoxH + 8;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SIGNATURES
  // ═══════════════════════════════════════════════════════════════════════════
  y = pageBreak(doc, y, 55);

  // Separator before signatures
  doc.setDrawColor(...CLR.divider);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
  y += 6;

  setF(doc, 8, 'bold');
  doc.setTextColor(...CLR.heading);
  doc.text('Prepared by:', ML, y);
  y += 6;

  // Signature table
  const sigCellW = (CW - 4) / 2;
  const sigRowH = 20;
  const sigBorderColor = [180, 180, 180] as const;

  doc.setDrawColor(...sigBorderColor);
  doc.setLineWidth(0.3);

  // Row 1
  doc.rect(ML, y, sigCellW, sigRowH);
  doc.rect(ML + sigCellW + 4, y, sigCellW, sigRowH);

  setF(doc, 6.5, 'normal');
  doc.setTextColor(...CLR.muted);
  doc.text('Nurse Signature over Printed Name', ML + 3, y + sigRowH / 2 + 2);
  doc.text('Date & Time', ML + sigCellW + 7, y + sigRowH / 2 + 2);

  // Row 2
  doc.rect(ML, y + sigRowH, sigCellW, sigRowH);
  doc.rect(ML + sigCellW + 4, y + sigRowH, sigCellW, sigRowH);

  doc.text('Receiving Physician Signature over Printed Name', ML + 3, y + sigRowH + sigRowH / 2 + 2);
  doc.text('Date & Time', ML + sigCellW + 7, y + sigRowH + sigRowH / 2 + 2);

  // ═══════════════════════════════════════════════════════════════════════════
  //  FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    doc.setDrawColor(...CLR.divider);
    doc.setLineWidth(0.2);
    doc.line(ML, FOOTER_Y, PW - MR, FOOTER_Y);

    setF(doc, 6, 'normal');
    doc.setTextColor(...CLR.muted);
    doc.text('MOMternal -- Maternal Health Nursing Assessment System', ML, FOOTER_Y + 4);
    doc.text(`Page ${p} of ${total}`, PW - MR, FOOTER_Y + 4, { align: 'right' });

    setF(doc, 4.5, 'italic');
    doc.setTextColor(...CLR.divider);
    doc.text('Auto-generated referral document. Confidential.', ML, FOOTER_Y + 7.5);
  }

  return doc.output('blob');
}
