import { NextResponse } from "next/server";
import { query } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await query(
      `SELECT c.id, c.consultation_no AS "consultationNo", c.patient_id, c.step_completed AS "stepCompleted",
              c.updated_at AS "updatedAt",
              p.id AS "patientDbId", p.name AS "patientName", p.patient_id AS "patientPatientId"
       FROM consultation c
       JOIN patient p ON c.patient_id = p.id
       WHERE c.status = 'in_progress' AND c.step_completed > 0
       ORDER BY c.updated_at DESC`
    );

    const consultations = result.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      consultationNo: r.consultationNo,
      patientId: r.patient_id,
      stepCompleted: r.stepCompleted,
      updatedAt: r.updatedAt,
      patient: {
        id: r.patientDbId,
        name: r.patientName,
        patientId: r.patientPatientId,
      },
    }));

    return NextResponse.json({ consultations });
  } catch (error) {
    console.error("Resume consultations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch paused consultations" },
      { status: 500 }
    );
  }
}
