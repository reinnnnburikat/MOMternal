import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/audit
 * Query params: nurseId, action, entity, limit (default 50), offset (default 0)
 * Returns audit logs ordered by timestamp desc with nurse name.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const nurseId = searchParams.get("nurseId");
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 500);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: Record<string, unknown> = {};
    if (nurseId) where.nurseId = nurseId;
    if (action) where.action = action;
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          nurse: {
            select: { name: true, email: true },
          },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, limit, offset });
  } catch (error) {
    console.error("Audit logs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit
 * Body: { nurseId, action, entity, entityId?, details? }
 * Creates an audit log entry. details is JSON.stringified before storage.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nurseId, action, entity, entityId, details } = body;

    if (!nurseId || !action || !entity) {
      return NextResponse.json(
        { error: "nurseId, action, and entity are required" },
        { status: 400 }
      );
    }

    // Verify nurse exists
    const nurse = await db.nurse.findUnique({ where: { id: nurseId } });
    if (!nurse) {
      return NextResponse.json(
        { error: "Nurse not found" },
        { status: 404 }
      );
    }

    const auditLog = await db.auditLog.create({
      data: {
        nurseId,
        action,
        entity,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
      },
    });

    return NextResponse.json({ auditLog }, { status: 201 });
  } catch (error) {
    console.error("Audit log creation error:", error);
    return NextResponse.json(
      { error: "Failed to create audit log" },
      { status: 500 }
    );
  }
}
