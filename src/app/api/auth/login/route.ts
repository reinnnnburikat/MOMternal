import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/supabase";
import { mapNurseFromDb } from "@/lib/case";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find nurse by email
    const row = await queryOne(
      'SELECT * FROM nurse WHERE email = $1',
      [email]
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Compare password using bcryptjs
    const isPasswordValid = await bcrypt.compare(password, row.password as string);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Return success with nurse data (excluding password)
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
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
