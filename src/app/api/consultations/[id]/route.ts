import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import { mapConsultationFromDb } from "@/lib/case";

// Step-to-field mapping: determines which step a field belongs to
const STEP_FIELD_MAP: Record<string, number> = {
  // Step 0: Assessment
  typeOfVisit: 0,
  type_of_visit: 0,
  subjectiveSymptoms: 0,
  subjective_symptoms: 0,
  chiefComplaint: 0,
  chief_complaint: 0,
  gravidity: 0,
  parity: 0,
  lmp: 0,
  aog: 0,
  bloodType: 0,
  blood_type: 0,
  height: 0,
  weight: 0,
  bmi: 0,
  objectiveVitals: 0,
  objective_vitals: 0,
  fetalHeartRate: 0,
  fetal_heart_rate: 0,
  fundalHeight: 0,
  fundal_height: 0,
  allergies: 0,
  medications: 0,
  // Step 1: Health History
  healthHistory: 1,
  health_history: 1,
  healthHistoryRefCode: 1,
  health_history_ref_code: 1,
  // Step 2: Additional Findings
  physicalExam: 2,
  physical_exam: 2,
  labResults: 2,
  lab_results: 2,
  notes: 2,
  // Step 3: Diagnosis
  icd10Diagnosis: 3,
  icd10_diagnosis: 3,
  nandaDiagnosis: 3,
  nanda_diagnosis: 3,
  nandaCode: 3,
  nanda_code: 3,
  nandaName: 3,
  nanda_name: 3,
  // Step 4: AI Summary
  riskLevel: 4,
  risk_level: 4,
  preventionLevel: 4,
  prevention_level: 4,
  aiSuggestions: 4,
  ai_suggestions: 4,
  // Step 5: Care Plan (NIC/NOC/Evaluation)
  selectedInterventions: 5,
  selected_interventions: 5,
  evaluationStatus: 5,
  evaluation_status: 5,
  evaluationNotes: 5,
  evaluation_notes: 5,
  interventionEvaluations: 5,
  intervention_evaluations: 5,
  // Step 6: Referral
  referralType: 6,
  referral_type: 6,
  referralPriority: 6,
  referral_priority: 6,
  referralFacility: 6,
  referral_facility: 6,
  referralSummary: 6,
  referral_summary: 6,
  referralStatus: 6,
  referral_status: 6,
};

// Mapping from camelCase to snake_case for consultation fields
const FIELD_MAPPING: Record<string, string> = {
  healthHistory: "health_history",
  healthHistoryRefCode: "health_history_ref_code",
  typeOfVisit: "type_of_visit",
  subjectiveSymptoms: "subjective_symptoms",
  chiefComplaint: "chief_complaint",
  height: "height",
  weight: "weight",
  bmi: "bmi",
  objectiveVitals: "objective_vitals",
  fetalHeartRate: "fetal_heart_rate",
  fundalHeight: "fundal_height",
  allergies: "allergies",
  medications: "medications",
  physicalExam: "physical_exam",
  labResults: "lab_results",
  notes: "notes",
  icd10Diagnosis: "icd10_diagnosis",
  nandaDiagnosis: "nanda_diagnosis",
  nandaCode: "nanda_code",
  nandaName: "nanda_name",
  riskLevel: "risk_level",
  preventionLevel: "prevention_level",
  aiSuggestions: "ai_suggestions",
  selectedInterventions: "selected_interventions",
  interventionEvaluations: "intervention_evaluations",
  evaluationStatus: "evaluation_status",
  evaluationNotes: "evaluation_notes",
  referralType: "referral_type",
  referralPriority: "referral_priority",
  referralFacility: "referral_facility",
  referralSummary: "referral_summary",
  referralStatus: "referral_status",
};

/**
 * GET /api/consultations/[id]
 * Returns consultation with patient name
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = await queryOne(
      `SELECT c.*,
              p.id AS patient_db_id, p.patient_id, p.name AS patient_name,
              p.date_of_birth AS patient_date_of_birth,
              p.risk_level AS patient_risk_level
       FROM consultation c
       JOIN patient p ON c.patient_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    if (!row) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    // Build response with nested patient (OB fields now on consultation)
    const result = {
      ...mapConsultationFromDb(row),
      patient: {
        id: row.patient_db_id,
        patientId: row.patient_id,
        name: row.patient_name,
        dateOfBirth: row.patient_date_of_birth,
        riskLevel: row.patient_risk_level,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching consultation:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch consultation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/consultations/[id]
 * Updates consultation fields (partial update).
 * Automatically advances stepCompleted based on fields provided.
 * When stepCompleted reaches 7, sets status to "completed".
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check consultation exists (also fetch patient_id for risk level sync)
    const existing = await queryOne(
      'SELECT id, step_completed, status, patient_id FROM consultation WHERE id = $1',
      [id]
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    // Build update data from allowed fields only
    const allowedFields = [
      "healthHistory",
      "healthHistoryRefCode",
      "typeOfVisit",
      "subjectiveSymptoms",
      "chiefComplaint",
      "objectiveVitals",
      "fetalHeartRate",
      "fundalHeight",
      "allergies",
      "medications",
      "height",
      "weight",
      "bmi",
      "physicalExam",
      "labResults",
      "notes",
      "icd10Diagnosis",
      "nandaDiagnosis",
      "nandaCode",
      "nandaName",
      "riskLevel",
      "preventionLevel",
      "aiSuggestions",
      "selectedInterventions",
      "interventionEvaluations",
      "evaluationStatus",
      "evaluationNotes",
      "referralType",
      "referralPriority",
      "referralFacility",
      "referralSummary",
      "referralStatus",
    ] as const;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    let maxStep = existing.step_completed as number;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const snakeKey = FIELD_MAPPING[field];
        setClauses.push(`"${snakeKey}" = $${paramIdx}`);
        values.push(body[field]);
        paramIdx++;

        const fieldStep = STEP_FIELD_MAP[field];
        if (fieldStep !== undefined && fieldStep > maxStep) {
          maxStep = fieldStep;
        }
      }
    }

    // If no updatable fields were provided, return early
    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    // Advance stepCompleted
    setClauses.push(`"step_completed" = $${paramIdx}`);
    values.push(maxStep);
    paramIdx++;

    // When step 6 (Referral, the last step) is completed, set status to "completed"
    if (maxStep >= 6) {
      setClauses.push(`"status" = $${paramIdx}`);
      values.push("completed");
      paramIdx++;
    }

    setClauses.push(`"updated_at" = now()`);

    // Execute update
    const updatedRow = await queryOne(
      `UPDATE consultation SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
      [...values, id]
    );

    // Sync OB fields (gravidity, parity, lmp, aog, blood_type) to patient table
    // Also track step progression for these fields
    const OB_FIELDS = ["gravidity", "parity", "lmp", "aog", "bloodType"];
    const obUpdates: string[] = [];
    const obValues: unknown[] = [];
    let obParamIdx = 1;
    for (const field of OB_FIELDS) {
      if (body[field] !== undefined) {
        const snakeKey = field === 'bloodType' ? 'blood_type' : field;
        obUpdates.push(`"${snakeKey}" = $${obParamIdx}`);
        obValues.push(body[field]);
        obParamIdx++;
        // Track step progression for OB fields (step 0)
        const fieldStep = STEP_FIELD_MAP[field];
        if (fieldStep !== undefined && fieldStep > maxStep) {
          maxStep = fieldStep;
        }
      }
    }
    if (obUpdates.length > 0 && existing.patient_id) {
      obUpdates.push(`"updated_at" = now()`);
      await query(
        `UPDATE patient SET ${obUpdates.join(", ")} WHERE id = $${obParamIdx}`,
        [...obValues, existing.patient_id]
      );
    }

    // Sync risk_level to patient table when it changes in consultation
    // This keeps the patient's current risk level in sync with the latest assessment
    if (body.riskLevel !== undefined && existing.patient_id) {
      await query(
        `UPDATE patient SET risk_level = $1, updated_at = now() WHERE id = $2`,
        [body.riskLevel, existing.patient_id]
      );
    }

    // Fire-and-forget audit log for consultation update
    if (existing.patient_id) {
      const nurseId = body.nurseId || null;
      if (nurseId) {
        query(
          `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [nurseId, "update", "consultation", id, JSON.stringify({ stepCompleted: maxStep, fields: Object.keys(body) })]
        ).catch(() => {});
      }
    }

    // Fetch with patient relation
    const fullRow = await queryOne(
      `SELECT c.*,
              p.id AS patient_db_id, p.patient_id, p.name AS patient_name,
              p.date_of_birth AS patient_date_of_birth,
              p.risk_level AS patient_risk_level
       FROM consultation c
       JOIN patient p ON c.patient_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    const result = {
      ...mapConsultationFromDb(fullRow!),
      patient: {
        id: fullRow!.patient_db_id,
        patientId: fullRow!.patient_id,
        name: fullRow!.patient_name,
        dateOfBirth: fullRow!.patient_date_of_birth,
        riskLevel: fullRow!.patient_risk_level,
        gravidity: fullRow!.gravidity,
        parity: fullRow!.parity,
        aog: fullRow!.aog,
        bloodType: fullRow!.blood_type,
        height: fullRow!.height,
        weight: fullRow!.weight,
        bmi: fullRow!.bmi,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating consultation:", error);
    const msg = error instanceof Error ? error.message : "Failed to update consultation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
