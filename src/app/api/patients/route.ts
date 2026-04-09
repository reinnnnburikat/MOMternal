import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/supabase";
import { mapPatientFromDb } from "@/lib/case";

// Helper: Calculate age from date of birth
function calculateAge(dob: string | Date): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
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

// Helper: Build display name from structured name fields
function buildDisplayName(data: Record<string, string>): string {
  const { surname, firstName, middleInitial, nameExtension } = data;
  let name = `${surname}, ${firstName}`;
  if (middleInitial) name += ` ${middleInitial}.`;
  if (nameExtension) name += ` ${nameExtension}`;
  return name;
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
      // Search across patient fields AND related consultation fields
      // Includes: name, patient_id, surname, first_name, barangay, address,
      // consultation_no (history ID), nanda_diagnosis, icd10_diagnosis, risk_level
      conditions.push(`(
        p.name ILIKE $${paramIndex}
        OR p.patient_id ILIKE $${paramIndex}
        OR p.surname ILIKE $${paramIndex}
        OR p.first_name ILIKE $${paramIndex}
        OR p.barangay ILIKE $${paramIndex}
        OR p.address ILIKE $${paramIndex}
        OR EXISTS (
          SELECT 1 FROM consultation c
          WHERE c.patient_id = p.id
            AND (c.consultation_no ILIKE $${paramIndex}
                 OR c.nanda_diagnosis ILIKE $${paramIndex}
                 OR c.icd10_diagnosis ILIKE $${paramIndex}
                 OR c.risk_level ILIKE $${paramIndex}
                 OR c.status ILIKE $${paramIndex})
        )
      )`);
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
      surname,
      firstName,
      middleInitial,
      nameExtension,
      dateOfBirth,
      address,
      blockLotStreet,
      contactNumber,
      emergencyContact,
      emergencyRelation,
      barangay,
      occupation,
      religion,
      maritalStatus,
      familyComposition,
      incomeBracket,
      healthHistory,
      allergies,
      surgicalHistory,
      familyHistory,
      obstetricHistory,
      immunizationStatus,
      currentMedications,
      healthPractices,
      socialHistory,
      psychosocialHistory,
    } = body;

    // Validate required fields (barangay or address must be present)
    if (!surname || !firstName || !dateOfBirth) {
      return NextResponse.json(
        { success: false, error: "Surname, first name, and date of birth are required" },
        { status: 400 }
      );
    }

    if (!barangay && !address) {
      return NextResponse.json(
        { success: false, error: "Either barangay or address is required" },
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

    // Calculate age
    const age = calculateAge(dateOfBirth);

    // Build display name
    const name = buildDisplayName({
      surname,
      firstName,
      middleInitial: middleInitial || "",
      nameExtension: nameExtension || "",
    });

    // Parse healthHistory JSON blob if provided — distribute sections to appropriate DB columns
    let parsedHH: Record<string, unknown> | null = null;
    if (healthHistory) {
      try {
        parsedHH = typeof healthHistory === 'string' ? JSON.parse(healthHistory) : healthHistory;
      } catch { /* keep as-is */ }
    }

    const dbMedicalHistory = parsedHH?.pastMedicalHistory
      ? JSON.stringify(parsedHH.pastMedicalHistory)
      : (healthHistory || null);
    const dbSurgicalHistory = parsedHH?.previousSurgery
      ? JSON.stringify(parsedHH.previousSurgery)
      : (surgicalHistory || null);
    const dbFamilyHistory = parsedHH?.familyHistory
      ? JSON.stringify(parsedHH.familyHistory)
      : (familyHistory || null);

    // Create patient
    const patientRow = await queryOne(
      `INSERT INTO patient (patient_id, surname, first_name, middle_initial, name_extension, name, date_of_birth, age,
        address, block_lot_street, barangay, contact_number, emergency_contact, emergency_relation,
        occupation, religion, marital_status, family_composition, income_bracket,
        allergies, medical_history, surgical_history, family_history, obstetric_history,
        immunization_status, current_medications, health_practices, social_history, psychosocial_history,
        risk_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
        $23, $24, $25, $26, $27, $28, $29, $30)
       RETURNING *`,
      [
        patientId,
        surname,
        firstName,
        middleInitial || null,
        nameExtension || null,
        name,
        dateOfBirth,
        age,
        address || null,
        blockLotStreet || null,
        barangay || null,
        contactNumber || null,
        emergencyContact || null,
        emergencyRelation || null,
        occupation || null,
        religion || null,
        maritalStatus || null,
        familyComposition || null,
        incomeBracket || null,
        allergies || null,
        dbMedicalHistory,
        dbSurgicalHistory,
        dbFamilyHistory,
        obstetricHistory || null,
        immunizationStatus || null,
        currentMedications || null,
        healthPractices || null,
        socialHistory || null,
        psychosocialHistory || null,
        "low",
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
