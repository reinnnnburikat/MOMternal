import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/map/data
 * Returns community risk map data grouped by barangay.
 * - Per-barangay aggregation: patient count and risk distribution
 * - Individual patient markers (patientId + riskLevel only, no names)
 */
export async function GET() {
  try {
    // Fetch all patients with their barangay and current riskLevel
    const patients = await db.patient.findMany({
      select: {
        patientId: true,
        barangay: true,
        riskLevel: true,
        consultations: {
          select: {
            riskLevel: true,
            consultationDate: true,
          },
          orderBy: { consultationDate: "desc" },
          take: 1, // latest consultation only
        },
      },
    });

    // For each patient, determine their "latest" risk level
    // Use the latest consultation's riskLevel if available, otherwise patient's own
    const patientRiskData = patients.map((p) => {
      const latestConsultationRisk =
        p.consultations.length > 0
          ? p.consultations[0].riskLevel
          : p.riskLevel;
      return {
        patientId: p.patientId,
        barangay: p.barangay || "Unknown",
        riskLevel: latestConsultationRisk,
      };
    });

    // Group by barangay
    const barangayMap: Record<
      string,
      {
        barangay: string;
        patientCount: number;
        riskDistribution: { low: number; moderate: number; high: number };
        patients: { patientId: string; riskLevel: string }[];
      }
    > = {};

    for (const pr of patientRiskData) {
      const brgy = pr.barangay;
      if (!barangayMap[brgy]) {
        barangayMap[brgy] = {
          barangay: brgy,
          patientCount: 0,
          riskDistribution: { low: 0, moderate: 0, high: 0 },
          patients: [],
        };
      }
      barangayMap[brgy].patientCount += 1;
      barangayMap[brgy].patients.push({
        patientId: pr.patientId,
        riskLevel: pr.riskLevel,
      });

      const dist = barangayMap[brgy].riskDistribution;
      const level = pr.riskLevel as keyof typeof dist;
      if (level in dist) {
        dist[level] += 1;
      }
    }

    // Convert to array
    const barangays = Object.values(barangayMap);

    // Flat list of all patient markers (no names)
    const markers = patientRiskData.map((pr) => ({
      patientId: pr.patientId,
      barangay: pr.barangay,
      riskLevel: pr.riskLevel,
    }));

    return NextResponse.json({
      barangays,
      markers,
    });
  } catch (error) {
    console.error("Map data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch map data" },
      { status: 500 }
    );
  }
}
