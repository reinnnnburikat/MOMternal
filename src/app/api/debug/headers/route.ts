import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/debug/headers
 * Temporary debug endpoint to inspect incoming request headers.
 * This helps verify if the gateway injects X-Token.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return NextResponse.json({
    message: "Incoming request headers",
    hasXToken: !!request.headers.get("X-Token"),
    xTokenValue: request.headers.get("X-Token")
      ? `${request.headers.get("X-Token")!.substring(0, 8)}...`
      : null,
    allHeaders: headers,
  });
}
