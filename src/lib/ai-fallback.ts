/**
 * MOMternal AI - Fallback Nursing Intervention Generator
 *
 * When the AI service is unavailable (missing X-Token), this module generates
 * context-aware nursing interventions based on clinical assessment data using
 * evidence-based rules derived from DOH/WHO maternal health guidelines.
 *
 * This ensures the AI-Assisted Interventions feature remains functional
 * even when the cloud AI service is temporarily unavailable.
 */

import type { AssessmentData, AIResponse, AIIntervention } from "./ai-prompts";

interface ClinicalFinding {
  severity: "normal" | "elevated" | "concerning" | "critical";
  category: string;
  description: string;
}

function parseBloodPressure(vitals: string | null | undefined): { systolic: number; diastolic: number } | null {
  if (!vitals) return null;
  const match = vitals.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) return null;
  return { systolic: parseInt(match[1]), diastolic: parseInt(match[2]) };
}

function parseFHR(fhr: string | number | null | undefined): number | null {
  if (!fhr) return null;
  const val = typeof fhr === "number" ? fhr : parseInt(String(fhr));
  return isNaN(val) ? null : val;
}

function parseHeartRate(vitals: string | null | undefined): number | null {
  if (!vitals) return null;
  const match = vitals.match(/(?:HR|heart\s*rate|pulse)[^.]*?(\d{2,3})/i);
  if (!match) return null;
  return parseInt(match[1]);
}

function parseTemperature(vitals: string | null | undefined): number | null {
  if (!vitals) return null;
  const match = vitals.match(/(?:temp|temperature)[^.]*?(\d{2,3}(?:\.\d+)?)/i);
  if (!match) return null;
  return parseFloat(match[1]);
}

function parseRespiratoryRate(vitals: string | null | undefined): number | null {
  if (!vitals) return null;
  const match = vitals.match(/(?:RR|respiratory)[^.]*?(\d{2,3})/i);
  if (!match) return null;
  return parseInt(match[1]);
}

function parseHemoglobin(labResults: string | null | undefined): number | null {
  if (!labResults) return null;
  const match = labResults.match(/(?:Hb|hemoglobin)[^.]*?(\d{1,2}(?:\.\d+)?)/i);
  if (!match) return null;
  return parseFloat(match[1]);
}

function parseBloodGlucose(labResults: string | null | undefined): number | null {
  if (!labResults) return null;
  const match = labResults.match(/(?:blood\s*sugar|glucose|BS)[^.]*?(\d{2,3}(?:\.\d+)?)/i);
  if (!match) return null;
  return parseFloat(match[1]);
}

function analyzeFindings(data: AssessmentData): ClinicalFinding[] {
  const findings: ClinicalFinding[] = [];

  // Blood Pressure analysis
  const bp = parseBloodPressure(data.objectiveVitals);
  if (bp) {
    if (bp.systolic >= 170 || bp.diastolic >= 110) {
      findings.push({ severity: "critical", category: "blood_pressure", description: `Severe range BP ${bp.systolic}/${bp.diastolic} - possible eclampsia` });
    } else if (bp.systolic >= 160 || bp.diastolic >= 100) {
      findings.push({ severity: "concerning", category: "blood_pressure", description: `Hypertension Stage 2: ${bp.systolic}/${bp.diastolic}` });
    } else if (bp.systolic >= 140 || bp.diastolic >= 90) {
      findings.push({ severity: "concerning", category: "blood_pressure", description: `Hypertension Stage 1: ${bp.systolic}/${bp.diastolic}` });
    } else if (bp.systolic >= 121 || bp.diastolic >= 81) {
      findings.push({ severity: "elevated", category: "blood_pressure", description: `Elevated BP: ${bp.systolic}/${bp.diastolic}` });
    } else {
      findings.push({ severity: "normal", category: "blood_pressure", description: `Normal BP: ${bp.systolic}/${bp.diastolic}` });
    }
  }

  // Fetal Heart Rate
  const fhr = parseFHR(data.fetalHeartRate);
  if (fhr !== null) {
    if (fhr < 100 || fhr > 170) {
      findings.push({ severity: "critical", category: "fhr", description: `Severe fetal distress: FHR ${fhr} bpm` });
    } else if (fhr < 110) {
      findings.push({ severity: "concerning", category: "fhr", description: `Fetal bradycardia: FHR ${fhr} bpm` });
    } else if (fhr > 160) {
      findings.push({ severity: "concerning", category: "fhr", description: `Fetal tachycardia: FHR ${fhr} bpm` });
    } else {
      findings.push({ severity: "normal", category: "fhr", description: `Normal FHR: ${fhr} bpm` });
    }
  }

  // Maternal Heart Rate
  const hr = parseHeartRate(data.objectiveVitals);
  if (hr !== null) {
    if (hr > 120) {
      findings.push({ severity: "concerning", category: "heart_rate", description: `Severe maternal tachycardia: ${hr} bpm` });
    } else if (hr > 100) {
      findings.push({ severity: "elevated", category: "heart_rate", description: `Maternal tachycardia: ${hr} bpm` });
    } else if (hr < 50) {
      findings.push({ severity: "concerning", category: "heart_rate", description: `Maternal bradycardia: ${hr} bpm` });
    }
  }

  // Temperature
  const temp = parseTemperature(data.objectiveVitals);
  if (temp !== null) {
    if (temp > 38.5) {
      findings.push({ severity: "concerning", category: "temperature", description: `High fever: ${temp}°C - may affect fetus` });
    } else if (temp > 38.0) {
      findings.push({ severity: "concerning", category: "temperature", description: `Fever: ${temp}°C - infection workup needed` });
    } else if (temp > 37.5) {
      findings.push({ severity: "elevated", category: "temperature", description: `Low-grade fever: ${temp}°C` });
    }
  }

  // Respiratory Rate
  const rr = parseRespiratoryRate(data.objectiveVitals);
  if (rr !== null && rr > 20) {
    findings.push({ severity: "elevated", category: "respiratory", description: `Tachypnea: ${rr} breaths/min` });
  }

  // Hemoglobin
  const hb = parseHemoglobin(data.labResults);
  if (hb !== null) {
    if (hb < 7.0) {
      findings.push({ severity: "critical", category: "hemoglobin", description: `Severe anemia: Hb ${hb} g/dL - urgent transfusion evaluation` });
    } else if (hb < 8.0) {
      findings.push({ severity: "concerning", category: "hemoglobin", description: `Moderate anemia: Hb ${hb} g/dL` });
    } else if (hb < 11.0) {
      findings.push({ severity: "elevated", category: "hemoglobin", description: `Mild anemia: Hb ${hb} g/dL` });
    }
  }

  // Blood Glucose
  const glucose = parseBloodGlucose(data.labResults);
  if (glucose !== null) {
    if (glucose >= 126) {
      findings.push({ severity: "concerning", category: "glucose", description: `Overt DM: glucose ${glucose} mg/dL` });
    } else if (glucose >= 95) {
      findings.push({ severity: "elevated", category: "glucose", description: `Gestational DM threshold: glucose ${glucose} mg/dL` });
    }
  }

  // Subjective symptoms analysis
  if (data.subjectiveSymptoms) {
    const symptoms = data.subjectiveSymptoms.toLowerCase();
    if (/bleeding|hemorrhage|spotting/.test(symptoms)) {
      findings.push({ severity: "critical", category: "bleeding", description: "Reported vaginal bleeding" });
    }
    if (/severe headache|blurred vision|visual disturb/.test(symptoms)) {
      findings.push({ severity: "critical", category: "preeclampsia", description: "Severe headache with visual disturbance - preeclampsia warning signs" });
    }
    if (/convulsion|seizure|fit/.test(symptoms)) {
      findings.push({ severity: "critical", category: "eclampsia", description: "Reported convulsions - possible eclampsia EMERGENCY" });
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

  // ICD-10 diagnosis analysis
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

  return findings;
}

function determineRiskLevel(findings: ClinicalFinding[]): "primary" | "secondary" | "tertiary" {
  const hasCritical = findings.some(f => f.severity === "critical");
  const hasConcerning = findings.some(f => f.severity === "concerning");

  if (hasCritical) return "tertiary";
  if (hasConcerning) return "secondary";
  return "primary";
}

function buildInterventions(data: AssessmentData, findings: ClinicalFinding[], riskLevel: string): AIIntervention[] {
  const interventions: AIIntervention[] = [];
  const ctx = data.clinicalContext || {};
  const fhr = parseFHR(data.fetalHeartRate);

  // Always include these base interventions
  interventions.push({
    code: 5602,
    name: "Teaching: Individual",
    description: `Provide individualized health education on pregnancy self-care, warning signs, and when to seek care. Include danger sign recognition per DOH protocol: vaginal bleeding, severe headache, blurred vision, convulsions, severe abdominal pain, decreased fetal movements, fever, and difficulty breathing. Use simple Tagalog and culturally appropriate materials.`,
    category: "Educational",
    relatedNanda: "Deficient Knowledge",
    relatedNoc: "Knowledge: Pregnancy (1805)",
    priority: "medium",
  });

  // Based on findings, add targeted interventions
  const hasBP = findings.some(f => f.category === "blood_pressure" && f.severity !== "normal");
  const hasFHR = findings.some(f => f.category === "fhr" && f.severity !== "normal");
  const hasBleeding = findings.some(f => f.category === "bleeding");
  const hasAnemia = findings.some(f => f.category === "hemoglobin");
  const hasFever = findings.some(f => f.category === "temperature" && f.severity !== "normal");
  const hasPreterm = findings.some(f => f.category === "preterm");
  const hasPreEclampsia = findings.some(f => f.category === "preeclampsia" || f.category === "eclampsia");
  const hasGlucose = findings.some(f => f.category === "glucose");
  const hasEdema = findings.some(f => f.category === "edema");
  const hasNausea = findings.some(f => f.category === "nausea");
  const hasDizziness = findings.some(f => f.category === "dizziness");
  const hasFetalMovement = findings.some(f => f.category === "fetal_movement");

  // Vital Signs Monitoring - always include
  interventions.push({
    code: 3390,
    name: "Vital Signs Monitoring",
    description: "Perform systematic vital signs assessment including BP, HR, RR, temperature, and SpO2. Record and trend values. Compare against maternal baseline and normal pregnancy ranges per WHO guidelines. Document any deviations immediately.",
    category: "Physiological",
    relatedNanda: hasBP ? "Risk for Ineffective Cerebral Tissue Perfusion" : "Decreased Cardiac Output",
    relatedNoc: "Maternal Hemodynamic Status (0402)",
    priority: hasBP ? "high" : "medium",
  });

  // FHR Monitoring
  if (fhr !== null || hasFetalMovement) {
    interventions.push({
      code: 6680,
      name: "Monitoring Fetal Well-Being",
      description: `Systematic fetal surveillance including FHR auscultation and fetal movement assessment${fhr !== null && (fhr < 110 || fhr > 160) ? ". FHR abnormality detected - initiate continuous monitoring, reposition patient to left lateral, administer oxygen, and prepare for urgent obstetric evaluation." : ". Educate mother on kick count method (10 kicks in 2 hours). Report decreased or absent movements immediately."}`,
      category: "Physiological",
      relatedNanda: "Risk for Injury (fetal)",
      relatedNoc: "Fetal Status (2002)",
      priority: hasFHR || hasFetalMovement ? "high" : "medium",
    });
  }

  // Blood Pressure interventions
  if (hasBP) {
    const bpFinding = findings.find(f => f.category === "blood_pressure");
    if (bpFinding && bpFinding.severity === "critical") {
      interventions.push({
        code: 6340,
        name: "Preeclampsia/Eclampsia Management",
        description: "EMERGENCY: Severe range BP detected. Implement preeclampsia protocol: ensure IV access, prepare magnesium sulfate for seizure prophylaxis, continuous vital signs monitoring, strict intake/output monitoring, bed rest in left lateral position. Notify physician immediately for possible antihypertensive management. Prepare for emergency delivery if eclampsia develops.",
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

  // Bleeding interventions
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

  // Anemia interventions
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

  // Fever/Infection interventions
  if (hasFever) {
    interventions.push({
      code: 6900,
      name: "Infection Protection",
      description: "Fever detected - implement infection prevention measures. Assess for source (UTI, respiratory, wound). Obtain cultures as indicated. Administer antipyretics as prescribed (paracetamol safe in pregnancy). Monitor maternal and fetal status. Increased fluid intake encouraged.",
      category: "Safety",
      relatedNanda: "Risk for Infection",
      relatedNoc: "Immune Status (0701)",
      priority: "high",
    });
  }

  // Diabetes interventions
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

  // Emotional support - always include for maternal patients
  interventions.push({
    code: 5270,
    name: "Emotional Support",
    description: "Provide psychological comfort and reassurance. Acknowledge patient concerns about pregnancy, fetal health, and upcoming delivery. Encourage family involvement in care decisions per Filipino cultural values. Assess coping mechanisms and provide anxiety-reduction techniques (deep breathing, guided imagery). Address any fears about labor or complications.",
    category: "Psychosocial",
    relatedNanda: "Anxiety",
    relatedNoc: "Anxiety Level (1211)",
    priority: riskLevel === "tertiary" ? "high" : "medium",
  });

  // Fall prevention
  interventions.push({
    code: 6920,
    name: "Fall Prevention",
    description: "Assess fall risk factors: visual changes, edema, balance changes from pregnancy, orthostatic hypotension. Educate on fall prevention: wear non-slip footwear, use handrails, rise slowly from sitting/lying position, ensure adequate lighting at home. Assist with ambulation if needed.",
    category: "Safety",
    relatedNanda: "Risk for Injury (maternal)",
    relatedNoc: "Fall Prevention Behavior (1909)",
    priority: hasDizziness || hasEdema ? "high" : "low",
  });

  // AOG-specific interventions
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
          description: `Third trimester care (AOG ${weeks} weeks): Intensive fetal well-being surveillance - teach kick count method (10 kicks in 2 hours). Pre-eclampsia screening (BP + proteinuria). Monitor for preterm labor signs. Birth preparedness planning. Breastfeeding education. Counsel on danger signs requiring immediate care.`,
          category: "Physiological",
          relatedNanda: "Risk for Injury (fetal)",
          relatedNoc: "Fetal Status (2002)",
          priority: "high",
        });
      }
    }
  }

  // Referral coordination
  if (riskLevel === "tertiary") {
    interventions.push({
      code: 5500,
      name: "Referral",
      description: "Coordinate urgent referral to higher-level facility (CEmONC-capable hospital) based on clinical severity. Ensure stable transfer: IV access, vital signs documented, patient summary prepared. Notify receiving facility. Accompany patient if possible. BEmONC measures during transfer as needed.",
      category: "Educational",
      relatedNanda: "Risk for Injury (maternal)",
      relatedNoc: "Health Care Coordination (0301)",
      priority: "high",
    });
  }

  return interventions;
}

export function generateFallbackSuggestions(data: AssessmentData): AIResponse {
  const findings = analyzeFindings(data);
  const riskLevel = determineRiskLevel(findings);
  const interventions = buildInterventions(data, findings, riskLevel);
  const ctx = data.clinicalContext || {};

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
  if (ctx.aog) {
    const aogMatch = ctx.aog.match(/(\d+)/);
    const weeks = aogMatch ? parseInt(aogMatch[1]) : null;
    if (weeks !== null && weeks >= 28) {
      considerations.push("Third trimester: emphasize kick counts, birth preparedness plan, and breastfeeding readiness.");
    }
  }

  // Follow-up schedule
  let followUpSchedule: string;
  if (riskLevel === "tertiary") {
    followUpSchedule = "URGENT referral needed — immediate transfer to CEmONC-capable facility. If managed as outpatient, return within 24-48 hours for reassessment.";
  } else if (riskLevel === "secondary") {
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
  const needsReferral = riskLevel === "tertiary";
  const referralReason = needsReferral
    ? findings
        .filter(f => f.severity === "critical")
        .map(f => f.description)
        .join("; ") + ". Requires CEmONC-level care for comprehensive management."
    : "";

  // Rationale
  const rationale = findings.filter(f => f.severity !== "normal").length > 0
    ? `Based on clinical assessment, the following findings indicate ${riskLevel === "tertiary" ? "high-risk status requiring urgent intervention" : riskLevel === "secondary" ? "moderate-risk status requiring close monitoring" : "low-risk status with routine prenatal care"}: ${findings.filter(f => f.severity !== "normal").map(f => f.description).join("; ")}. Interventions selected follow the ADPIE nursing process, aligned with NIC/NANDA/NOC classifications, and comply with DOH National Safe Motherhood Program guidelines and WHO safe motherhood recommendations. ${needsReferral ? "Referral to higher-level facility is indicated per DOH referral criteria." : "Continue routine prenatal monitoring per DOH protocol."}`
    : "Assessment data within normal limits for pregnancy. Interventions focus on health promotion, routine monitoring, and anticipatory guidance per DOH National Safe Motherhood Program and WHO ANC guidelines. Primary prevention approach appropriate for low-risk pregnancy.";

  return {
    interventions,
    priorityIntervention: priorityIntervention?.name || "Teaching: Individual",
    priorityCode: priorityIntervention?.code || 5602,
    rationale,
    preventionLevel: riskLevel as "primary" | "secondary" | "tertiary",
    riskIndicators,
    nursingConsiderations: considerations,
    referralNeeded: needsReferral,
    referralReason,
    followUpSchedule,
  };
}
