import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Use the presigned R2 upload endpoint." }, { status: 410 });
}
