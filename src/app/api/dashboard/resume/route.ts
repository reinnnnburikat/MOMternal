import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const consultations = await db.consultation.findMany({
      where: {
        status: "in_progress",
        stepCompleted: { gt: 0 },
      },
      include: {
        patient: {
          select: { id: true, name: true, patientId: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ consultations });
  } catch (error) {
    console.error("Resume consultations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch paused consultations" },
      { status: 500 }
    );
  }
}
