import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import { mapHealthHistoryFromDb } from "@/lib/case";

export const dynamic = "force-dynamic";

// Helper: Generate next reference code — HH-YYYYMMDD-XXX
async function generateReferenceCode(): Promise<string> {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const prefix = `HH-${dateStr}-`;

  const rows = await query(
    `SELECT reference_code FROM health_history
     WHERE reference_code LIKE $1
     ORDER BY reference_code DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (rows.rows.length > 0) {
    const lastCode = (rows.rows[0] as Record<string, unknown>)
      .reference_code as string;
    const lastNum = parseInt(lastCode.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

/**
 * GET /api/health-history?patientId=xxx
 * List all health histories for a patient, ordered by created_at DESC
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "patientId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await queryOne(
      "SELECT id FROM patient WHERE id = $1",
      [patientId]
    );
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    const rows = await query(
      `SELECT h.*,
              n.name AS nurse_name
       FROM health_history h
       JOIN nurse n ON h.nurse_id = n.id
       WHERE h.patient_id = $1
       ORDER BY h.created_at DESC`,
      [patientId]
    );

    const formatted = rows.rows.map((row) => ({
      ...mapHealthHistoryFromDb(row as Record<string, unknown>),
      nurseName: (row as Record<string, unknown>).nurse_name,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching health histories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch health histories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health-history
 * Create a new health history record
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientId,
      nurseId,
      pastMedicalHistory,
      previousSurgery,
      historyOfTrauma,
      historyOfBloodTransfusion,
      familyHistoryPaternal,
      familyHistoryMaternal,
      smokingHistory,
      alcoholIntake,
      drugUse,
      dietaryPattern,
      physicalActivity,
      sleepPattern,
      allergies,
      currentMedications,
      immunizationStatus,
      mentalHealthHistory,
    } = body;

    // Validate required fields
    if (!patientId || !nurseId) {
      return NextResponse.json(
        {
          success: false,
          error: "patientId and nurseId are required",
        },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await queryOne(
      "SELECT id FROM patient WHERE id = $1",
      [patientId]
    );
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Verify nurse exists
    const nurse = await queryOne("SELECT id FROM nurse WHERE id = $1", [
      nurseId,
    ]);
    if (!nurse) {
      return NextResponse.json(
        { success: false, error: "Nurse not found" },
        { status: 404 }
      );
    }

    // Generate reference code
    const referenceCode = await generateReferenceCode();

    // Insert health history
    const row = await queryOne(
      `INSERT INTO health_history (
        reference_code, patient_id, nurse_id,
        past_medical_history, previous_surgery, history_of_trauma,
        history_of_blood_transfusion, family_history_paternal, family_history_maternal,
        smoking_history, alcohol_intake, drug_use,
        dietary_pattern, physical_activity, sleep_pattern,
        allergies, current_medications, immunization_status, mental_health_history
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        referenceCode,
        patientId,
        nurseId,
        pastMedicalHistory || null,
        previousSurgery || null,
        historyOfTrauma || null,
        historyOfBloodTransfusion || null,
        familyHistoryPaternal || null,
        familyHistoryMaternal || null,
        smokingHistory || null,
        alcoholIntake || null,
        drugUse || null,
        dietaryPattern || null,
        physicalActivity || null,
        sleepPattern || null,
        allergies || null,
        currentMedications || null,
        immunizationStatus || null,
        mentalHealthHistory || null,
      ]
    );

    // Create audit log (fire-and-forget)
    query(
      `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        nurseId,
        "create",
        "health_history",
        row!.id,
        JSON.stringify({ referenceCode }),
      ]
    ).catch(() => {});

    const result = mapHealthHistoryFromDb(row!);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating health history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create health history" },
      { status: 500 }
    );
  }
}
