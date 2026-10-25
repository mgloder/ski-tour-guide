import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.placeId || !body.message) {
    return NextResponse.json({ error: "placeId and message required" }, { status: 400 });
  }
  // For now, just log and accept — a real implementation would write to DB
  console.log("[correction]", { placeId: body.placeId, message: body.message, email: body.email ?? "" });
  return NextResponse.json({ ok: true });
}
