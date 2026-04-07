import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper: Generate next consultation number
async function generateConsultationNo(): Promise<string> {
  const prefix = "CONSULT-";

  // Find the highest sequential number
  const lastConsultation = await db.consultation.findFirst({
    orderBy: { consultationNo: "desc" },
    select: { consultationNo: true },
  });

  let nextNum = 1;
  if (lastConsultation) {
    const lastNumStr = lastConsultation.consultationNo.replace(prefix, "");
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
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
    const patient = await db.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
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

    // Generate consultation number
    const consultationNo = await generateConsultationNo();

    // Create consultation with initial status
    const consultation = await db.consultation.create({
      data: {
        consultationNo,
        patientId,
        nurseId,
        consultationDate: consultationDate ? new Date(consultationDate) : new Date(),
        stepCompleted: 0,
        status: "in_progress",
        ...optionalFields,
      },
      include: {
        patient: {
          select: { id: true, patientId: true, name: true },
        },
        nurse: {
          select: { id: true, name: true },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        nurseId,
        action: "create",
        entity: "consultation",
        entityId: consultation.id,
        details: JSON.stringify({
          consultationNo: consultation.consultationNo,
          patientId: patient.patientId,
          patientName: patient.name,
        }),
      },
    });

    return NextResponse.json({ success: true, data: consultation }, { status: 201 });
  } catch (error) {
    console.error("Error creating consultation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create consultation" },
      { status: 500 }
    );
  }
}
