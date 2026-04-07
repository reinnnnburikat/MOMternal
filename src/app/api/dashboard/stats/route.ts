import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Run all independent counts in parallel
    const [
      totalPatients,
      highRiskPatients,
      moderateRiskPatients,
      pendingReferrals,
      recentConsultations,
      riskCounts,
      allConsultations,
    ] = await Promise.all([
      db.patient.count(),
      db.patient.count({ where: { riskLevel: "high" } }),
      db.patient.count({ where: { riskLevel: "moderate" } }),
      db.consultation.count({ where: { referralStatus: "pending" } }),
      db.consultation.findMany({
        take: 5,
        orderBy: { consultationDate: "desc" },
        include: {
          patient: {
            select: { name: true, patientId: true },
          },
        },
      }),
      db.consultation.groupBy({
        by: ["riskLevel"],
        _count: { riskLevel: true },
      }),
      // Fetch last 6 months of consultations for monthly trend
      db.consultation.findMany({
        where: {
          consultationDate: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 5,
              1
            ),
          },
        },
        select: {
          consultationDate: true,
        },
      }),
    ]);

    // Build consultationsByRisk
    const consultationsByRisk = {
      low: 0,
      moderate: 0,
      high: 0,
    };
    for (const rc of riskCounts) {
      const level = rc.riskLevel as keyof typeof consultationsByRisk;
      if (level in consultationsByRisk) {
        consultationsByRisk[level] = rc._count.riskLevel;
      }
    }

    // Build monthlyTrend - group by YYYY-MM
    const monthlyTrend: Record<string, number> = {};
    for (const c of allConsultations) {
      const key = `${c.consultationDate.getFullYear()}-${String(c.consultationDate.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend[key] = (monthlyTrend[key] || 0) + 1;
    }

    // Sort monthly trend by key ascending
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
