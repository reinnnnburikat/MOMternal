import { NextResponse } from "next/server";
import { query } from "@/lib/supabase";

export async function GET() {
  try {
    // 1. Paused consultations (in_progress with step > 0)
    const pausedResult = await query(
      `SELECT c.id, c.consultation_no AS "consultationNo", c.patient_id, c.step_completed AS "stepCompleted",
              c.updated_at AS "updatedAt",
              p.id AS "patientDbId", p.name AS "patientName", p.patient_id AS "patientPatientId",
              p.risk_level AS "patientRiskLevel"
       FROM consultation c
       JOIN patient p ON c.patient_id = p.id
       WHERE c.status = 'in_progress' AND c.step_completed > 0
       ORDER BY c.updated_at DESC
       LIMIT 10`
    );

    // 2. High-risk patients (risk_level = 'high')
    const highRiskResult = await query(
      `SELECT p.id, p.name, p.patient_id AS "patientId", p.risk_level AS "riskLevel",
              p.date_of_birth AS "dateOfBirth", p.barangay, p.updated_at AS "updatedAt"
       FROM patient p
       WHERE p.risk_level = 'high'
       ORDER BY p.updated_at DESC
       LIMIT 10`
    );

    // 3. Upcoming follow-ups: completed consultations from the last 7 days that might need follow-up
    const followUpResult = await query(
      `SELECT c.id, c.consultation_no AS "consultationNo", c.patient_id, c.completed_at AS "completedAt",
              c.risk_level AS "riskLevel",
              p.name AS "patientName", p.patient_id AS "patientPatientId"
       FROM consultation c
       JOIN patient p ON c.patient_id = p.id
       WHERE c.status = 'completed'
         AND c.completed_at >= NOW() - INTERVAL '7 days'
       ORDER BY c.completed_at DESC
       LIMIT 10`
    );

    // 4. Session expiry warning — computed client-side from store, but we can add a hint
    // No DB query needed; the frontend will compute this from lastActivity.

    const notifications = [
      ...pausedResult.rows.map((r: Record<string, unknown>) => ({
        id: `paused-${r.id}` as string,
        type: "paused_consultation" as const,
        title: "Paused Consultation",
        message: `${r.patientName} (Ref: ${r.consultationNo})`,
        description: `Left at step ${r.stepCompleted} of 7`,
        timestamp: r.updatedAt as string,
        action: {
          type: "resume_consultation" as const,
          consultationId: r.id as string,
          patientId: r.patientDbId as string,
        },
      })),
      ...highRiskResult.rows.map((r: Record<string, unknown>) => ({
        id: `highrisk-${r.id}` as string,
        type: "high_risk" as const,
        title: "High-Risk Patient",
        message: `${r.name}${r.barangay ? ` — ${r.barangay}` : ""}`,
        description: "Requires immediate attention",
        timestamp: r.updatedAt as string,
        action: {
          type: "view_patient" as const,
          patientId: r.id as string,
        },
      })),
      ...followUpResult.rows.map((r: Record<string, unknown>) => ({
        id: `followup-${r.id}` as string,
        type: "follow_up" as const,
        title: "Follow-up Needed",
        message: `${r.patientName} (Ref: ${r.consultationNo})`,
        description: `Completed consultation may need follow-up`,
        timestamp: r.completedAt as string,
        action: {
          type: "view_patient" as const,
          patientId: r.patient_id as string,
        },
      })),
    ];

    // Sort by timestamp descending
    notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json({ notifications: [] });
  }
}
