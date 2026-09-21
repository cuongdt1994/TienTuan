import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createUploadUrl } from "@/lib/minio";
import { uploadSchema } from "@/lib/validations";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit(`upload-presign:${getClientKey(request)}`, 40, 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many upload requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });
  const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unsupported image or size" }, { status: 400 });
  const safeName = parsed.data.filename.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 180);
  const objectKey = `originals/${crypto.randomUUID()}-${safeName}`;
  const uploadUrl = await createUploadUrl(objectKey, parsed.data.contentType, parsed.data.size);
  return NextResponse.json({ uploadUrl, objectKey });
}
