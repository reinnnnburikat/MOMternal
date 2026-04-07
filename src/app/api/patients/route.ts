import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import { mapPatientFromDb, mapPatientToDb } from "@/lib/case";

// Helper: Calculate Age of Gestation from LMP
function calculateAOG(lmp: string | Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(lmp).getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return `${weeks}w ${days}d`;
}

// Helper: Generate next patient ID
async function generatePatientId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MOM-${year}-`;

  const rows = await query(
    `SELECT patient_id FROM patient
     WHERE patient_id LIKE $1
     ORDER BY patient_id DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (rows.rows.length > 0) {
    const lastNumStr = (rows.rows[0] as Record<string, unknown>).patient_id as string;
    const lastNum = parseInt(lastNumStr.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// GET /api/patients — List all patients with search, filter, and consultation stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const riskLevel = searchParams.get("riskLevel") || "";
    const barangay = searchParams.get("barangay") || "";

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR patient_id ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (riskLevel) {
      conditions.push(`risk_level = $${paramIndex}`);
      params.push(riskLevel);
      paramIndex++;
    }

    if (barangay) {
      conditions.push(`barangay ILIKE $${paramIndex}`);
      params.push(`%${barangay}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Fetch patients with consultation count and latest consultation date
    const patients = await query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM consultation c WHERE c.patient_id = p.id)::int AS consultation_count,
              (SELECT c2.consultation_date FROM consultation c2
               WHERE c2.patient_id = p.id
               ORDER BY c2.consultation_date DESC
               LIMIT 1) AS latest_consultation_date
       FROM patient p
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params
    );

    // Format response to match original API output (camelCase)
    const formatted = patients.rows.map((p) => {
      const mapped = mapPatientFromDb(p as Record<string, unknown>);
      return {
        ...mapped,
        consultationCount: (p as Record<string, unknown>).consultation_count,
        latestConsultationDate: (p as Record<string, unknown>).latest_consultation_date,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

// POST /api/patients — Create a new patient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nurseId,
      name,
      dateOfBirth,
      address,
      contactNumber,
      emergencyContact,
      emergencyRelation,
      gravidity,
      parity,
      lmp,
      bloodType,
      allergies,
      medicalHistory,
      barangay,
      riskLevel,
    } = body;

    // Validate required fields
    if (!name || !dateOfBirth || !address) {
      return NextResponse.json(
        { success: false, error: "Name, date of birth, and address are required" },
        { status: 400 }
      );
    }

    if (!nurseId) {
      return NextResponse.json(
        { success: false, error: "nurseId is required for audit logging" },
        { status: 400 }
      );
    }

    // Verify nurse exists
    const nurse = await queryOne('SELECT id FROM nurse WHERE id = $1', [nurseId]);
    if (!nurse) {
      return NextResponse.json(
        { success: false, error: "Nurse not found" },
        { status: 404 }
      );
    }

    // Generate patient ID
    const patientId = await generatePatientId();

    // Calculate AOG from LMP if provided
    let aog: string | null = null;
    if (lmp) {
      aog = calculateAOG(lmp);
    }

    // Create patient
    const patientRow = await queryOne(
      `INSERT INTO patient (patient_id, name, date_of_birth, address, contact_number,
        emergency_contact, emergency_relation, gravidity, parity, lmp, aog, blood_type,
        allergies, medical_history, barangay, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        patientId,
        name,
        dateOfBirth,
        address,
        contactNumber || null,
        emergencyContact || null,
        emergencyRelation || null,
        gravidity || 0,
        parity || 0,
        lmp ? new Date(lmp) : null,
        aog,
        bloodType || null,
        allergies || null,
        medicalHistory || null,
        barangay || null,
        riskLevel || "low",
      ]
    );

    // Create audit log (fire-and-forget)
    if (patientRow) {
      query(
        `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [nurseId, "create", "patient", patientRow.id, JSON.stringify({ patientId: patientRow.patient_id, name: patientRow.name })]
      ).catch(() => {});
    }

    const patient = mapPatientFromDb(patientRow!);
    return NextResponse.json({ success: true, data: patient }, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create patient" },
      { status: 500 }
    );
  }
}
