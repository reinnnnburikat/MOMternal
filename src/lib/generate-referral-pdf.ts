import jsPDF from 'jspdf';

// ─── Soft, Minimal Color Palette ───────────────────────────────────────────
const C = {
  rose:       [211, 47, 47]   as const,  // muted rose
  roseLight:  [253, 237, 237] as const,  // very soft rose
  roseMid:    [244, 204, 204] as const,  // soft rose
  teal:       [38, 166, 154]  as const,  // soft teal
  tealLight:  [224, 247, 245] as const,  // very soft teal
  text:       [55, 65, 81]    as const,  // soft dark (gray-700)
  textLight:  [107, 114, 128] as const,  // gray-500
  textMuted:  [156, 163, 175] as const,  // gray-400
  border:     [229, 231, 235] as const,  // gray-200
  white:      [255, 255, 255] as const,
  bg:         [249, 250, 251] as const,  // gray-50
};

type RGB = readonly [number, number, number];

// ─── A4 Page Constants ─────────────────────────────────────────────────────
const PW = 210;                                   // page width mm
const PH = 297;                                   // page height mm
const ML = 20;                                    // margin left
const MR = 20;                                    // margin right
const CW = PW - ML - MR;                          // content width = 170
const FOOTER_ZONE = PH - 16;                      // footer starts here = 281

// ─── Types ─────────────────────────────────────────────────────────────────
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

// ─── Utility ───────────────────────────────────────────────────────────────
function font(doc: jsPDF, size: number, style: 'normal' | 'bold' | 'italic' = 'normal') {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
}

function rgb(c: RGB): string {
  return `${c[0]},${c[1]},${c[2]}`;
}

/** Format ISO date string to readable format */
function fmtDate(raw: string): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return raw;
  }
}

function isPresent(...vals: (string | undefined | null)[]): boolean {
  return vals.some((v) => v && v.trim() !== '');
}

function hasHH(hh: ReferralPdfData['healthHistory']): boolean {
  if (!hh) return false;
  return isPresent(
    hh.pastMedicalHistory, hh.previousSurgery, hh.historyOfTrauma,
    hh.historyOfBloodTransfusion, hh.familyHistoryPaternal, hh.familyHistoryMaternal,
    hh.smokingHistory, hh.alcoholIntake, hh.drugUse, hh.dietaryPattern,
    hh.physicalActivity, hh.sleepPattern, hh.allergies, hh.currentMedications,
    hh.immunizationStatus, hh.mentalHealthHistory,
  );
}

// ─── Page Break Helper ─────────────────────────────────────────────────────
function need(doc: jsPDF, y: number, h: number): number {
  if (y + h > FOOTER_ZONE - 4) {
    doc.addPage();
    return 22;
  }
  return y;
}

// ─── Drawing Primitives (minimal, soft) ────────────────────────────────────

/** Thin section divider + title */
function sectionTitle(doc: jsPDF, y: number, text: string, accent: RGB = C.rose): number {
  y = need(doc, y, 14);
  font(doc, 9.5, 'bold');
  doc.setTextColor(...accent);
  doc.text(text.toUpperCase(), ML, y);
  // thin underline
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.35);
  const tw = doc.getTextWidth(text.toUpperCase());
  doc.line(ML, y + 1.5, ML + tw, y + 1.5);
  return y + 7;
}

/** Sub-section title */
function subTitle(doc: jsPDF, y: number, text: string): number {
  y = need(doc, y, 10);
  font(doc, 8, 'bold');
  doc.setTextColor(...C.text);
  doc.text(text, ML + 4, y);
  return y + 5;
}

/** Label: value — single row, returns y after */
function field(doc: jsPDF, y: number, label: string, value: string): number {
  if (!value || value.trim() === '' || value.trim() === 'N/A') return y;
  y = need(doc, y, 6);
  font(doc, 8, 'normal');
  doc.setTextColor(...C.textLight);
  const lt = `${label}: `;
  const lw = doc.getTextWidth(lt);
  doc.text(lt, ML, y);
  doc.setTextColor(...C.text);
  const maxW = CW - lw;
  const lines = doc.splitTextToSize(value, maxW);
  doc.text(lines, ML + lw, y);
  return y + lines.length * 4 + 1;
}

/** Soft info box with rounded corners */
function infoBox(
  doc: jsPDF, y: number, title: string, body: string,
  bg: RGB, fg: RGB, titleFg: RGB,
): number {
  font(doc, 7.5, 'normal');
  const bodyLines = doc.splitTextToSize(body, CW - 16);
  const boxH = 8 + bodyLines.length * 3.6 + 4;
  y = need(doc, y, boxH + 4);
  doc.setFillColor(...bg);
  doc.roundedRect(ML, y, CW, boxH, 2, 2, 'F');
  let cy = y + 5;
  font(doc, 7.5, 'bold');
  doc.setTextColor(...titleFg);
  doc.text(title, ML + 6, cy);
  cy += 4;
  font(doc, 7.5, 'normal');
  doc.setTextColor(...fg);
  doc.text(bodyLines, ML + 6, cy);
  return y + boxH + 4;
}

/** Bullet list */
function bullets(doc: jsPDF, y: number, title: string, items: string[]): number {
  if (!items.length) return y;
  y = need(doc, y, 8);
  font(doc, 8, 'bold');
  doc.setTextColor(...C.text);
  doc.text(title, ML, y);
  y += 4.5;
  items.forEach((item) => {
    y = need(doc, y, 5);
    font(doc, 7.5, 'normal');
    doc.setTextColor(...C.textLight);
    doc.text(`  \u2022  ${item}`, ML + 2, y);
    y += 3.8;
  });
  return y + 2;
}

/** Two-column key-value pairs — safe wrapping, no overlap */
function grid2(
  doc: jsPDF, y: number,
  pairs: Array<{ label: string; value: string }>,
): number {
  const items = pairs.filter((p) => p.value && p.value.trim() !== '' && p.value.trim() !== 'N/A');
  if (!items.length) return y;

  const halfW = CW / 2 - 4;
  items.forEach((item, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    if (col === 0) y = need(doc, y, 7);
    if (row > 0 && col === 0) y += 1;

    const x = ML + col * (halfW + 8);

    font(doc, 8, 'bold');
    doc.setTextColor(...C.textLight);
    const lt = `${item.label}: `;
    const lw = doc.getTextWidth(lt);
    doc.text(lt, x, y);

    font(doc, 8, 'normal');
    doc.setTextColor(...C.text);
    const valMaxW = halfW - lw;
    const valLines = doc.splitTextToSize(item.value, Math.max(valMaxW, 20));
    doc.text(valLines, x + lw, y);
  });

  return y + 5;
}

// ─── Main PDF Generator ────────────────────────────────────────────────────
export async function generateReferralPdf(data: ReferralPdfData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 0;

  // ══════════════════════════════════════════════════════════════════════════
  //  HEADER — Soft, minimal banner
  // ══════════════════════════════════════════════════════════════════════════
  // Soft rose top bar
  doc.setFillColor(...C.rose);
  doc.rect(0, 0, PW, 3, 'F');

  // Clean white header area
  const headerTop = 3;
  const headerH = 32;

  // Logo text — left aligned, clean typography
  font(doc, 20, 'bold');
  doc.setTextColor(...C.rose);
  doc.text('MOMternal', ML, headerTop + 12);

  font(doc, 7.5, 'normal');
  doc.setTextColor(...C.textMuted);
  doc.text('Maternal Health Nursing Assessment System', ML, headerTop + 18);

  // "Referral Document" pill badge
  const pillText = 'REFERRAL DOCUMENT';
  font(doc, 7, 'bold');
  const pillW = doc.getTextWidth(pillText) + 10;
  doc.setFillColor(...C.roseLight);
  doc.roundedRect(ML, headerTop + 21, pillW, 6, 3, 3, 'F');
  doc.setTextColor(...C.rose);
  doc.text(pillText, ML + 5, headerTop + 25);

  // Right side metadata
  font(doc, 7, 'normal');
  doc.setTextColor(...C.textMuted);
  doc.text(`Consultation No: ${data.consultationNo}`, PW - MR, headerTop + 10, { align: 'right' });
  doc.text(fmtDate(data.consultationDate), PW - MR, headerTop + 16, { align: 'right' });

  // Priority pill (right)
  if (data.referralPriority && data.referralPriority !== 'none') {
    const prioLabel =
      data.referralPriority === 'urgent' ? 'URGENT'
        : data.referralPriority === 'same_day' ? 'SAME DAY'
          : 'NON-URGENT';
    font(doc, 6.5, 'bold');
    const pw2 = doc.getTextWidth(prioLabel) + 8;
    const px = PW - MR - pw2;
    const prioBg = data.referralPriority === 'urgent'
      ? [254, 226, 226] as const
      : [236, 253, 245] as const;
    const prioFg = data.referralPriority === 'urgent'
      ? C.rose
      : C.teal;
    doc.setFillColor(prioBg[0], prioBg[1], prioBg[2]);
    doc.roundedRect(px, headerTop + 21, pw2, 6, 3, 3, 'F');
    doc.setTextColor(prioFg[0], prioFg[1], prioFg[2]);
    doc.text(prioLabel, px + 4, headerTop + 25);
  }

  // Thin separator line
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(ML, headerTop + headerH, PW - MR, headerTop + headerH);

  y = headerTop + headerH + 6;

  // ══════════════════════════════════════════════════════════════════════════
  //  1. PATIENT INFORMATION
  // ══════════════════════════════════════════════════════════════════════════
  y = sectionTitle(doc, y, 'Patient Information');

  font(doc, 11, 'bold');
  doc.setTextColor(...C.text);
  doc.text(data.patientName || 'N/A', ML, y);
  y += 6;

  y = grid2(doc, y, [
    { label: 'Patient ID', value: data.patientId || 'N/A' },
    { label: 'Date of Birth', value: fmtDate(data.patientDateOfBirth || '') },
    { label: 'Barangay', value: data.patientBarangay || '' },
    { label: 'Type of Visit', value: data.typeOfVisit || '' },
  ]);

  // OB fields
  const ob: Array<{ label: string; value: string }> = [];
  if (data.gravida) ob.push({ label: 'Gravida', value: data.gravida });
  if (data.para) ob.push({ label: 'Para', value: data.para });
  if (data.lmp) ob.push({ label: 'LMP', value: fmtDate(data.lmp) });
  if (data.aog) ob.push({ label: 'AOG', value: data.aog });
  if (ob.length) y = grid2(doc, y, ob);

  // Risk badge
  if (data.riskLevel && data.riskLevel.trim()) {
    const rv = data.riskLevel.toUpperCase();
    const rc: Record<string, RGB> = {
      HIGH: [185, 28, 28],
      MODERATE: [217, 119, 6],
      LOW: [5, 150, 105],
    };
    const color = rc[rv] ?? C.textLight;
    const label = `Risk Level: ${rv}`;
    y = need(doc, y, 9);
    const bw = doc.getTextWidth(label) + 12;
    doc.setFillColor(...color);
    doc.roundedRect(ML, y - 3, bw, 6.5, 2, 2, 'F');
    font(doc, 7.5, 'bold');
    doc.setTextColor(...C.white);
    doc.text(label, ML + 6, y + 1);

    if (data.preventionLevel) {
      const pl = `(Prevention: ${data.preventionLevel.charAt(0).toUpperCase() + data.preventionLevel.slice(1)})`;
      font(doc, 7, 'italic');
      doc.setTextColor(...C.textMuted);
      doc.text(pl, ML + bw + 4, y + 1);
    }
    y += 7;
  }

  y += 2;

  // ══════════════════════════════════════════════════════════════════════════
  //  2. CLINICAL ASSESSMENT
  // ══════════════════════════════════════════════════════════════════════════
  if (isPresent(data.chiefComplaint, data.bloodPressure, data.temperature, data.allergies, data.medications)) {
    y = sectionTitle(doc, y, 'Clinical Assessment');
    y = field(doc, y, 'Chief Complaint', data.chiefComplaint || '');

    // Vitals — safe 2-column grid
    const vitals: Array<{ label: string; value: string }> = [];
    if (data.bloodPressure) vitals.push({ label: 'Blood Pressure', value: data.bloodPressure });
    if (data.heartRate) vitals.push({ label: 'Heart Rate', value: `${data.heartRate} bpm` });
    if (data.temperature) vitals.push({ label: 'Temperature', value: `${data.temperature}\u00B0C` });
    if (data.respiratoryRate) vitals.push({ label: 'Respiratory Rate', value: `${data.respiratoryRate} cpm` });
    if (data.oxygenSat) vitals.push({ label: 'O2 Saturation', value: `${data.oxygenSat}%` });
    if (data.painScale) vitals.push({ label: 'Pain Scale', value: `${data.painScale}/10` });
    if (data.fetalHeartRate) vitals.push({ label: 'Fetal Heart Rate', value: data.fetalHeartRate });
    if (data.fundalHeight) vitals.push({ label: 'Fundal Height', value: data.fundalHeight });
    if (data.weight) vitals.push({ label: 'Weight', value: `${data.weight} kg` });
    if (data.height) vitals.push({ label: 'Height', value: `${data.height} cm` });
    if (data.bmi) vitals.push({ label: 'BMI', value: data.bmi });
    if (vitals.length) y = grid2(doc, y, vitals);

    y = field(doc, y, 'Allergies', data.allergies || '');
    y = field(doc, y, 'Current Medications', data.medications || '');
    y += 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  3. HEALTH HISTORY
  // ══════════════════════════════════════════════════════════════════════════
  if (hasHH(data.healthHistory)) {
    y = sectionTitle(doc, y, 'Health History', C.teal);
    const hh = data.healthHistory!;

    if (data.healthHistoryRefCode) {
      y = need(doc, y, 6);
      font(doc, 7, 'italic');
      doc.setTextColor(...C.teal);
      doc.text(`Ref: ${data.healthHistoryRefCode}`, ML + 4, y);
      y += 5;
    }

    if (isPresent(hh.pastMedicalHistory, hh.previousSurgery, hh.historyOfTrauma, hh.historyOfBloodTransfusion)) {
      y = subTitle(doc, y, 'Medical & Surgical History');
      y = field(doc, y, 'Past Medical History', hh.pastMedicalHistory || '');
      y = field(doc, y, 'Previous Surgery', hh.previousSurgery || '');
      y = field(doc, y, 'History of Trauma', hh.historyOfTrauma || '');
      y = field(doc, y, 'Blood Transfusion', hh.historyOfBloodTransfusion || '');
      y += 1;
    }

    if (isPresent(hh.familyHistoryPaternal, hh.familyHistoryMaternal)) {
      y = subTitle(doc, y, 'Family History');
      y = field(doc, y, 'Paternal Side', hh.familyHistoryPaternal || '');
      y = field(doc, y, 'Maternal Side', hh.familyHistoryMaternal || '');
      y += 1;
    }

    if (isPresent(hh.smokingHistory, hh.alcoholIntake, hh.drugUse, hh.dietaryPattern, hh.physicalActivity, hh.sleepPattern)) {
      y = subTitle(doc, y, 'Personal & Social History');
      y = grid2(doc, y, [
        { label: 'Smoking', value: hh.smokingHistory || '' },
        { label: 'Alcohol', value: hh.alcoholIntake || '' },
        { label: 'Drug Use', value: hh.drugUse || '' },
        { label: 'Diet', value: hh.dietaryPattern || '' },
        { label: 'Physical Activity', value: hh.physicalActivity || '' },
        { label: 'Sleep Pattern', value: hh.sleepPattern || '' },
      ]);
    }

    if (isPresent(hh.allergies, hh.currentMedications, hh.immunizationStatus, hh.mentalHealthHistory)) {
      y = subTitle(doc, y, 'Additional Information');
      y = field(doc, y, 'Known Allergies', hh.allergies || '');
      y = field(doc, y, 'Current Medications', hh.currentMedications || '');
      y = field(doc, y, 'Immunization Status', hh.immunizationStatus || '');
      y = field(doc, y, 'Mental Health History', hh.mentalHealthHistory || '');
      y += 1;
    }
    y += 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  4. FINDINGS
  // ══════════════════════════════════════════════════════════════════════════
  if (isPresent(data.physicalExam, data.labResults, data.notes)) {
    y = sectionTitle(doc, y, 'Additional Findings');
    y = field(doc, y, 'Physical Examination', data.physicalExam || '');
    y = field(doc, y, 'Laboratory Results', data.labResults || '');
    y = field(doc, y, 'Notes', data.notes || '');
    y += 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  5. DIAGNOSIS
  // ══════════════════════════════════════════════════════════════════════════
  if (isPresent(data.icd10Diagnosis, data.nandaDiagnosis, data.nandaRelatedTo, data.icd10AdditionalNotes)) {
    y = sectionTitle(doc, y, 'Diagnosis');
    if (data.nandaDiagnosis) {
      y = field(doc, y, 'NANDA-I Nursing Diagnosis', data.nandaDiagnosis);
      if (data.nandaCode) {
        font(doc, 7, 'italic');
        doc.setTextColor(...C.textMuted);
        doc.text(`(Code: ${data.nandaCode})`, ML + 4, y);
        y += 4;
      }
    }
    if (data.nandaRelatedTo) y = field(doc, y, 'Related to', data.nandaRelatedTo);
    if (data.icd10Diagnosis) y = field(doc, y, 'ICD-10 Diagnosis', data.icd10Diagnosis);
    if (data.icd10AdditionalNotes) y = field(doc, y, 'Additional Notes', data.icd10AdditionalNotes);
    y += 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  6. AI SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  const hasAi = isPresent(data.aiRationale, data.aiPriorityIntervention, data.aiFollowUpSchedule, data.aiReferralReason)
    || (data.aiRiskIndicators?.length ?? 0) > 0
    || (data.aiNursingConsiderations?.length ?? 0) > 0;

  if (hasAi) {
    y = sectionTitle(doc, y, 'AI-Assisted Summary');

    if (data.aiRationale) {
      y = infoBox(doc, y, 'Rationale', data.aiRationale, C.roseLight, C.rose, C.rose);
    }

    if (data.aiRiskIndicators?.length) {
      y = bullets(doc, y, 'Risk Indicators:', data.aiRiskIndicators);
    }

    if (data.aiPriorityIntervention) {
      y = infoBox(
        doc, y, 'Priority Intervention', data.aiPriorityIntervention,
        [254, 249, 195] as const, [146, 64, 14] as const, [146, 64, 14] as const,
      );
    }

    if (data.aiNursingConsiderations?.length) {
      y = bullets(doc, y, 'Nursing Considerations:', data.aiNursingConsiderations);
    }

    if (data.aiFollowUpSchedule) y = field(doc, y, 'Follow-up Schedule', data.aiFollowUpSchedule);
    if (data.aiReferralNeeded && data.aiReferralReason) y = field(doc, y, 'AI Referral Reason', data.aiReferralReason);
    y += 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  7. CARE PLAN
  // ══════════════════════════════════════════════════════════════════════════
  if (data.interventions.length || isPresent(data.evaluationNotes)) {
    y = sectionTitle(doc, y, 'Nursing Care Plan');

    if (data.interventions.length) {
      font(doc, 8, 'bold');
      doc.setTextColor(...C.text);
      doc.text(`Selected Interventions (${data.interventions.length}):`, ML, y);
      y += 5;

      data.interventions.forEach((intv, idx) => {
        y = need(doc, y, 8);
        font(doc, 8, 'bold');
        doc.setTextColor(...C.text);
        const code = intv.code ? `[${intv.code}] ` : '';
        doc.text(`${idx + 1}. ${code}${intv.name}`, ML, y);
        y += 4;

        if (intv.description) {
          font(doc, 7.5, 'normal');
          doc.setTextColor(...C.textLight);
          const dl = doc.splitTextToSize(intv.description, CW - 8);
          doc.text(dl, ML + 4, y);
          y += dl.length * 3.5 + 1;
        }

        const ev = data.interventionEvals?.find(
          (e) => e.nicCode === intv.code || e.nicCode === String(intv.code),
        );
        if (ev) {
          const sc: Record<string, RGB> = {
            met: [5, 150, 105],
            partially_met: [217, 119, 6],
            unmet: [185, 28, 28],
          };
          const sl = ev.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          y += 1;
          font(doc, 7, 'bold');
          doc.setTextColor(...(sc[ev.status] ?? C.textLight));
          doc.text(`Status: ${sl}`, ML + 4, y);
          y += 4;
          if (ev.nocOutcome) {
            font(doc, 7, 'normal');
            doc.setTextColor(...C.textLight);
            const nl = ev.nocOutcomeCode ? `NOC [${ev.nocOutcomeCode}]: ` : 'NOC Outcome: ';
            doc.text(nl + ev.nocOutcome, ML + 4, y);
            y += 4;
          }
          if (ev.notes) {
            font(doc, 7, 'italic');
            doc.setTextColor(...C.textMuted);
            const nl2 = doc.splitTextToSize(ev.notes, CW - 14);
            doc.text(nl2, ML + 4, y);
            y += nl2.length * 3.2 + 1;
          }
        }
        y += 2;
      });
    }

    if (data.evaluationNotes) y = field(doc, y, 'Overall Outcome Summary', data.evaluationNotes);
    y += 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  8. REFERRAL DETAILS
  // ══════════════════════════════════════════════════════════════════════════
  y = sectionTitle(doc, y, 'Referral Details');
  y = field(doc, y, 'Referral Type', data.referralType || 'Refer to Doctor');

  if (data.referralPriority && data.referralPriority !== 'none') {
    const pl = data.referralPriority === 'urgent' ? 'Urgent'
      : data.referralPriority === 'same_day' ? 'Same Day' : 'Non-urgent';
    y = field(doc, y, 'Priority', pl);
  }
  y = field(doc, y, 'Referred Facility', data.referralFacility || 'Not specified');
  y += 4;

  // ══════════════════════════════════════════════════════════════════════════
  //  SIGNATURES
  // ══════════════════════════════════════════════════════════════════════════
  y = need(doc, y, 35);

  // Soft separator
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.25);
  doc.line(ML, y, PW - MR, y);
  y += 5;

  font(doc, 8, 'bold');
  doc.setTextColor(...C.text);
  doc.text('Prepared by:', ML, y);
  y += 10;

  // Signature lines
  doc.line(ML, y, 85, y);
  doc.line(110, y, PW - MR, y);
  font(doc, 6.5, 'normal');
  doc.setTextColor(...C.textMuted);
  doc.text('Nurse Signature over Printed Name', ML, y + 3.5);
  doc.text('Date & Time', 110, y + 3.5);
  y += 12;

  doc.line(ML, y, 85, y);
  doc.line(110, y, PW - MR, y);
  doc.text('Receiving Physician Signature over Printed Name', ML, y + 3.5);
  doc.text('Date & Time', 110, y + 3.5);

  // ══════════════════════════════════════════════════════════════════════════
  //  FOOTER — drawn ONCE per page at the very end
  // ══════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // thin line
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.line(ML, FOOTER_ZONE, PW - MR, FOOTER_ZONE);
    // page text
    font(doc, 6.5, 'normal');
    doc.setTextColor(...C.textMuted);
    doc.text('MOMternal \u2014 Maternal Health Nursing Assessment System', ML, FOOTER_ZONE + 4);
    doc.text(`Page ${p} of ${totalPages}`, PW - MR, FOOTER_ZONE + 4, { align: 'right' });
    // confidentiality
    font(doc, 5, 'italic');
    doc.setTextColor(...C.border);
    doc.text('Auto-generated referral document. Confidential.', ML, FOOTER_ZONE + 8);
  }

  return doc.output('blob');
}
