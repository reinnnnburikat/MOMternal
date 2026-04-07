import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    const nurse = await db.nurse.findUnique({
      where: { id: nurseId },
    });

    if (!nurse) {
      return NextResponse.json({ success: false });
    }

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
