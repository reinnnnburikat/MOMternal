import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import { mapConsultationFromDb } from "@/lib/case";

// Helper: Generate next consultation number
async function generateConsultationNo(): Promise<string> {
  const prefix = "CONSULT-";

  const rows = await query(
    `SELECT consultation_no FROM consultation
     ORDER BY consultation_no DESC
     LIMIT 1`
  );

  let nextNum = 1;
  if (rows.rows.length > 0) {
    const lastNumStr = (rows.rows[0] as Record<string, unknown>).consultation_no as string;
    const lastNum = parseInt(lastNumStr.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

// POST /api/patients/[id]/consultations — Create a new consultation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const body = await request.json();
    const { nurseId, consultationDate, ...optionalFields } = body;

    // Validate required fields
    if (!nurseId) {
      return NextResponse.json(
        { success: false, error: "nurseId is required" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await queryOne('SELECT * FROM patient WHERE id = $1', [patientId]);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Verify nurse exists
    const nurse = await queryOne('SELECT * FROM nurse WHERE id = $1', [nurseId]);
    if (!nurse) {
      return NextResponse.json(
        { success: false, error: "Nurse not found" },
        { status: 404 }
      );
    }

    // Generate consultation number
    const consultationNo = await generateConsultationNo();

    // Map optional fields from camelCase to snake_case
    const fieldMapping: Record<string, string> = {
      // OB History (per-visit, moved from Patient)
      gravidity: "gravidity",
      parity: "parity",
      lmp: "lmp",
      aog: "aog",
      bloodType: "blood_type",
      // Type of Visit
      typeOfVisit: "type_of_visit",
      // Assessment
      chiefComplaint: "chief_complaint",
      height: "height",
      weight: "weight",
      bmi: "bmi",
      // SOAP
      subjectiveSymptoms: "subjective_symptoms",
      objectiveVitals: "objective_vitals",
      fetalHeartRate: "fetal_heart_rate",
      fundalHeight: "fundal_height",
      allergies: "allergies",
      medications: "medications",
      // Additional Findings
      physicalExam: "physical_exam",
      labResults: "lab_results",
      notes: "notes",
      // Diagnosis
      icd10Diagnosis: "icd10_diagnosis",
      nandaDiagnosis: "nanda_diagnosis",
      nandaCode: "nanda_code",
      nandaName: "nanda_name",
      // Risk
      riskLevel: "risk_level",
      preventionLevel: "prevention_level",
      // AI
      aiSuggestions: "ai_suggestions",
      selectedInterventions: "selected_interventions",
      // Evaluation
      evaluationStatus: "evaluation_status",
      evaluationNotes: "evaluation_notes",
      interventionEvaluations: "intervention_evaluations",
      // Referral
      referralType: "referral_type",
      referralPriority: "referral_priority",
      referralFacility: "referral_facility",
      referralSummary: "referral_summary",
      referralStatus: "referral_status",
      // Health History (embedded on consultation)
      healthHistory: "health_history",
      healthHistoryRefCode: "health_history_ref_code",
      // Wizard progress
      stepCompleted: "step_completed",
      status: "status",
    };

    // Create consultation with initial status
    const consultationRow = await queryOne(
      `INSERT INTO consultation (consultation_no, patient_id, nurse_id, consultation_date, step_completed, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        consultationNo,
        patientId,
        nurseId,
        consultationDate ? new Date(consultationDate) : new Date(),
        0,
        "in_progress",
      ]
    );

    // Update any optional fields if provided
    if (Object.keys(optionalFields).length > 0) {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIdx = 1;

      for (const [camelKey, value] of Object.entries(optionalFields)) {
        const snakeKey = fieldMapping[camelKey];
        if (!snakeKey) continue; // skip unknown fields
        setClauses.push(`"${snakeKey}" = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }

      if (setClauses.length > 0) {
        await queryOne(
          `UPDATE consultation SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
          [...values, consultationRow!.id]
        );
      }
    }

    // Fetch the complete consultation with relations
    const fullConsultation = await queryOne(
      `SELECT c.*,
              p.id AS patient_obj_id, p.patient_id AS patient_patient_id, p.name AS patient_name,
              n.id AS nurse_obj_id, n.name AS nurse_name
       FROM consultation c
       JOIN patient p ON c.patient_id = p.id
       JOIN nurse n ON c.nurse_id = n.id
       WHERE c.id = $1`,
      [consultationRow!.id]
    );

    // Create audit log (fire-and-forget)
    query(
      `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [nurseId, "create", "consultation", consultationRow!.id, JSON.stringify({
        consultationNo,
        patientId: patient.patient_id,
        patientName: patient.name,
      })]
    ).catch(() => {});

    // Build response matching original format with nested patient/nurse
    const result = {
      ...mapConsultationFromDb(fullConsultation!),
      patient: {
        id: fullConsultation!.patient_obj_id,
        patientId: fullConsultation!.patient_patient_id,
        name: fullConsultation!.patient_name,
      },
      nurse: {
        id: fullConsultation!.nurse_obj_id,
        name: fullConsultation!.nurse_name,
      },
    };

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating consultation:", error);
    const msg = error instanceof Error ? error.message : "Failed to create consultation";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
