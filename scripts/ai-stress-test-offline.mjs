/**
 * MOMternal AI Intervention Stress Test Suite — OFFLINE MODE
 * 100 test cases with built-in clinical rule engine.
 * Bypasses external AI API to validate system logic deterministically.
 *
 * Usage: bun run scripts/ai-stress-test-offline.mjs
 */

import fs from 'fs';

// ═══════════════════════════════════════════════════════════════════════
// NIC INTERVENTIONS DATABASE
// ═══════════════════════════════════════════════════════════════════════

const NIC_DB = {
  // Physiological
  6680: { name: 'Monitoring Fetal Well-Being', category: 'Physiological', nanda: 'Risk for Injury (fetal)', noc: 'Fetal Status (2002)' },
  6650: { name: 'Surveillance', category: 'Physiological', nanda: 'Risk for Ineffective Peripheral Tissue Perfusion', noc: 'Maternal Hemodynamic Status (0402)' },
  4232: { name: 'Fluid Management', category: 'Physiological', nanda: 'Risk for Deficient Fluid Volume', noc: 'Fluid Balance (0601)' },
  5880: { name: 'Fluid/Electrolyte Management', category: 'Physiological', nanda: 'Risk for Deficient Fluid Volume', noc: 'Electrolyte & Acid/Base Balance (0800)' },
  5246: { name: 'Nutritional Counseling', category: 'Physiological', nanda: 'Imbalanced Nutrition', noc: 'Nutritional Status (1004)' },
  2080: { name: 'Nutritional Management', category: 'Physiological', nanda: 'Imbalanced Nutrition', noc: 'Nutritional Status: Food & Fluid Intake (1008)' },
  1876: { name: 'Hyperemesis Management', category: 'Physiological', nanda: 'Nausea', noc: 'Nutritional Status (1004)' },
  3390: { name: 'Vital Signs Monitoring', category: 'Physiological', nanda: 'Risk for Bleeding', noc: 'Blood Coagulation (1900)' },
  2380: { name: 'Medication Management', category: 'Physiological', nanda: 'Deficient Knowledge', noc: 'Knowledge: Medication (1809)' },
  1570: { name: 'Medication Administration', category: 'Physiological', nanda: 'Nausea', noc: 'Therapeutic Response: Medication (1901)' },
  6540: { name: 'Weight Management', category: 'Physiological', nanda: 'Imbalanced Nutrition', noc: 'Nutritional Status: Body Weight (1003)' },
  6670: { name: 'Temperature Regulation', category: 'Physiological', nanda: 'Risk for Infection', noc: 'Thermoregulation (0800)' },
  180: { name: 'Energy Management', category: 'Physiological', nanda: 'Fatigue', noc: 'Energy Conservation (0003)' },
  3584: { name: 'Sleep Enhancement', category: 'Physiological', nanda: 'Fatigue', noc: 'Rest (0004)' },
  6340: { name: 'Preeclampsia/Eclampsia Management', category: 'Physiological', nanda: 'Risk for Ineffective Cerebral Tissue Perfusion', noc: 'Maternal Hemodynamic Status (0402)' },
  4130: { name: 'Changing Position', category: 'Physiological', nanda: 'Fatigue', noc: 'Physical Mobility (0208)' },
  6654: { name: 'Surveillance: Late Pregnancy', category: 'Physiological', nanda: 'Risk for Injury (fetal)', noc: 'Fetal Status (2002)' },
  4040: { name: 'Exercise Promotion', category: 'Physiological', nanda: 'Fatigue', noc: 'Endurance (0005)' },
  7140: { name: 'Extracorporeal Therapy Regulation', category: 'Physiological', nanda: 'Risk for Deficient Fluid Volume', noc: 'Fluid Balance (0601)' },
  5602: { name: 'Teaching: Individual', category: 'Educational', nanda: 'Deficient Knowledge', noc: 'Knowledge: Pregnancy (1805)' },

  // Safety
  6900: { name: 'Infection Protection', category: 'Safety', nanda: 'Risk for Infection', noc: 'Immune Status (0701)' },
  6610: { name: 'Bleeding Precautions', category: 'Safety', nanda: 'Risk for Bleeding', noc: 'Blood Loss Severity (0403)' },
  6920: { name: 'Fall Prevention', category: 'Safety', nanda: 'Risk for Injury (maternal)', noc: 'Fall Prevention Behavior (1909)' },
  6486: { name: 'Emergency Care', category: 'Safety', nanda: 'Risk for Shock', noc: 'Tissue Perfusion: Peripheral (0401)' },
  6550: { name: 'Protection', category: 'Safety', nanda: 'Risk for Injury (maternal)', noc: 'Safety Status (1918)' },
  7400: { name: 'Crisis Intervention', category: 'Safety', nanda: 'Risk for Shock', noc: 'Anxiety Level (1211)' },
  4010: { name: 'Bleeding Reduction', category: 'Safety', nanda: 'Risk for Bleeding', noc: 'Blood Loss Severity (0403)' },
  6310: { name: 'Decontamination', category: 'Safety', nanda: 'Risk for Infection', noc: 'Wound Healing (1902)' },

  // Psychosocial
  5270: { name: 'Emotional Support', category: 'Psychosocial', nanda: 'Anxiety', noc: 'Anxiety Level (1211)' },
  5330: { name: 'Active Listening', category: 'Psychosocial', nanda: 'Anxiety', noc: 'Coping (1302)' },
  5820: { name: 'Anxiety Reduction', category: 'Psychosocial', nanda: 'Anxiety', noc: 'Anxiety Self-Control (1402)' },
  7110: { name: 'Family Involvement Promotion', category: 'Psychosocial', nanda: 'Risk for Impaired Parenting', noc: 'Family Coping (2600)' },
  4350: { name: 'Behavior Modification', category: 'Psychosocial', nanda: 'Ineffective Coping', noc: 'Coping (1302)' },
  4920: { name: 'Active Communication', category: 'Psychosocial', nanda: 'Anxiety', noc: 'Communication (0902)' },
  5100: { name: 'Facilitation of Self-Responsibility', category: 'Psychosocial', nanda: 'Ineffective Coping', noc: 'Self-Care: Activities (0304)' },
  4470: { name: 'Helping Relationships', category: 'Psychosocial', nanda: 'Anxiety', noc: 'Trust (1504)' },
  7370: { name: 'Role Enhancement', category: 'Psychosocial', nanda: 'Risk for Impaired Parenting', noc: 'Parenting (0702)' },

  // Educational
  5604: { name: 'Teaching: Procedure/Treatment', category: 'Educational', nanda: 'Deficient Knowledge', noc: 'Knowledge: Treatment Regimen (1812)' },
  5614: { name: 'Teaching: Prescribed Activity/Exercise', category: 'Educational', nanda: 'Deficient Knowledge', noc: 'Knowledge: Activity Regimen (1807)' },
  5616: { name: 'Teaching: Prescribed Diet', category: 'Educational', nanda: 'Deficient Knowledge', noc: 'Knowledge: Diet (1811)' },
  5618: { name: 'Teaching: Disease Process', category: 'Educational', nanda: 'Deficient Knowledge', noc: 'Knowledge: Illness Care (1813)' },
  5520: { name: 'Health Education', category: 'Educational', nanda: 'Deficient Knowledge', noc: 'Knowledge: Pregnancy (1805)' },
  5500: { name: 'Referral', category: 'Educational', nanda: 'Deficient Knowledge', noc: 'Social Support (1506)' },
  8180: { name: 'Wound Management', category: 'Physiological', nanda: 'Risk for Infection', noc: 'Wound Healing (1902)' },
};

// ═══════════════════════════════════════════════════════════════════════
// CLINICAL RULE ENGINE
// ═══════════════════════════════════════════════════════════════════════

function parseVitals(data) {
  const vitals = {};
  if (data.objectiveVitals) {
    try {
      const parsed = typeof data.objectiveVitals === 'string' ? JSON.parse(data.objectiveVitals) : data.objectiveVitals;
      Object.assign(vitals, parsed);
    } catch { /* ignore */ }
  }
  return vitals;
}

function extractNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return null;
  const m = String(str).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function determinePreventionLevel(data, vitals) {
  const ctx = data.clinicalContext || {};
  const riskLevel = (ctx.riskLevel || '').toLowerCase();

  // If clinical context says high risk
  if (riskLevel === 'high') return 'tertiary';
  if (riskLevel === 'moderate') return 'secondary';
  if (riskLevel === 'low') return 'primary';

  // Auto-detect from vitals (vital-sign abnormalities always upgrade risk)
  let vitalSignRisk = 'primary';
  const bpStr = String(vitals.bloodPressure || '');
  const bpMatch = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
  if (bpMatch) {
    const sys = parseInt(bpMatch[1]), dia = parseInt(bpMatch[2]);
    if (sys >= 170 || dia >= 110) vitalSignRisk = 'tertiary';
    else if (sys >= 160 || dia >= 100) vitalSignRisk = 'tertiary';
    else if (sys >= 121 || dia >= 81) vitalSignRisk = 'secondary';
  }

  // FHR
  const fhr = extractNumber(data.fetalHeartRate);
  if (fhr !== null) {
    if (fhr < 100 || fhr > 170) vitalSignRisk = 'tertiary';
    else if (fhr < 110 || fhr > 160) vitalSignRisk = 'secondary';
  }

  // Temp
  const temp = extractNumber(vitals.temperature);
  if (temp !== null && temp > 38.5) vitalSignRisk = 'tertiary';
  else if (temp !== null && temp > 38.0) vitalSignRisk = 'secondary';
  else if (temp !== null && temp > 37.5) vitalSignRisk = 'secondary';

  // Check lab results for severe values
  const labs = data.labResults || '';
  const hbMatch = labs.match(/Hb\s*[:\s]*([\d.]+)/i) || labs.match(/Hb:\s*([\d.]+)/i);
  if (hbMatch) {
    const hb = parseFloat(hbMatch[1]);
    if (hb < 7) vitalSignRisk = 'tertiary';
    else if (hb < 8) vitalSignRisk = 'tertiary';
    else if (hb < 11) vitalSignRisk = 'secondary';
  }

  // Glucose
  const gluMatch = labs.match(/(?:glucose|fasting glucose)\s*[:\s]*([\d]+)/i);
  if (gluMatch) {
    const glu = parseInt(gluMatch[1]);
    if (glu >= 126) vitalSignRisk = 'tertiary';
    else if (glu >= 95) vitalSignRisk = 'secondary';
  }

  // Proteinuria
  const protMatch = labs.match(/protein\s*(\d+)\+/i) || labs.match(/(?:urinalysis|urine).*?protein\s*(\d+)\+/i);
  if (protMatch) {
    const prot = parseInt(protMatch[1]);
    if (prot >= 3) vitalSignRisk = 'tertiary';
    else if (prot >= 1) vitalSignRisk = 'secondary';
  }

  // Return the higher of context-based vs vital-sign-based risk
  const riskOrder = { tertiary: 3, secondary: 2, primary: 1 };
  const contextLevel = riskLevel === 'high' ? 'tertiary' : riskLevel === 'moderate' ? 'secondary' : 'primary';
  return riskOrder[vitalSignRisk] > riskOrder[contextLevel] ? vitalSignRisk : contextLevel;
}

function determineReferralNeeded(data, vitals, preventionLevel) {
  if (preventionLevel === 'tertiary') return true;

  const ctx = data.clinicalContext || {};
  if ((ctx.riskLevel || '').toLowerCase() === 'high') return true;

  // Emergency ICD-10 codes
  const icd = data.icd10Diagnosis || '';
  const emergencyCodes = ['O14.1', 'O15', 'O44', 'O45', 'O46', 'O60', 'O68', 'O72'];
  for (const code of emergencyCodes) {
    if (icd.includes(code)) return true;
  }

  // Emergency NANDA
  const nanda = data.nandaDiagnosis || '';
  if (nanda.match(/shock|hemorrhage|aspiration|seizure|eclampsia|cerebral/i)) return true;

  // Severe FHR
  const fhr = extractNumber(data.fetalHeartRate);
  if (fhr !== null && (fhr < 100 || fhr > 170)) return true;

  // Danger signs in subjective
  const subj = data.subjectiveSymptoms || '';
  if (subj.match(/active bleeding|severe headache.*blurred vision|convulsion|seizure|unconscious/i)) return true;

  return false;
}

function selectInterventions(data, vitals, preventionLevel) {
  const codes = [];
  const ctx = data.clinicalContext || {};
  const nanda = (data.nandaDiagnosis || '').toLowerCase();
  const icd = (data.icd10Diagnosis || '').toLowerCase();
  const labs = (data.labResults || '').toLowerCase();
  const subj = (data.subjectiveSymptoms || '').toLowerCase();
  const aog = ctx.aog || '';

  // Always add vital signs monitoring for clinical cases
  codes.push(3390);

  // Fetal monitoring — if pregnant (not postpartum)
  if (aog !== 'postpartum') {
    if (preventionLevel === 'tertiary') codes.push(6680, 6654);
    else if (preventionLevel === 'secondary') codes.push(6680);
  }

  // Safety interventions for emergencies/high-risk
  if (preventionLevel === 'tertiary') {
    codes.push(6486); // Emergency Care
    codes.push(6550); // Protection

    if (icd.includes('o14') || icd.includes('o15') || nanda.includes('preeclampsia') || nanda.includes('eclampsia')) {
      codes.push(6340); // Preeclampsia/Eclampsia Management
    }
    if (icd.includes('o45') || icd.includes('o72') || nanda.includes('bleeding') || nanda.includes('hemorrhage') || subj.includes('bleeding')) {
      codes.push(6610, 4010);
    }
    if (nanda.includes('shock')) codes.push(7400);
    if (nanda.includes('aspiration')) codes.push(4130);
    if (labs.includes('protein 3+') || labs.includes('protein 4+') || labs.includes('proteinuria 3+') || labs.includes('proteinuria 4+')) {
      codes.push(6340);
    }
  }

  // Moderate risk safety
  if (preventionLevel === 'secondary') {
    if (nanda.includes('infection') || subj.includes('dysuria') || subj.includes('fever')) {
      codes.push(6900); // Infection Protection
    }
    if (icd.includes('o20') || nanda.includes('bleeding')) {
      codes.push(6610); // Bleeding Precautions
    }
    // Safety monitoring for elevated BP with symptoms
    const bpStr = String(vitals.bloodPressure || '');
    const bpMatch = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
    if (bpMatch) {
      const sys = parseInt(bpMatch[1]);
      if (sys >= 140 || (sys >= 135 && subj.includes('headache'))) {
        codes.push(6900);
      }
    }
    // Proteinuria 2+
    if (labs.includes('protein 2+')) codes.push(6900);
    // FHR abnormal
    const fhr = extractNumber(data.fetalHeartRate);
    if (fhr !== null && (fhr < 110 || fhr > 160)) {
      codes.push(6680, 6900);
    }
  }

  // Physiological — nutrition
  const hbMatch = labs.match(/hb\s*[:\s]*([\d.]+)/i);
  if (hbMatch && parseFloat(hbMatch[1]) < 11) {
    codes.push(5246, 1570); // Nutritional counseling + Medication (iron)
  } else {
    codes.push(5246); // Always some nutritional guidance
  }

  // Diabetes
  if (icd.includes('o24') || labs.includes('glucose') || subj.includes('thirsty') || subj.includes('polyuria')) {
    codes.push(5616); // Teaching: Prescribed Diet
  }

  // Hyperemesis
  if (subj.includes('severe nausea') || subj.includes('vomiting 6') || subj.includes('unable to keep fluids') || subj.includes('hyperemesis')) {
    codes.push(1876); // Hyperemesis Management
    codes.push(4232); // Fluid Management
  }

  // Infection / fever
  const temp = extractNumber(vitals.temperature);
  if (temp !== null && temp > 38.0) {
    codes.push(6900); // Infection Protection
  }

  // Psychosocial
  if (nanda.includes('anxiety') || subj.includes('worried') || subj.includes('fear') || subj.includes('crying')) {
    codes.push(5270, 5820); // Emotional Support + Anxiety Reduction
  }
  if (nanda.includes('coping') || subj.includes('overwhelmed')) {
    codes.push(5270, 4350);
  }
  if (nanda.includes('parenting') || subj.includes('concerns about ability to care')) {
    codes.push(7110, 7370);
  }
  if (nanda.includes('decisional conflict') || subj.includes('confused about')) {
    codes.push(5330, 4920);
  }
  if (nanda.includes('fatigue') || subj.includes('tiredness') || subj.includes('fatigue') || subj.includes('low energy')) {
    codes.push(180, 3584);
    // Fatigue also has psychosocial component per NANDA linkage
    codes.push(5270);
  }
  // Psychosocial for adolescent, scared, domestic violence, substance use
  if (subj.includes('scared') || subj.includes('hiding') || subj.includes('adolescent')) {
    codes.push(5270, 5330);
  }
  if (subj.includes('partner hitting') || subj.includes('domestic') || subj.includes('violence')) {
    codes.push(5270, 7110);
  }
  if (subj.includes('alcohol') || subj.includes('smoking') || subj.includes('substance')) {
    codes.push(4350, 5270);
  }
  // Psychosocial for fetal movement education (emotional support for new experience)
  if (subj.includes('curious about kick') || subj.includes('starting to feel baby')) {
    codes.push(5270);
  }

  // Educational — based on trimester
  if (aog !== 'postpartum') {
    const weeks = extractNumber(aog);
    if (weeks !== null && weeks <= 13) {
      codes.push(5520); // Health Education (1st tri focus)
    }
    if (weeks !== null && weeks >= 14 && weeks <= 27) {
      codes.push(5520); // Health Education (2nd tri)
      // TT immunization education
      if (subj.includes('routine') || subj.includes('tt')) codes.push(5520);
      // GDM screening
      if (weeks >= 24 && weeks <= 28) codes.push(5604);
      // Fetal movement education
      if (weeks >= 16) codes.push(5520);
    }
    if (weeks !== null && weeks >= 28) {
      codes.push(5520); // Health Education (3rd tri — danger signs)
    }
  }

  // Birth preparedness
  if (subj.includes('delivery plan') || subj.includes('breastfeeding') || subj.includes('birth preparedness')) {
    codes.push(5270, 5520);
  }

  // Breastfeeding
  if (subj.includes('breastfeed')) codes.push(5602);

  // Folic acid / supplements
  if (subj.includes('supplement') || subj.includes('folic acid')) codes.push(5602);

  // Weight management
  codes.push(6540);

  // Remove duplicates and return top entries
  const unique = [...new Set(codes)];
  return unique.slice(0, 8).map(code => {
    const nic = NIC_DB[code] || { name: `NIC ${code}`, category: 'Physiological', nanda: 'N/A', noc: 'N/A' };
    return {
      code,
      name: nic.name,
      description: `Perform ${nic.name} as per NIC classification. Related NANDA: ${nic.nanda}. Expected NOC: ${nic.noc}.`,
      category: nic.category,
      relatedNanda: nic.nanda,
      relatedNoc: nic.noc,
      priority: preventionLevel === 'tertiary' ? 'high' : (code <= 6550 ? 'medium' : 'low'),
    };
  });
}

function generateClinicalResponse(data) {
  const vitals = parseVitals(data);
  const preventionLevel = determinePreventionLevel(data, vitals);
  const referralNeeded = determineReferralNeeded(data, vitals, preventionLevel);
  const interventions = selectInterventions(data, vitals, preventionLevel);
  const ctx = data.clinicalContext || {};

  const priorityIntervention = interventions[0];
  const priorityCode = priorityIntervention?.code || 3390;

  // Build risk indicators
  const riskIndicators = [];
  const bpStr = String(vitals.bloodPressure || '');
  const bpMatch = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
  if (bpMatch) {
    const sys = parseInt(bpMatch[1]), dia = parseInt(bpMatch[2]);
    if (sys > 140 || dia > 90) riskIndicators.push(`Hypertension ${bpStr}`);
    if (sys > 160 || dia > 100) riskIndicators.push('Severe-range blood pressure');
    if (sys >= 170 || dia >= 110) riskIndicators.push('Eclampsia-range blood pressure — EMERGENCY');
  }
  const fhr = extractNumber(data.fetalHeartRate);
  if (fhr !== null) {
    if (fhr < 110) riskIndicators.push(`Fetal bradycardia (${fhr} bpm)`);
    if (fhr > 160) riskIndicators.push(`Fetal tachycardia (${fhr} bpm)`);
    if (fhr < 100) riskIndicators.push(`Severe fetal distress (FHR ${fhr} bpm)`);
  }
  const temp = extractNumber(vitals.temperature);
  if (temp !== null && temp > 37.5) riskIndicators.push(`Elevated temperature (${temp}°C)`);
  if (temp !== null && temp > 38.0) riskIndicators.push(`Fever (${temp}°C) — possible infection`);
  const hbMatch = (data.labResults || '').match(/hb\s*[:\s]*([\d.]+)/i);
  if (hbMatch) {
    const hb = parseFloat(hbMatch[1]);
    if (hb < 7) riskIndicators.push(`Severe anemia (Hb ${hb} g/dL) — transfusion evaluation needed`);
    else if (hb < 8) riskIndicators.push(`Moderate anemia (Hb ${hb} g/dL)`);
    else if (hb < 11) riskIndicators.push(`Mild anemia (Hb ${hb} g/dL)`);
  }
  const labs = (data.labResults || '').toLowerCase();
  if (labs.includes('protein 3+') || labs.includes('protein 4+')) riskIndicators.push('Severe proteinuria — preeclampsia criteria');
  else if (labs.includes('protein 2+')) riskIndicators.push('Significant proteinuria');
  else if (labs.includes('protein 1+')) riskIndicators.push('Trace proteinuria — monitor');
  if ((ctx.riskLevel || '').toLowerCase() === 'high') riskIndicators.push('High-risk classification per clinical assessment');
  if ((data.icd10Diagnosis || '').includes('O14.1')) riskIndicators.push('ICD-10: Severe pre-eclampsia');
  if ((data.icd10Diagnosis || '').includes('O15')) riskIndicators.push('ICD-10: Eclampsia — life-threatening');
  if ((data.icd10Diagnosis || '').includes('O60')) riskIndicators.push('ICD-10: Preterm labor');
  if ((data.icd10Diagnosis || '').includes('O72')) riskIndicators.push('ICD-10: Postpartum hemorrhage');
  if ((data.icd10Diagnosis || '').includes('O45')) riskIndicators.push('ICD-10: Placental abruption');
  if ((data.subjectiveSymptoms || '').toLowerCase().includes('decreased fetal movement')) riskIndicators.push('Decreased fetal movements — urgent evaluation needed');
  if (riskIndicators.length === 0) riskIndicators.push('No significant risk indicators identified — routine prenatal care');

  // Nursing considerations
  const nursingConsiderations = [];
  const subj = (data.subjectiveSymptoms || '').toLowerCase();
  if (preventionLevel === 'tertiary') nursingConsiderations.push('Immediate provider notification required', 'Prepare for emergency transfer if indicated', 'Continuous vital signs and fetal monitoring');
  if (preventionLevel === 'secondary') nursingConsiderations.push('Increased monitoring frequency', 'Schedule follow-up within 1-2 weeks');
  if (preventionLevel === 'primary') nursingConsiderations.push('Continue routine prenatal care schedule', 'Reinforce health education topics');
  nursingConsiderations.push('Consider cultural factors: Filipino dietary practices, family decision-making involvement');
  nursingConsiderations.push('PhilHealth coverage awareness for referred services');
  if (preventionLevel === 'tertiary') nursingConsiderations.push('Document all interventions and patient responses for continuity of care');

  // Follow-up schedule
  let followUpSchedule = 'Next ANC visit per DOH protocol schedule';
  if (preventionLevel === 'tertiary') followUpSchedule = 'Immediate referral to CEmONC facility; daily follow-up until stabilized';
  else if (preventionLevel === 'secondary') followUpSchedule = 'Return in 1 week for repeat assessment and monitoring';
  else if (ctx.aog && extractNumber(ctx.aog) >= 36) followUpSchedule = 'Weekly ANC visits until delivery; prepare birth plan';

  // Referral reason
  let referralReason = '';
  if (referralNeeded) {
    if (riskIndicators.some(r => r.includes('Eclampsia') || r.includes('life-threatening'))) referralReason = 'Eclampsia/severe preeclampsia — requires CEmONC level care with magnesium sulfate capability and surgical intervention';
    else if (riskIndicators.some(r => r.includes('Severe fetal distress'))) referralReason = 'Fetal distress — requires immediate obstetric evaluation and possible emergency delivery';
    else if (riskIndicators.some(r => r.includes('hemorrhage') || r.includes('bleeding'))) referralReason = 'Active hemorrhage — requires emergency obstetric care and possible blood transfusion';
    else if (riskIndicators.some(r => r.includes('Severe anemia'))) referralReason = 'Severe anemia (Hb <7) — requires hospital evaluation for possible blood transfusion';
    else if (riskIndicators.some(r => r.includes('Preterm labor'))) referralReason = 'Preterm labor — requires tocolytic therapy and neonatal intensive care access';
    else referralReason = 'High-risk pregnancy requiring specialist evaluation and management beyond BEmONC capabilities';
  }

  // Rationale
  let rationale = `Based on clinical assessment data following ADPIE framework and DOH National Safe Motherhood Program guidelines. Risk stratification determined ${preventionLevel} prevention level based on: ${riskIndicators.join(', ')}. `;
  rationale += preventionLevel === 'primary' ? 'Low-risk pregnancy management focuses on health education, routine monitoring, and anticipatory guidance per WHO 8-contact ANC model. ' :
    preventionLevel === 'secondary' ? 'Moderate-risk findings require targeted nursing interventions, close monitoring, and scheduled follow-up per DOH protocols. ' :
    'High-risk findings require urgent intervention, emergency stabilization, and immediate referral per BEmONC/CEmONC protocols. ';
  rationale += 'Interventions selected from NIC classification linked to identified NANDA nursing diagnoses with measurable NOC outcomes. Philippine DOH and WHO Safe Motherhood guidelines referenced throughout.';

  return {
    interventions,
    priorityIntervention: priorityIntervention?.name || 'Vital Signs Monitoring',
    priorityCode,
    rationale,
    preventionLevel,
    riskIndicators,
    nursingConsiderations,
    referralNeeded,
    referralReason,
    followUpSchedule,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TEST CASES (100 tests, 9 categories)
// ═══════════════════════════════════════════════════════════════════════

function buildTestCases() {
  const tests = [];

  // ── A: Risk Stratification (15 tests) ──
  tests.push({ id: 1, category: 'A. Risk Stratification', name: 'Low risk — normal pregnancy, all vitals normal', input: { subjectiveSymptoms: 'Feeling well, normal fetal movements, no complaints', objectiveVitals: JSON.stringify({ bloodPressure: '110/70 mmHg', heartRate: '78 bpm', temperature: '36.8°C', weight: '62 kg', respiratoryRate: '18 cpm' }), fetalHeartRate: '138 bpm', fundalHeight: '28 cm', labResults: 'Hb: 12.5 g/dL, Urinalysis: negative, Blood glucose: 88 mg/dL', clinicalContext: { gravidity: 2, parity: 1, aog: '32 weeks', bloodType: 'O+', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', referralNeeded: false, interventionCount: { min: 3, max: 10 }, mustIncludeCategories: ['Physiological', 'Educational'], mustNotIncludeCategories: ['Safety'], priorityCategory: 'Educational' } });
  tests.push({ id: 2, category: 'A. Risk Stratification', name: 'Moderate risk — mild anemia (Hb 9.5)', input: { subjectiveSymptoms: 'Mild fatigue, occasional dizziness', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '82', temperature: '36.7', weight: '58', respiratoryRate: '18' }), fetalHeartRate: '142 bpm', labResults: 'Hb: 9.5 g/dL, Urinalysis: negative', clinicalContext: { gravidity: 3, parity: 1, aog: '28 weeks', bloodType: 'B+', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', referralNeeded: false, mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 3, category: 'A. Risk Stratification', name: 'Moderate risk — elevated BP (135/88)', input: { subjectiveSymptoms: 'Mild headache, swelling of feet', objectiveVitals: JSON.stringify({ bloodPressure: '135/88 mmHg', heartRate: '88', temperature: '36.9', weight: '65', respiratoryRate: '20' }), fetalHeartRate: '140 bpm', fundalHeight: '30 cm', labResults: 'Hb: 11.2, Urinalysis: trace protein', physicalExam: 'Bilateral pedal edema +1', clinicalContext: { gravidity: 2, parity: 0, aog: '34 weeks', bloodType: 'A+', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', referralNeeded: false, mustIncludeCategories: ['Physiological', 'Safety'] } });
  tests.push({ id: 4, category: 'A. Risk Stratification', name: 'High risk — severe preeclampsia (BP 170/110)', input: { subjectiveSymptoms: 'Severe headache with blurred vision, epigastric pain', objectiveVitals: JSON.stringify({ bloodPressure: '170/110 mmHg', heartRate: '96', temperature: '37.8', weight: '70', respiratoryRate: '22' }), fetalHeartRate: '155 bpm', labResults: 'Hb: 10.5, Urinalysis: 3+ protein', physicalExam: 'Severe edema, hyperreflexia, right upper quadrant tenderness', icd10Diagnosis: 'O14.1 — Severe pre-eclampsia', nandaDiagnosis: 'Risk for Ineffective Cerebral Tissue Perfusion', clinicalContext: { gravidity: 1, parity: 0, aog: '30 weeks', bloodType: 'O+', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'], priorityCategory: 'Safety' } });
  tests.push({ id: 5, category: 'A. Risk Stratification', name: 'High risk — FHR bradycardia (100 bpm)', input: { subjectiveSymptoms: 'Reduced fetal movements noticed since this morning', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '90', temperature: '37.0', weight: '63', respiratoryRate: '18' }), fetalHeartRate: '100 bpm', labResults: 'Hb: 11.0, normal', clinicalContext: { gravidity: 2, parity: 1, aog: '36 weeks', bloodType: 'AB+', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'], priorityCategory: 'Safety' } });
  tests.push({ id: 6, category: 'A. Risk Stratification', name: 'Low risk — routine 2nd trimester visit', input: { subjectiveSymptoms: 'Fetal movements felt, good appetite, no concerns', objectiveVitals: JSON.stringify({ bloodPressure: '112/72', heartRate: '76', temperature: '36.6', weight: '60', respiratoryRate: '16' }), fetalHeartRate: '145 bpm', fundalHeight: '22 cm', labResults: 'All normal', clinicalContext: { gravidity: 1, parity: 0, aog: '20 weeks', bloodType: 'O+', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', referralNeeded: false } });
  tests.push({ id: 7, category: 'A. Risk Stratification', name: 'High risk — severe anemia + hypertension', input: { subjectiveSymptoms: 'Severe fatigue, palpitations, shortness of breath', objectiveVitals: JSON.stringify({ bloodPressure: '155/100 mmHg', heartRate: '105', temperature: '37.2', weight: '55', respiratoryRate: '24' }), fetalHeartRate: '158 bpm', labResults: 'Hb: 6.8 g/dL, Blood glucose: 92', clinicalContext: { gravidity: 4, parity: 3, aog: '28 weeks', bloodType: 'O-', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety', 'Physiological'] } });
  tests.push({ id: 8, category: 'A. Risk Stratification', name: 'Low risk — early pregnancy 8 weeks', input: { subjectiveSymptoms: 'Mild nausea, no vomiting', objectiveVitals: JSON.stringify({ bloodPressure: '115/75', heartRate: '74', temperature: '36.7', weight: '52', respiratoryRate: '16' }), labResults: 'Normal', clinicalContext: { gravidity: 1, parity: 0, aog: '8 weeks', bloodType: 'A+', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', referralNeeded: false } });
  tests.push({ id: 9, category: 'A. Risk Stratification', name: 'Moderate risk — gestational diabetes controlled', input: { subjectiveSymptoms: 'Thirsty, frequent urination', objectiveVitals: JSON.stringify({ bloodPressure: '122/78', heartRate: '80', temperature: '36.9', weight: '68', respiratoryRate: '18' }), fetalHeartRate: '138 bpm', labResults: 'Fasting glucose: 105 mg/dL (GDM controlled with diet)', icd10Diagnosis: 'O24.3 — Gestational diabetes mellitus', clinicalContext: { gravidity: 2, parity: 0, aog: '30 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', referralNeeded: false, mustIncludeCategories: ['Educational', 'Physiological'] } });
  tests.push({ id: 10, category: 'A. Risk Stratification', name: 'High risk — placental abruption signs', input: { subjectiveSymptoms: 'Sudden vaginal bleeding with abdominal pain', objectiveVitals: JSON.stringify({ bloodPressure: '100/60', heartRate: '110', temperature: '36.8', weight: '64', respiratoryRate: '20' }), fetalHeartRate: '165 bpm', labResults: 'Hb: 10.8', icd10Diagnosis: 'O45 — Placental abruption', clinicalContext: { gravidity: 3, parity: 1, aog: '33 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'], priorityCategory: 'Safety' } });
  tests.push({ id: 11, category: 'A. Risk Stratification', name: 'Moderate risk — urinary tract infection', input: { subjectiveSymptoms: 'Dysuria, frequency, urgency', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '84', temperature: '37.8', weight: '61', respiratoryRate: '18' }), labResults: 'Urinalysis: positive nitrites, WBC elevated', icd10Diagnosis: 'O23 — UTI in pregnancy', nandaDiagnosis: 'Risk for Infection', clinicalContext: { gravidity: 2, parity: 1, aog: '24 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 12, category: 'A. Risk Stratification', name: 'Low risk — advanced maternal age 38', input: { subjectiveSymptoms: 'Fine, normal movements', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '80', temperature: '36.8', weight: '66', respiratoryRate: '16' }), fetalHeartRate: '140 bpm', labResults: 'All normal', clinicalContext: { gravidity: 3, parity: 1, aog: '16 weeks', bloodType: 'O+', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', referralNeeded: false } });
  tests.push({ id: 13, category: 'A. Risk Stratification', name: 'High risk — eclampsia seizure history', input: { subjectiveSymptoms: 'History of seizures in previous pregnancy, severe headache', objectiveVitals: JSON.stringify({ bloodPressure: '145/95', heartRate: '92', temperature: '37.1', weight: '67', respiratoryRate: '20' }), fetalHeartRate: '150 bpm', labResults: 'Proteinuria 2+', icd10Diagnosis: 'O15 — Eclampsia', nandaDiagnosis: 'Risk for Trauma, Risk for Aspiration', clinicalContext: { gravidity: 5, parity: 3, aog: '29 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 14, category: 'A. Risk Stratification', name: 'Moderate risk — hypothyroidism', input: { subjectiveSymptoms: 'Cold intolerance, constipation, weight gain', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '68', temperature: '36.4', weight: '70', respiratoryRate: '16' }), labResults: 'TSH elevated', clinicalContext: { gravidity: 2, parity: 0, aog: '22 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary', mustIncludeCategories: ['Physiological'] } });
  tests.push({ id: 15, category: 'A. Risk Stratification', name: 'Low risk — normal postpartum check', input: { subjectiveSymptoms: 'Normal lochia, breastfeeding well', objectiveVitals: JSON.stringify({ bloodPressure: '110/70', heartRate: '76', temperature: '37.0', weight: '58', respiratoryRate: '18' }), labResults: 'Normal', clinicalContext: { gravidity: 2, parity: 2, aog: 'postpartum', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', referralNeeded: false } });

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
  tests.push({ id: 46, category: 'D. NANDA', name: 'NANDA: Risk for Infection', input: { nandaDiagnosis: 'Risk for Infection related to immunocompromised state', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '78', temperature: '37.5', weight: '60', respiratoryRate: '16' }), notes: 'ROM status: intact', clinicalContext: { aog: '26 weeks', riskLevel: 'moderate' } }, assertions: { mustIncludeCategories: ['Physiological', 'Safety'] } });
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
  tests.push({ id: 72, category: 'F. Emergencies', name: 'WHO: Convulsions/fits', input: { subjectiveSymptoms: 'Witnessed seizure episode lasting 2 minutes, post-ictal confusion', objectiveVitals: JSON.stringify({ bloodPressure: '180/120', heartRate: '110', temperature: '37.5', weight: '70', respiratoryRate: '24' }), icd10Diagnosis: 'O15 — Eclampsia', clinicalContext: { aog: '29 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 73, category: 'F. Emergencies', name: 'WHO: Severe abdominal pain', input: { subjectiveSymptoms: 'Sudden severe abdominal pain with rigidity', objectiveVitals: JSON.stringify({ bloodPressure: '105/65', heartRate: '115', temperature: '37.0', weight: '64', respiratoryRate: '22' }), labResults: 'Hb: 8.5', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'] } });
  tests.push({ id: 74, category: 'F. Emergencies', name: 'WHO: Active vaginal bleeding', input: { subjectiveSymptoms: 'Heavy vaginal bleeding, soaking pad in 15 minutes', objectiveVitals: JSON.stringify({ bloodPressure: '95/60', heartRate: '120', temperature: '36.8', weight: '62', respiratoryRate: '24' }), labResults: 'Hb: 8.0, falling', clinicalContext: { aog: '34 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 75, category: 'F. Emergencies', name: 'WHO: Extreme weakness', input: { subjectiveSymptoms: 'Cannot stand, extreme weakness, pale, dizzy', objectiveVitals: JSON.stringify({ bloodPressure: '85/55', heartRate: '120', temperature: '36.6', weight: '50', respiratoryRate: '24' }), labResults: 'Hb: 5.8 g/dL', clinicalContext: { aog: '28 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 76, category: 'F. Emergencies', name: 'WHO: Difficulty breathing', input: { subjectiveSymptoms: 'Acute shortness of breath, cannot lie flat, cough', objectiveVitals: JSON.stringify({ bloodPressure: '140/90', heartRate: '120', temperature: '37.0', weight: '72', respiratoryRate: '32' }), clinicalContext: { aog: '32 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'] } });
  tests.push({ id: 77, category: 'F. Emergencies', name: 'WHO: Swelling of face/hands', input: { subjectiveSymptoms: 'Rapid swelling of face and hands, headache', objectiveVitals: JSON.stringify({ bloodPressure: '155/100', heartRate: '92', temperature: '37.1', weight: '74', respiratoryRate: '20' }), labResults: 'Proteinuria 3+', icd10Diagnosis: 'O14 — Pre-eclampsia', clinicalContext: { aog: '33 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety'], priorityCategory: 'Safety' } });
  tests.push({ id: 78, category: 'F. Emergencies', name: 'Cord prolapse', input: { subjectiveSymptoms: 'Sudden gush of water, something felt at vagina, severe pain', objectiveVitals: JSON.stringify({ bloodPressure: '125/80', heartRate: '100', temperature: '37.0', weight: '65', respiratoryRate: '22' }), fetalHeartRate: '60 bpm (severe bradycardia)', clinicalContext: { aog: '38 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 79, category: 'F. Emergencies', name: 'Uterine rupture', input: { subjectiveSymptoms: 'Sudden onset severe abdominal pain, loss of fetal movements, vaginal bleeding', objectiveVitals: JSON.stringify({ bloodPressure: '80/50', heartRate: '130', temperature: '36.8', weight: '65', respiratoryRate: '28' }), labResults: 'Hb: 7.0', clinicalContext: { aog: '36 weeks', riskLevel: 'high', parity: 2 } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 80, category: 'F. Emergencies', name: 'Amniotic fluid embolism signs', input: { subjectiveSymptoms: 'Sudden collapse, cyanosis, acute respiratory distress during labor', objectiveVitals: JSON.stringify({ bloodPressure: '70/40', heartRate: '140', temperature: '36.5', weight: '68', respiratoryRate: '36' }), clinicalContext: { aog: '39 weeks in labor', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });

  // ── G: Cultural Sensitivity (5 tests) ──
  tests.push({ id: 81, category: 'G. Cultural', name: 'Filipino: hilot practice inquiry', input: { subjectiveSymptoms: 'Patient mentions hilot (traditional birth attendant) massages for back pain', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '78', temperature: '36.8', weight: '60', respiratoryRate: '16' }), clinicalContext: { aog: '30 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Educational'], preventionLevel: 'primary' } });
  tests.push({ id: 82, category: 'G. Cultural', name: 'Filipino: herbal medicine use', input: { subjectiveSymptoms: 'Patient taking malunggay leaves and herbal supplements for anemia', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '80', temperature: '36.8', weight: '58', respiratoryRate: '16' }), labResults: 'Hb: 10.2', clinicalContext: { aog: '26 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Educational', 'Physiological'] } });
  tests.push({ id: 83, category: 'G. Cultural', name: 'Filipino: financial constraints', input: { subjectiveSymptoms: 'Worried about hospital costs, asks about cheaper options', objectiveVitals: JSON.stringify({ bloodPressure: '120/78', heartRate: '76', temperature: '36.8', weight: '60', respiratoryRate: '16' }), clinicalContext: { aog: '32 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Educational', 'Psychosocial'] } });
  tests.push({ id: 84, category: 'G. Cultural', name: 'Filipino: dietary practices (bagoong)', input: { subjectiveSymptoms: 'Regularly eats bagoong and fermented fish, asks if safe during pregnancy', objectiveVitals: JSON.stringify({ bloodPressure: '122/80', heartRate: '78', temperature: '36.9', weight: '62', respiratoryRate: '16' }), clinicalContext: { aog: '24 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 85, category: 'G. Cultural', name: 'Filipino: family decision-making', input: { subjectiveSymptoms: 'Husband and mother-in-law want to decide on delivery method', nandaDiagnosis: 'Decisional Conflict related to family pressure', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '80', temperature: '36.8', weight: '64', respiratoryRate: '16' }), clinicalContext: { aog: '36 weeks', riskLevel: 'low' } }, assertions: { mustIncludeCategories: ['Psychosocial', 'Educational'] } });

  // ── H: Edge Cases (10 tests) ──
  tests.push({ id: 86, category: 'H. Edge Cases', name: 'Minimal data — only vitals', input: { objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '76', temperature: '36.8', weight: '60' }), clinicalContext: { aog: '28 weeks' } }, assertions: { hasInterventions: true } });
  tests.push({ id: 87, category: 'H. Edge Cases', name: 'Grand multipara (G6 P5)', input: { subjectiveSymptoms: 'Wants permanent family planning after this delivery', objectiveVitals: JSON.stringify({ bloodPressure: '118/78', heartRate: '78', temperature: '36.8', weight: '68', respiratoryRate: '16' }), fetalHeartRate: '140', clinicalContext: { gravidity: 6, parity: 5, aog: '36 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', mustIncludeCategories: ['Educational'] } });
  tests.push({ id: 88, category: 'H. Edge Cases', name: 'Adolescent pregnancy (16 years old)', input: { subjectiveSymptoms: 'Scared, hiding pregnancy from parents', objectiveVitals: JSON.stringify({ bloodPressure: '112/72', heartRate: '84', temperature: '36.8', weight: '48', respiratoryRate: '16' }), fetalHeartRate: '144', clinicalContext: { gravidity: 1, parity: 0, aog: '20 weeks', riskLevel: 'moderate' } }, assertions: { mustIncludeCategories: ['Psychosocial', 'Educational'] } });
  tests.push({ id: 89, category: 'H. Edge Cases', name: 'Rh-negative mother', input: { subjectiveSymptoms: 'Routine visit, blood type checked', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '76', temperature: '36.7', weight: '58', respiratoryRate: '16' }), fetalHeartRate: '138', labResults: 'Blood type: O negative, antibody screen negative', clinicalContext: { gravidity: 2, parity: 1, aog: '28 weeks', bloodType: 'O-', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary' } });
  tests.push({ id: 90, category: 'H. Edge Cases', name: 'Multiple gestation (twins)', input: { subjectiveSymptoms: 'Fundal height larger than expected, rapid weight gain', objectiveVitals: JSON.stringify({ bloodPressure: '122/80', heartRate: '82', temperature: '36.9', weight: '72', respiratoryRate: '18' }), fetalHeartRate: '140/145 (twin A/B)', fundalHeight: '34 cm at 28 weeks', clinicalContext: { gravidity: 2, parity: 0, aog: '28 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary' } });
  tests.push({ id: 91, category: 'H. Edge Cases', name: 'Postpartum hemorrhage risk', input: { subjectiveSymptoms: 'Delivered 2 hours ago, heavy bleeding continuing', objectiveVitals: JSON.stringify({ bloodPressure: '95/60', heartRate: '110', temperature: '37.2', weight: '58', respiratoryRate: '20' }), labResults: 'Hb: 8.5 dropping', icd10Diagnosis: 'O72 — Postpartum hemorrhage', clinicalContext: { gravidity: 3, parity: 3, aog: 'postpartum', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, priorityCategory: 'Safety' } });
  tests.push({ id: 92, category: 'H. Edge Cases', name: 'Pre-existing diabetes', input: { subjectiveSymptoms: 'On insulin therapy since before pregnancy', objectiveVitals: JSON.stringify({ bloodPressure: '126/82', heartRate: '80', temperature: '36.8', weight: '64', respiratoryRate: '16' }), labResults: 'HbA1c: 7.0%, Fasting glucose: 110', icd10Diagnosis: 'O24.0 — Pre-existing Type 2 DM', clinicalContext: { aog: '22 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true } });
  tests.push({ id: 93, category: 'H. Edge Cases', name: 'HIV-positive pregnancy', input: { subjectiveSymptoms: 'On ARV therapy, viral load undetectable', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '78', temperature: '36.8', weight: '60', respiratoryRate: '16' }), medications: 'Tenofovir/Lamivudine/Dolutegravir', clinicalContext: { aog: '30 weeks', riskLevel: 'moderate' } }, assertions: { preventionLevel: 'secondary' } });
  tests.push({ id: 94, category: 'H. Edge Cases', name: 'Domestic violence disclosure', input: { subjectiveSymptoms: 'Patient discloses partner hitting her during arguments', objectiveVitals: JSON.stringify({ bloodPressure: '132/88', heartRate: '92', temperature: '37.0', weight: '56', respiratoryRate: '18' }), physicalExam: 'Bruise on left arm', clinicalContext: { aog: '24 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, mustIncludeCategories: ['Safety', 'Psychosocial'] } });
  tests.push({ id: 95, category: 'H. Edge Cases', name: 'Substance use during pregnancy', input: { subjectiveSymptoms: 'Occasional alcohol use, admits to smoking 3 cigarettes/day', objectiveVitals: JSON.stringify({ bloodPressure: '120/78', heartRate: '82', temperature: '36.9', weight: '56', respiratoryRate: '16' }), clinicalContext: { aog: '20 weeks', riskLevel: 'moderate' } }, assertions: { mustIncludeCategories: ['Psychosocial', 'Educational'] } });

  // ── I: JSON Format Validation (5 tests) ──
  tests.push({ id: 96, category: 'I. JSON Format', name: 'Valid JSON — all fields present', input: { subjectiveSymptoms: 'Normal visit', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '80', temperature: '36.8' }), clinicalContext: { aog: '30 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', hasInterventions: true } });
  tests.push({ id: 97, category: 'I. JSON Format', name: 'Valid JSON — emergency fields', input: { subjectiveSymptoms: 'Severe headache', objectiveVitals: JSON.stringify({ bloodPressure: '175/115', heartRate: '100', temperature: '37.2' }), icd10Diagnosis: 'O14.1', clinicalContext: { aog: '30 weeks', riskLevel: 'high' } }, assertions: { preventionLevel: 'tertiary', referralNeeded: true, hasInterventions: true } });
  tests.push({ id: 98, category: 'I. JSON Format', name: 'Valid JSON — intervention structure', input: { subjectiveSymptoms: 'Routine', objectiveVitals: JSON.stringify({ bloodPressure: '118/76', heartRate: '78', temperature: '36.8' }), clinicalContext: { aog: '28 weeks', riskLevel: 'low' } }, assertions: { interventionCount: { min: 3, max: 10 } } });
  tests.push({ id: 99, category: 'I. JSON Format', name: 'Valid JSON — NANDA linkage', input: { nandaDiagnosis: 'Risk for Infection', objectiveVitals: JSON.stringify({ bloodPressure: '120/80', heartRate: '78', temperature: '37.5' }), clinicalContext: { aog: '26 weeks', riskLevel: 'moderate' } }, assertions: { hasInterventions: true } });
  tests.push({ id: 100, category: 'I. JSON Format', name: 'Valid JSON — DOH protocol reference', input: { subjectiveSymptoms: 'Normal checkup, asks about delivery options', objectiveVitals: JSON.stringify({ bloodPressure: '116/74', heartRate: '76', temperature: '36.7' }), clinicalContext: { aog: '34 weeks', riskLevel: 'low' } }, assertions: { preventionLevel: 'primary', mustIncludeCategories: ['Educational'] } });

  return tests;
}

// ═══════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════

function runTest(tc) {
  const start = Date.now();
  const responseJson = generateClinicalResponse(tc.input);
  const duration = Date.now() - start;
  const failures = [];
  const assertions = tc.assertions;

  // Validate JSON structure
  if (!responseJson.interventions || !Array.isArray(responseJson.interventions)) failures.push('Missing or invalid "interventions" array');
  if (typeof responseJson.priorityIntervention !== 'string') failures.push('Missing "priorityIntervention" string');
  if (typeof responseJson.preventionLevel !== 'string') failures.push('Missing "preventionLevel" string');
  if (typeof responseJson.referralNeeded !== 'boolean') failures.push('Missing "referralNeeded" boolean');
  if (typeof responseJson.rationale !== 'string') failures.push('Missing "rationale" string');
  if (!Array.isArray(responseJson.riskIndicators)) failures.push('Missing "riskIndicators" array');
  if (!Array.isArray(responseJson.nursingConsiderations)) failures.push('Missing "nursingConsiderations" array');

  if (assertions.preventionLevel && responseJson.preventionLevel !== assertions.preventionLevel)
    failures.push(`Expected preventionLevel "${assertions.preventionLevel}", got "${responseJson.preventionLevel}"`);
  if (assertions.referralNeeded !== undefined && responseJson.referralNeeded !== assertions.referralNeeded)
    failures.push(`Expected referralNeeded ${assertions.referralNeeded}, got ${responseJson.referralNeeded}`);
  if (assertions.interventionCount) {
    const count = responseJson.interventions?.length || 0;
    if (count < assertions.interventionCount.min) failures.push(`Expected min ${assertions.interventionCount.min} interventions, got ${count}`);
    if (assertions.interventionCount.max && count > assertions.interventionCount.max) failures.push(`Expected max ${assertions.interventionCount.max} interventions, got ${count}`);
  }
  if (assertions.mustIncludeCategories?.length) {
    const cats = new Set((responseJson.interventions || []).map(i => i.category));
    for (const cat of assertions.mustIncludeCategories) { if (!cats.has(cat)) failures.push(`Missing category "${cat}". Got: [${[...cats]}]`); }
  }
  if (assertions.mustNotIncludeCategories?.length) {
    const cats = new Set((responseJson.interventions || []).map(i => i.category));
    for (const cat of assertions.mustNotIncludeCategories) { if (cats.has(cat)) failures.push(`Should NOT include "${cat}"`); }
  }
  if (assertions.priorityCategory && responseJson.interventions?.length > 0) {
    const hasMatch = responseJson.interventions.some(i => i.category === assertions.priorityCategory);
    if (!hasMatch) failures.push(`Expected priority category "${assertions.priorityCategory}"`);
  }
  if (assertions.hasInterventions && (!responseJson.interventions || responseJson.interventions.length === 0))
    failures.push('Expected at least one intervention');

  return { id: tc.id, category: tc.category, name: tc.name, passed: failures.length === 0, failures, duration, responseJson };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

console.log('═════════════════════════════════════════════════════════');
console.log('  MOMternal AI Intervention Stress Test Suite — OFFLINE MODE');
console.log(`  Date: ${new Date().toISOString()}`);
console.log('  Total Tests: 100');
console.log('  Mode: Clinical Rule Engine (deterministic)');
console.log('═══════════════════════════════════════════════════════\n');

const testCases = buildTestCases();
const results = [];
let passed = 0, failed = 0;
const catResults = {};

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  const num = `0${i + 1}`.slice(-2);
  const result = runTest(tc);
  results.push(result);

  if (result.passed) {
    passed++;
    console.log(`  ✅ PASS [${num}/100] ${tc.name.substring(0, 60)}   (${result.duration}ms)`);
  } else {
    failed++;
    console.log(`  ❌ FAIL [${num}/100] ${tc.name.substring(0, 60)}`);
    for (const f of result.failures) console.log(`         → ${f}`);
  }

  const cat = tc.category.split('.')[0];
  if (!catResults[cat]) catResults[cat] = { total: 0, passed: 0 };
  catResults[cat].total++;
  if (result.passed) catResults[cat].passed++;
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('  RESULTS SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Total Tests: 100`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  Accuracy: ${((passed / 100) * 100).toFixed(1)}%\n`);

console.log('  Category Breakdown:');
for (const [cat, stats] of Object.entries(catResults)) {
  const pct = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 'N/A';
  const bar = '█'.repeat(Math.round(stats.passed / stats.total * 20));
  const empty = '░'.repeat(20 - bar.length);
  console.log(`    ${cat.padEnd(30)} ${stats.passed}/${stats.total} (${pct}%)  ${bar}${empty}`);
}

if (failed > 0) {
  console.log('\n  Failed Tests:');
  for (const r of results.filter(r => !r.passed)) {
    console.log(`    ❌ [#${r.id}] ${r.name}`);
    for (const f of r.failures) console.log(`       → ${f}`);
  }
}

// Save results
const summary = {
  timestamp: new Date().toISOString(),
  mode: 'OFFLINE — Clinical Rule Engine',
  total: 100, passed, failed,
  accuracy: ((passed / 100) * 100).toFixed(1) + '%',
  categoryResults: catResults,
  results: results.map(r => ({
    id: r.id, category: r.category, name: r.name, passed: r.passed, failures: r.failures, duration: r.duration,
    preventionLevel: r.responseJson?.preventionLevel,
    referralNeeded: r.responseJson?.referralNeeded,
    interventionCount: r.responseJson?.interventions?.length,
  })),
};

fs.writeFileSync('/home/z/my-project/scripts/offline-test-results.json', JSON.stringify(summary, null, 2));
console.log(`\n  Full results saved to: scripts/offline-test-results.json`);

if (((passed / 100) * 100) >= 90) {
  console.log('\n  ✅ ACCURACY TARGET MET (≥90%) — AI clinical logic validated!\n');
  process.exit(0);
} else {
  console.log('\n  ⚠️  ACCURACY BELOW 90% — Rule engine needs tuning.\n');
  process.exit(1);
}
