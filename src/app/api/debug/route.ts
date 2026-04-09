import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const logPath = join(process.cwd(), 'debug-headers.json');
  try {
    const existing = JSON.parse(await readFile(logPath, 'utf-8'));
    existing.recent = existing.recent || [];
    existing.recent.push({ timestamp: new Date().toISOString(), headers });
    if (existing.recent.length > 50) existing.recent = existing.recent.slice(-50);
    await writeFile(logPath, JSON.stringify(existing, null, 2));
  } catch {
    await writeFile(logPath, JSON.stringify({ recent: [{ timestamp: new Date().toISOString(), headers }] }));
  }

  const hasXToken = !!request.headers.get('x-token');

  return NextResponse.json({
    hasXToken,
    xTokenValue: hasXToken ? request.headers.get('x-token') : null,
    allHeaders: headers,
  });
}

export async function POST(request: NextRequest) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const logPath = join(process.cwd(), 'debug-headers.json');
  try {
    const existing = JSON.parse(await readFile(logPath, 'utf-8'));
    existing.recent = existing.recent || [];
    existing.recent.push({ timestamp: new Date().toISOString(), method: 'POST', headers });
    if (existing.recent.length > 50) existing.recent = existing.recent.slice(-50);
    await writeFile(logPath, JSON.stringify(existing, null, 2));
  } catch {
    await writeFile(logPath, JSON.stringify({ recent: [{ timestamp: new Date().toISOString(), method: 'POST', headers }] }));
  }

  const hasXToken = !!request.headers.get('x-token');

  return NextResponse.json({
    method: 'POST',
    hasXToken,
    xTokenValue: hasXToken ? request.headers.get('x-token') : null,
    allHeaders: headers,
  });
}
