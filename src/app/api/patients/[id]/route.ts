import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import { mapPatientFromDb, mapConsultationFromDb, mapPatientToDb } from "@/lib/case";

// GET /api/patients/[id] — Get single patient with all consultations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patientRow = await queryOne(
      'SELECT * FROM patient WHERE id = $1',
      [id]
    );

    if (!patientRow) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Fetch consultations for this patient
    const consultations = await query(
      `SELECT * FROM consultation WHERE patient_id = $1 ORDER BY consultation_date DESC`,
      [id]
    );

    const patient = mapPatientFromDb(patientRow);
    return NextResponse.json({
      success: true,
      data: {
        ...patient,
        consultations: consultations.rows.map((c) => mapConsultationFromDb(c as Record<string, unknown>)),
      },
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch patient" },
      { status: 500 }
    );
  }
}

// PUT /api/patients/[id] — Update patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nurseId, ...updateData } = body;

    if (!nurseId) {
      return NextResponse.json(
        { success: false, error: "nurseId is required for audit logging" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const existing = await queryOne('SELECT * FROM patient WHERE id = $1', [id]);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Whitelist: only allow known patient columns to reach the DB
    const ALLOWED_FIELDS = [
      'surname', 'firstName', 'middleInitial', 'nameExtension',
      'dateOfBirth', 'age', 'address', 'blockLotStreet', 'barangay',
      'contactNumber', 'emergencyContact', 'emergencyRelation',
      'occupation', 'religion', 'maritalStatus', 'familyComposition',
      'incomeBracket', 'allergies', 'medicalHistory', 'surgicalHistory',
      'familyHistory', 'obstetricHistory', 'immunizationStatus',
      'currentMedications', 'healthPractices', 'socialHistory',
      'psychosocialHistory', 'riskLevel',
    ];
    const filteredUpdate: Record<string, unknown> = {};
    for (const key of Object.keys(updateData)) {
      if (ALLOWED_FIELDS.includes(key)) filteredUpdate[key] = updateData[key];
    }

    // Map camelCase to snake_case and build update
    const mapped = mapPatientToDb(filteredUpdate);

    // Parse date fields
    if (mapped.date_of_birth) {
      mapped.date_of_birth = new Date(mapped.date_of_birth as string);
    }

    // Protect NOT NULL and system columns from being overwritten
    const PROTECTED_COLUMNS = ['id', 'patient_id', 'name', 'date_of_birth', 'created_at', 'updated_at'];
    for (const col of PROTECTED_COLUMNS) {
      delete mapped[col];
    }

    // Prevent setting address to null (NOT NULL constraint)
    if (mapped.address === null || mapped.address === '') {
      delete mapped.address;
    }

    // Build dynamic UPDATE query
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(mapped)) {
      setClauses.push(`"${key}" = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    // Always update updated_at
    setClauses.push(`"updated_at" = now()`);

    if (setClauses.length === 1) {
      // No actual fields to update
      return NextResponse.json({ success: true, data: mapPatientFromDb(existing) });
    }

    const patientRow = await queryOne(
      `UPDATE patient SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      [...values, id]
    );

    // Create audit log (fire-and-forget)
    query(
      `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [nurseId, "update", "patient", id, JSON.stringify(updateData)]
    ).catch(() => {});

    const patient = mapPatientFromDb(patientRow!);
    return NextResponse.json({ success: true, data: patient });
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update patient" },
      { status: 500 }
    );
  }
}

// DELETE /api/patients/[id] — Delete patient (cascade or prevent)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const nurseId = searchParams.get("nurseId");

    if (!nurseId) {
      return NextResponse.json(
        { success: false, error: "nurseId is required for audit logging" },
        { status: 400 }
      );
    }

    // Verify patient exists and check for consultations
    const patientRow = await queryOne(
      `SELECT p.*, (SELECT COUNT(*) FROM consultation c WHERE c.patient_id = p.id)::int AS consultation_count
       FROM patient p WHERE p.id = $1`,
      [id]
    );

    if (!patientRow) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check if patient has consultations
    if ((patientRow as Record<string, unknown>).consultation_count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete patient with existing consultations. Remove consultations first.",
        },
        { status: 409 }
      );
    }

    // Delete patient
    await query('DELETE FROM patient WHERE id = $1', [id]);

    // Create audit log (fire-and-forget)
    query(
      `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [nurseId, "delete", "patient", id, JSON.stringify({ patientId: patientRow.patient_id, name: patientRow.name })]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete patient" },
      { status: 500 }
    );
  }
}
