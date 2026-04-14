import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import { mapHealthHistoryFromDb } from "@/lib/case";

export const dynamic = "force-dynamic";

// Field mapping: camelCase (API) -> snake_case (DB)
const FIELD_MAPPING: Record<string, string> = {
  pastMedicalHistory: "past_medical_history",
  previousSurgery: "previous_surgery",
  historyOfTrauma: "history_of_trauma",
  historyOfBloodTransfusion: "history_of_blood_transfusion",
  familyHistoryPaternal: "family_history_paternal",
  familyHistoryMaternal: "family_history_maternal",
  smokingHistory: "smoking_history",
  alcoholIntake: "alcohol_intake",
  drugUse: "drug_use",
  dietaryPattern: "dietary_pattern",
  physicalActivity: "physical_activity",
  sleepPattern: "sleep_pattern",
  allergies: "allergies",
  currentMedications: "current_medications",
  immunizationStatus: "immunization_status",
  mentalHealthHistory: "mental_health_history",
};

const ALLOWED_FIELDS = Object.keys(FIELD_MAPPING);

/**
 * GET /api/health-history/[id]
 * Get a single health history record by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = await queryOne(
      `SELECT h.*,
              n.name AS nurse_name,
              p.name AS patient_name, p.patient_id AS patient_patient_id
       FROM health_history h
       JOIN nurse n ON h.nurse_id = n.id
       JOIN patient p ON h.patient_id = p.id
       WHERE h.id = $1`,
      [id]
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Health history not found" },
        { status: 404 }
      );
    }

    const result = {
      ...mapHealthHistoryFromDb(row),
      nurseName: row.nurse_name,
      patient: {
        id: row.patient_id,
        patientId: row.patient_patient_id,
        name: row.patient_name,
      },
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching health history:", error);
    const msg = error instanceof Error ? error.message : "Failed to fetch health history";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/health-history/[id]
 * Update a health history record
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nurseId } = body;

    // Verify record exists
    const existing = await queryOne(
      "SELECT * FROM health_history WHERE id = $1",
      [id]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Health history not found" },
        { status: 404 }
      );
    }

    // Build dynamic UPDATE query from provided fields
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        const snakeKey = FIELD_MAPPING[field];
        setClauses.push(`"${snakeKey}" = $${paramIdx}`);
        values.push(body[field]);
        paramIdx++;
      }
    }

    // No fields to update
    if (setClauses.length === 0) {
      return NextResponse.json({
        success: true,
        data: mapHealthHistoryFromDb(existing),
      });
    }

    // Always update updated_at
    setClauses.push(`"updated_at" = now()`);

    const updatedRow = await queryOne(
      `UPDATE health_history SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
      [...values, id]
    );

    // Create audit log (fire-and-forget)
    if (nurseId) {
      const changedFields: Record<string, unknown> = {};
      for (const field of ALLOWED_FIELDS) {
        if (body[field] !== undefined) changedFields[field] = body[field];
      }
      query(
        `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          nurseId,
          "update",
          "health_history",
          id,
          JSON.stringify(changedFields),
        ]
      ).catch((err) => { console.error('[AuditLog] Failed to write audit entry:', err); });
    }

    // Fetch with relations
    const fullRow = await queryOne(
      `SELECT h.*,
              n.name AS nurse_name,
              p.name AS patient_name, p.patient_id AS patient_patient_id
       FROM health_history h
       JOIN nurse n ON h.nurse_id = n.id
       JOIN patient p ON h.patient_id = p.id
       WHERE h.id = $1`,
      [id]
    );

    const result = {
      ...mapHealthHistoryFromDb(fullRow!),
      nurseName: fullRow!.nurse_name,
      patient: {
        id: fullRow!.patient_id,
        patientId: fullRow!.patient_patient_id,
        name: fullRow!.patient_name,
      },
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating health history:", error);
    const msg = error instanceof Error ? error.message : "Failed to update health history";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
