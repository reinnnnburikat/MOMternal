import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/supabase";
import { mapNurseFromDb } from "@/lib/case";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nurseId = searchParams.get("nurseId");

    if (!nurseId) {
      return NextResponse.json(
        { success: false, error: "nurseId is required" },
        { status: 400 }
      );
    }

    // Verify nurse exists in the database
    const row = await queryOne(
      'SELECT * FROM nurse WHERE id = $1',
      [nurseId]
    );

    if (!row) {
      return NextResponse.json({ success: false });
    }

    const nurse = mapNurseFromDb(row);
    return NextResponse.json({
      success: true,
      nurse: {
        id: nurse.id,
        email: nurse.email,
        name: nurse.name,
        licenseNo: nurse.licenseNo,
      },
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
