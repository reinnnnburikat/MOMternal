import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/supabase";
import { mapHealthHistoryFromDb } from "@/lib/case";

export const dynamic = "force-dynamic";

/**
 * GET /api/health-history/search?q=xxx
 * Search health histories by reference code, patient ID, or patient name
 * - reference_code: prefix match
 * - patient_id: exact match
 * - patient name: ILIKE match
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q.trim()) {
      return NextResponse.json(
        { success: false, error: "Search query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const searchTerm = `%${q.trim()}%`;
    const prefixTerm = `${q.trim()}%`;

    const rows = await query(
      `SELECT h.*,
              n.name AS nurse_name,
              p.name AS patient_name, p.patient_id AS patient_patient_id
       FROM health_history h
       JOIN nurse n ON h.nurse_id = n.id
       JOIN patient p ON h.patient_id = p.id
       WHERE h.reference_code ILIKE $1
          OR h.patient_id::text ILIKE $2
          OR p.name ILIKE $2
          OR p.patient_id ILIKE $2
       ORDER BY h.created_at DESC
       LIMIT 50`,
      [prefixTerm, searchTerm]
    );

    const formatted = rows.rows.map((row) => ({
      ...mapHealthHistoryFromDb(row as Record<string, unknown>),
      nurseName: (row as Record<string, unknown>).nurse_name,
      patientName: (row as Record<string, unknown>).patient_name,
      patientPatientId: (row as Record<string, unknown>).patient_patient_id,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error searching health histories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search health histories" },
      { status: 500 }
    );
  }
}
