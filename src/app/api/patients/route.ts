import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper: Calculate Age of Gestation from LMP
function calculateAOG(lmp: Date): string {
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

  // Find the highest sequential number for this year
  const lastPatient = await db.patient.findFirst({
    where: {
      patientId: { startsWith: prefix },
    },
    orderBy: { patientId: "desc" },
    select: { patientId: true },
  });

  let nextNum = 1;
  if (lastPatient) {
    const lastNumStr = lastPatient.patientId.replace(prefix, "");
    const lastNum = parseInt(lastNumStr, 10);
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

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { patientId: { contains: search } },
      ];
    }

    if (riskLevel) {
      where.riskLevel = riskLevel;
    }

    if (barangay) {
      where.barangay = { contains: barangay };
    }

    const patients = await db.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { consultations: true },
        },
        consultations: {
          select: { consultationDate: true },
          orderBy: { consultationDate: "desc" },
          take: 1,
        },
      },
    });

    // Flatten response with consultationCount and latestConsultationDate
    const formatted = patients.map((p) => ({
      id: p.id,
      patientId: p.patientId,
      name: p.name,
      dateOfBirth: p.dateOfBirth,
      address: p.address,
      contactNumber: p.contactNumber,
      emergencyContact: p.emergencyContact,
      emergencyRelation: p.emergencyRelation,
      gravidity: p.gravidity,
      parity: p.parity,
      lmp: p.lmp,
      aog: p.aog,
      bloodType: p.bloodType,
      allergies: p.allergies,
      medicalHistory: p.medicalHistory,
      barangay: p.barangay,
      riskLevel: p.riskLevel,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      consultationCount: p._count.consultations,
      latestConsultationDate:
        p.consultations.length > 0
          ? p.consultations[0].consultationDate
          : null,
    }));

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
    const nurse = await db.nurse.findUnique({ where: { id: nurseId } });
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
    const patient = await db.patient.create({
      data: {
        patientId,
        name,
        dateOfBirth: new Date(dateOfBirth),
        address,
        contactNumber: contactNumber || null,
        emergencyContact: emergencyContact || null,
        emergencyRelation: emergencyRelation || null,
        gravidity: gravidity || 0,
        parity: parity || 0,
        lmp: lmp ? new Date(lmp) : null,
        aog,
        bloodType: bloodType || null,
        allergies: allergies || null,
        medicalHistory: medicalHistory || null,
        barangay: barangay || null,
        riskLevel: riskLevel || "low",
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        nurseId,
        action: "create",
        entity: "patient",
        entityId: patient.id,
        details: JSON.stringify({ patientId: patient.patientId, name: patient.name }),
      },
    });

    return NextResponse.json({ success: true, data: patient }, { status: 201 });
  } catch (error) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create patient" },
      { status: 500 }
    );
  }
}
