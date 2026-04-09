import { NextResponse } from "next/server";
import { query } from "@/lib/supabase";
import { BARANGAY_CENTROIDS } from "@/components/map/barangay-centroids";

/**
 * GET /api/map/data
 * Returns community risk map data grouped by barangay.
 * - Per-barangay aggregation: patient count and risk distribution
 * - Individual patient markers (patientId + riskLevel only, no names)
 *
 * NOTE: BARANGAY_CENTROIDS are imported from the shared source-of-truth module
 * (src/components/map/barangay-centroids.ts) which uses OSM Overpass API data.
 * Both the frontend map-view and this API route now use the same centroid coordinates.
 */

const MAKATI_CENTER: [number, number] = [14.5547, 121.0244];

export async function GET() {
  try {
    // Fetch all patients with their latest consultation risk level
    const patients = await query(
      `SELECT p.patient_id, p.barangay, p.risk_level AS patient_risk_level,
              (SELECT c.risk_level FROM consultation c
               WHERE c.patient_id = p.id
               ORDER BY c.consultation_date DESC
               LIMIT 1) AS latest_consultation_risk
       FROM patient p`
    );

    // For each patient, determine their "latest" risk level
    const patientRiskData = patients.rows.map((p: Record<string, unknown>) => {
      const latestRisk = p.latest_consultation_risk || p.patient_risk_level || 'low';
      return {
        patientId: p.patient_id,
        barangay: p.barangay || "Unknown",
        riskLevel: latestRisk,
      };
    });

    // Group by barangay
    const barangayMap: Record<
      string,
      {
        barangay: string;
        patientCount: number;
        riskDistribution: { low: number; moderate: number; high: number };
        latestRiskLevel: string;
      }
    > = {};

    for (const pr of patientRiskData) {
      const brgy = pr.barangay;
      if (!barangayMap[brgy]) {
        barangayMap[brgy] = {
          barangay: brgy,
          patientCount: 0,
          riskDistribution: { low: 0, moderate: 0, high: 0 },
          latestRiskLevel: pr.riskLevel,
        };
      }
      barangayMap[brgy].patientCount += 1;

      // Update latest risk level: high > moderate > low
      const riskPriority: Record<string, number> = { high: 3, moderate: 2, low: 1 };
      if ((riskPriority[pr.riskLevel] || 0) > (riskPriority[barangayMap[brgy].latestRiskLevel] || 0)) {
        barangayMap[brgy].latestRiskLevel = pr.riskLevel;
      }

      const dist = barangayMap[brgy].riskDistribution;
      const level = pr.riskLevel as keyof typeof dist;
      if (level in dist) {
        dist[level] += 1;
      }
    }

    // Convert to array and add centroid coords
    const barangayData = Object.values(barangayMap).map((b) => ({
      ...b,
      lat: BARANGAY_CENTROIDS[b.barangay]?.[0] ?? MAKATI_CENTER[0],
      lng: BARANGAY_CENTROIDS[b.barangay]?.[1] ?? MAKATI_CENTER[1],
    }));

    // Flat list of all patient markers with coordinates (no names — DPA)
    const markers = patientRiskData.map((pr) => {
      const centroid = BARANGAY_CENTROIDS[pr.barangay];
      return {
        patientId: pr.patientId,
        barangay: pr.barangay,
        riskLevel: pr.riskLevel,
        lat: centroid?.[0] ?? MAKATI_CENTER[0],
        lng: centroid?.[1] ?? MAKATI_CENTER[1],
      };
    });

    return NextResponse.json({
      barangayData,
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
