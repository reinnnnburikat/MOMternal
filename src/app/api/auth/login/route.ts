import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const nurse = await db.nurse.findUnique({
      where: { email },
    });

    if (!nurse) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Compare password using bcryptjs
    const isPasswordValid = await bcrypt.compare(password, nurse.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Return success with nurse data (excluding password)
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
