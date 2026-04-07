import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/map/data
 * Returns community risk map data grouped by barangay.
 * - Per-barangay aggregation: patient count and risk distribution
 * - Individual patient markers (patientId + riskLevel only, no names)
 */

const BARANGAY_CENTROIDS: Record<string, [number, number]> = {
  'Guadalupe Nuevo': [14.5547, 121.0244],
  'Guadalupe Viejo': [14.5580, 121.0220],
  'Poblacion': [14.5535, 121.0310],
  'San Isidro': [14.5580, 121.0140],
  'Valenzuela': [14.5590, 121.0190],
  'Tejeros': [14.5560, 121.0160],
  'Bel-Air': [14.5505, 121.0300],
  'San Lorenzo': [14.5510, 121.0250],
  'Urdaneta': [14.5520, 121.0280],
  'Kasilawan': [14.5550, 121.0200],
  'San Antonio': [14.5470, 121.0260],
  'Bangkal': [14.5490, 121.0180],
  'Carmona': [14.5510, 121.0160],
  'Olympia': [14.5520, 121.0200],
  'Santa Cruz': [14.5600, 121.0120],
  'Cembo': [14.5610, 121.0200],
  'South Cembo': [14.5585, 121.0220],
  'Comembo': [14.5630, 121.0220],
  'Pitogo': [14.5640, 121.0180],
  'Rizal': [14.5570, 121.0120],
  'West Rembo': [14.5590, 121.0320],
  'East Rembo': [14.5600, 121.0340],
  'Pembo': [14.5620, 121.0360],
  'Pinagkaisahan': [14.5550, 121.0150],
  'Magallanes': [14.5440, 121.0300],
  'La Paz': [14.5600, 121.0100],
  'San Miguel': [14.5620, 121.0100],
};

const MAKATI_CENTER: [number, number] = [14.5547, 121.0244];

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
