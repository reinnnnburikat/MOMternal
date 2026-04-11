import { NextResponse } from "next/server";
import { query } from "@/lib/supabase";
import { BARANGAY_CENTROIDS } from "@/components/map/barangay-centroids";
import { MAKATI_BARANGAYS } from "@/data/makati-barangays";

// Set of valid barangay names (lowercase) for filtering
const VALID_BARANGAYS = new Set(MAKATI_BARANGAYS.map((b) => b.toLowerCase()));

// Case-insensitive centroid lookup (handles casing differences like 'Pio Del Pilar' vs 'Pio del Pilar')
function lookupCentroid(barangay: string): [number, number] | undefined {
  const exact = BARANGAY_CENTROIDS[barangay];
  if (exact) return exact;
  // Fallback: case-insensitive match
  const key = Object.keys(BARANGAY_CENTROIDS).find(
    (k) => k.toLowerCase() === barangay.toLowerCase()
  );
  return key ? BARANGAY_CENTROIDS[key] : undefined;
}

/**
 * GET /api/map/data
 * Returns community risk map data grouped by barangay.
 * - Per-barangay aggregation: patient count and risk distribution
 * - Individual patient markers (patientId + riskLevel only, no names)
 *
 * Risk level priority:
 * 1. patient.risk_level (synced from latest completed consultation — most reliable)
 * 2. Latest completed consultation's risk_level (step_completed >= 6)
 * 3. Fallback to 'low'
 *
 * NOTE: We do NOT use the latest consultation by date because in-progress consultations
 * (step 0) have default risk_level='low' which would override the actual assessed risk.
 */

const MAKATI_CENTER: [number, number] = [14.5547, 121.0244];

export async function GET() {
  try {
    // Fetch all patients with risk level from the patient table (primary source)
    // and fallback from latest COMPLETED consultation only
    const patients = await query(
      `SELECT p.id, p.patient_id, p.barangay, p.risk_level AS patient_risk_level,
              (SELECT c.risk_level FROM consultation c
               WHERE c.patient_id = p.id AND c.step_completed >= 6
               ORDER BY c.created_at DESC NULLS LAST
               LIMIT 1) AS latest_completed_risk
       FROM patient p`
    );

    // For each patient, determine their effective risk level
    // Priority: patient.risk_level > latest completed consultation risk > 'low'
    const patientRiskData = patients.rows
      .filter((p: Record<string, unknown>) => {
        const brgy = (p.barangay as string) || "Unknown";
        return VALID_BARANGAYS.has(brgy.toLowerCase());
      })
      .map((p: Record<string, unknown>) => {
        // Use patient.risk_level as primary (synced from completed consultation saves)
        // Fall back to latest completed consultation if patient risk is null
        const effectiveRisk = p.patient_risk_level || p.latest_completed_risk || 'low';
        return {
          id: p.id,
          patientId: p.patient_id,
          barangay: p.barangay || "Unknown",
          riskLevel: effectiveRisk,
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

    // Convert to array and add centroid coords (case-insensitive lookup)
    const barangayData = Object.values(barangayMap).map((b) => {
      const centroid = lookupCentroid(b.barangay);
      return {
        ...b,
        lat: centroid?.[0] ?? MAKATI_CENTER[0],
        lng: centroid?.[1] ?? MAKATI_CENTER[1],
      };
    });

    // Flat list of all patient markers with coordinates (no names — DPA, case-insensitive lookup)
    const markers = patientRiskData.map((pr) => {
      const centroid = lookupCentroid(pr.barangay);
      return {
        id: pr.id,
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
