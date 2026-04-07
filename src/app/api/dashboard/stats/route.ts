import { NextResponse } from "next/server";
import { query } from "@/lib/supabase";

export async function GET() {
  try {
    // Run all independent queries in parallel
    const [totalResult, highRiskResult, moderateResult, pendingResult, recentResult, riskCountsResult, allConsultationsResult] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM patient`),
      query(`SELECT COUNT(*)::int AS total FROM patient WHERE risk_level = 'high'`),
      query(`SELECT COUNT(*)::int AS total FROM patient WHERE risk_level = 'moderate'`),
      query(`SELECT COUNT(*)::int AS total FROM consultation WHERE referral_status = 'pending'`),
      query(
        `SELECT c.*, p.name AS patient_name, p.patient_id AS patient_patient_id
         FROM consultation c
         JOIN patient p ON c.patient_id = p.id
         ORDER BY c.consultation_date DESC
         LIMIT 5`
      ),
      query(
        `SELECT risk_level, COUNT(*)::int AS count FROM consultation GROUP BY risk_level`
      ),
      query(
        `SELECT consultation_date FROM consultation
         WHERE consultation_date >= date_trunc('month', now()) - interval '5 months'
         ORDER BY consultation_date DESC`
      ),
    ]);

    const totalPatients = (totalResult.rows[0] as Record<string, unknown>)?.total as number || 0;
    const highRiskPatients = (highRiskResult.rows[0] as Record<string, unknown>)?.total as number || 0;
    const moderateRiskPatients = (moderateResult.rows[0] as Record<string, unknown>)?.total as number || 0;
    const pendingReferrals = (pendingResult.rows[0] as Record<string, unknown>)?.total as number || 0;

    // Build recent consultations in the format the frontend expects
    const recentConsultations = recentResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      consultationNo: r.consultation_no,
      consultationDate: r.consultation_date,
      status: r.status,
      riskLevel: r.risk_level,
      patientId: r.patient_id,
      patient: {
        id: r.patient_id,
        name: r.patient_name,
        patientId: r.patient_patient_id,
      },
    }));

    // Build consultationsByRisk
    const consultationsByRisk = { low: 0, moderate: 0, high: 0 };
    for (const rc of riskCountsResult.rows) {
      const level = (rc as Record<string, unknown>).risk_level as keyof typeof consultationsByRisk;
      if (level in consultationsByRisk) {
        (consultationsByRisk as Record<string, number>)[level] = (rc as Record<string, unknown>).count as number;
      }
    }

    // Build monthlyTrend - group by YYYY-MM
    const monthlyTrend: Record<string, number> = {};
    for (const c of allConsultationsResult.rows) {
      const date = new Date((c as Record<string, unknown>).consultation_date as string);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend[key] = (monthlyTrend[key] || 0) + 1;
    }

    const sortedMonthlyTrend = Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    return NextResponse.json({
      totalPatients,
      highRiskPatients,
      moderateRiskPatients,
      pendingReferrals,
      recentConsultations,
      consultationsByRisk,
      monthlyTrend: sortedMonthlyTrend,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
