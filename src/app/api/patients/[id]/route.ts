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

// GET /api/patients/[id] — Get single patient with all consultations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        consultations: {
          orderBy: { consultationDate: "desc" },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: patient });
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
    const existing = await db.patient.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Recalculate AOG if LMP is being updated
    if (updateData.lmp !== undefined) {
      if (updateData.lmp) {
        updateData.aog = calculateAOG(new Date(updateData.lmp));
      } else {
        updateData.aog = null;
      }
    }

    // Parse date fields
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    if (updateData.lmp) {
      updateData.lmp = new Date(updateData.lmp);
    }

    const patient = await db.patient.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        nurseId,
        action: "update",
        entity: "patient",
        entityId: patient.id,
        details: JSON.stringify(updateData),
      },
    });

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

    // Verify patient exists
    const patient = await db.patient.findUnique({
      where: { id },
      include: { _count: { select: { consultations: true } } },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check if patient has consultations
    if (patient._count.consultations > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete patient with existing consultations. Remove consultations first.",
        },
        { status: 409 }
      );
    }

    // Delete patient
    await db.patient.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        nurseId,
        action: "delete",
        entity: "patient",
        entityId: id,
        details: JSON.stringify({ patientId: patient.patientId, name: patient.name }),
      },
    });

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
