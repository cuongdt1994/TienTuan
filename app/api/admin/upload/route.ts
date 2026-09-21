import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteObjectUrls, objectUrl, putObject } from "@/lib/minio";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, uploadSchema } from "@/lib/validations";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = consumeRateLimit(`upload:${getClientKey(request)}`, 40, 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many upload requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });

  const filename = request.headers.get("x-filename") ?? "";
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim() ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "");
  const parsed = uploadSchema.safeParse({ filename, contentType, size: contentLength });
  if (!parsed.success || !request.body) return NextResponse.json({ error: "Unsupported image or size" }, { status: 400 });
  if (!Number.isSafeInteger(contentLength) || contentLength > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "Image is too large" }, { status: 413 });

  const safeName = parsed.data.filename.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 180);
  const objectKey = `originals/${crypto.randomUUID()}-${safeName}`;
  try {
    const body = Readable.fromWeb(request.body as unknown as Parameters<typeof Readable.fromWeb>[0]);
    await putObject(objectKey, body, parsed.data.contentType, parsed.data.size);
    return NextResponse.json({ objectKey, originalUrl: objectUrl(objectKey) });
  } catch (error) {
    await deleteObjectUrls([objectUrl(objectKey)]).catch(() => undefined);
    console.error("Admin upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
