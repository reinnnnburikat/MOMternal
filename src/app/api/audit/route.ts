import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/supabase";

/**
 * GET /api/audit
 * Query params: action, entity, search, limit (default 50), offset (default 0)
 * Returns audit logs ordered by timestamp desc with nurse name.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const search = searchParams.get("search") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 500);
    const offset = Number(searchParams.get("offset")) || 0;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (action) {
      conditions.push(`a.action = $${paramIdx}`);
      params.push(action);
      paramIdx++;
    }
    if (entity) {
      conditions.push(`a.entity = $${paramIdx}`);
      params.push(entity);
      paramIdx++;
    }
    if (search) {
      conditions.push(`(n.name ILIKE $${paramIdx} OR a.action ILIKE $${paramIdx} OR a.entity ILIKE $${paramIdx} OR a.entity_id ILIKE $${paramIdx} OR a.details::text ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Fetch logs, total count, and action counts in parallel
    const [logsResult, totalResult, actionCountsResult] = await Promise.all([
      query(
        `SELECT a.id, a.nurse_id, a.action, a.entity, a.entity_id, a.details, a.timestamp,
                n.name AS "nurseName"
         FROM audit_log a
         LEFT JOIN nurse n ON a.nurse_id = n.id
         ${whereClause}
         ORDER BY a.timestamp DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*)::int AS total FROM audit_log a ${whereClause}`,
        params
      ),
      query(
        `SELECT action, COUNT(*)::int AS count FROM audit_log a ${whereClause} GROUP BY action`,
        params
      ),
    ]);

    const total = (totalResult.rows[0] as Record<string, unknown>)?.total as number || 0;

    // Build action counts map
    const actionCounts: Record<string, number> = {};
    for (const row of actionCountsResult.rows) {
      const r = row as Record<string, unknown>;
      actionCounts[(r.action as string) || 'unknown'] = (r.count as number) || 0;
    }

    const logs = logsResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      nurseId: r.nurse_id,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      details: r.details,
      timestamp: r.timestamp,
      nurse: {
        name: r.nurseName,
      },
    }));

    return NextResponse.json({ logs, total, actionCounts, limit, offset });
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
    const nurseResult = await query(
      `SELECT id FROM nurse WHERE id = $1`,
      [nurseId]
    );

    if (nurseResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Nurse not found" },
        { status: 404 }
      );
    }

    await query(
      `INSERT INTO audit_log (nurse_id, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        nurseId,
        action,
        entity,
        entityId || null,
        details ? JSON.stringify(details) : null,
      ]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Audit log creation error:", error);
    return NextResponse.json(
      { error: "Failed to create audit log" },
      { status: 500 }
    );
  }
}
