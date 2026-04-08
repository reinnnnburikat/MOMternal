import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import { mapConsultationFromDb } from "@/lib/case";

// Step-to-field mapping: determines which step a field belongs to
const STEP_FIELD_MAP: Record<string, number> = {
  // Step 1: SOAP Subjective
  subjectiveSymptoms: 1,
  subjective_symptoms: 1,
  // Step 2: SOAP Objective
  objectiveVitals: 2,
  objective_vitals: 2,
  fetalHeartRate: 2,
  fetal_heart_rate: 2,
  fundalHeight: 2,
  fundal_height: 2,
  allergies: 2,
  // Step 3: Findings
  physicalExam: 3,
  physical_exam: 3,
  labResults: 3,
  lab_results: 3,
  notes: 3,
  // Step 4: Diagnosis
  icd10Diagnosis: 4,
  icd10_diagnosis: 4,
  nandaDiagnosis: 4,
  nanda_diagnosis: 4,
  // Step 5: Risk
  riskLevel: 5,
  risk_level: 5,
  // Step 6: AI
  aiSuggestions: 6,
  ai_suggestions: 6,
  selectedInterventions: 6,
  selected_interventions: 6,
  // Step 7: Evaluation & Referral
  evaluationStatus: 7,
  evaluation_status: 7,
  evaluationNotes: 7,
  evaluation_notes: 7,
  referralSummary: 7,
  referral_summary: 7,
  referralStatus: 7,
  referral_status: 7,
};

// Mapping from camelCase to snake_case for consultation fields
const FIELD_MAPPING: Record<string, string> = {
  subjectiveSymptoms: "subjective_symptoms",
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
  riskLevel: "risk_level",
  aiSuggestions: "ai_suggestions",
  selectedInterventions: "selected_interventions",
  evaluationStatus: "evaluation_status",
  evaluationNotes: "evaluation_notes",
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
              p.date_of_birth AS patient_date_of_birth, p.blood_type AS patient_blood_type,
              p.gravidity AS patient_gravidity, p.parity AS patient_parity,
              p.aog AS patient_aog, p.risk_level AS patient_risk_level
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

    // Build response matching original format with nested patient
    const result = {
      ...mapConsultationFromDb(row),
      patient: {
        id: row.patient_db_id,
        patientId: row.patient_id,
        name: row.patient_name,
        dateOfBirth: row.patient_date_of_birth,
        bloodType: row.patient_blood_type,
        gravidity: row.patient_gravidity,
        parity: row.patient_parity,
        aog: row.patient_aog,
        riskLevel: row.patient_risk_level,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching consultation:", error);
    return NextResponse.json(
      { error: "Failed to fetch consultation" },
      { status: 500 }
    );
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
      "subjectiveSymptoms",
      "objectiveVitals",
      "fetalHeartRate",
      "fundalHeight",
      "allergies",
      "medications",
      "physicalExam",
      "labResults",
      "notes",
      "icd10Diagnosis",
      "nandaDiagnosis",
      "riskLevel",
      "aiSuggestions",
      "selectedInterventions",
      "evaluationStatus",
      "evaluationNotes",
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

    // When step 7 is completed, set status to "completed"
    if (maxStep >= 7) {
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

    // Sync risk_level to patient table when it changes in consultation
    // This keeps the patient's current risk level in sync with the latest assessment
    if (body.riskLevel !== undefined && existing.patient_id) {
      await query(
        `UPDATE patient SET risk_level = $1, updated_at = now() WHERE id = $2`,
        [body.riskLevel, existing.patient_id]
      );
    }

    // Fetch with patient relation
    const fullRow = await queryOne(
      `SELECT c.*,
              p.id AS patient_db_id, p.patient_id, p.name AS patient_name,
              p.date_of_birth AS patient_date_of_birth, p.blood_type AS patient_blood_type,
              p.gravidity AS patient_gravidity, p.parity AS patient_parity,
              p.aog AS patient_aog, p.risk_level AS patient_risk_level
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
        bloodType: fullRow!.patient_blood_type,
        gravidity: fullRow!.patient_gravidity,
        parity: fullRow!.patient_parity,
        aog: fullRow!.patient_aog,
        riskLevel: fullRow!.patient_risk_level,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating consultation:", error);
    return NextResponse.json(
      { error: "Failed to update consultation" },
      { status: 500 }
    );
  }
}
