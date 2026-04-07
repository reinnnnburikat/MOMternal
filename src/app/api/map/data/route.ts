import { NextResponse } from "next/server";
import { query } from "@/lib/supabase";

/**
 * GET /api/map/data
 * Returns community risk map data grouped by barangay.
 * - Per-barangay aggregation: patient count and risk distribution
 * - Individual patient markers (patientId + riskLevel only, no names)
 */

// Accurate centroids computed from GADM high-res GeoJSON boundary polygons
const BARANGAY_CENTROIDS: Record<string, [number, number]> = {
  'Bangkal': [14.5478, 121.0103],
  'Bel-Air': [14.5624, 121.0254],
  'Carmona': [14.5763, 121.0163],
  'Cembo': [14.5657, 121.0487],
  'Comembo': [14.5497, 121.0646],
  'Dasmariñas': [14.5398, 121.0300],
  'East Rembo': [14.5551, 121.0605],
  'Forbes Park': [14.5455, 121.0379],
  'Guadalupe Nuevo': [14.5637, 121.0454],
  'Guadalupe Viejo': [14.5664, 121.0391],
  'Kasilawan': [14.5779, 121.0130],
  'La Paz': [14.5698, 121.0062],
  'Magallanes': [14.5352, 121.0180],
  'Olympia': [14.5732, 121.0175],
  'Palanan': [14.5617, 120.9992],
  'Pembo': [14.5447, 121.0599],
  'Pinagkaisahan': [14.5589, 121.0392],
  'Pio Del Pilar': [14.5542, 121.0086],
  'Pitogo': [14.5582, 121.0431],
  'Poblacion': [14.5679, 121.0281],
  'Post Proper Northside': [14.5532, 121.0531],
  'Post Proper Southside': [14.5315, 121.0459],
  'Rizal': [14.5570, 121.0120],
  'San Antonio': [14.5659, 121.0089],
  'San Isidro': [14.5552, 121.0034],
  'San Lorenzo': [14.5563, 121.0179],
  'Santa Cruz': [14.5681, 121.0158],
  'Singkamas': [14.5742, 121.0092],
  'South Cembo': [14.5607, 121.0496],
  'Tejeros': [14.5740, 121.0115],
  'Urdaneta': [14.5580, 121.0279],
  'Valenzuela': [14.5718, 121.0220],
  'West Rembo': [14.5608, 121.0587],
};

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
