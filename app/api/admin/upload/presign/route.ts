import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createUploadUrl } from "@/lib/minio";
import { uploadSchema } from "@/lib/validations";

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = uploadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Unsupported image or size" }, { status: 400 });
  const safeName = parsed.data.filename.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const objectKey = `originals/${crypto.randomUUID()}-${safeName}`;
  const uploadUrl = await createUploadUrl(objectKey, parsed.data.contentType);
  return NextResponse.json({ uploadUrl, objectKey });
}
