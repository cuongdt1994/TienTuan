import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";
import { uploadSchema } from "@/lib/validations";
import { isSameOrigin } from "@/lib/request-security";

declare const FixedLengthStream: new (expectedLength: number) => TransformStream<Uint8Array, Uint8Array>;

function decodeFilename(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit(`upload:${getClientKey(request)}`, 100, 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many upload requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });

  const parsed = uploadSchema.safeParse({
    filename: decodeFilename(request.headers.get("X-Upload-Filename") ?? ""),
    contentType: request.headers.get("Content-Type") ?? "",
    size: Number(request.headers.get("X-Upload-Size") ?? 0),
  });
  if (!parsed.success || !request.body) return NextResponse.json({ error: "Unsupported image or size" }, { status: 400 });

  try {
    const context = await getCloudflareContext({ async: true });
    const bucket = context.env.PHOTOGRAPHY_R2;
    if (!bucket) return NextResponse.json({ error: "R2 upload is not configured" }, { status: 503 });

    const safeName = parsed.data.filename.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 180);
    const objectKey = `originals/${crypto.randomUUID()}-${safeName}`;
    const fixedLength = new FixedLengthStream(parsed.data.size);
    const uploadPromise = bucket.put(objectKey, fixedLength.readable, { httpMetadata: { contentType: parsed.data.contentType } });
    try {
      await request.body.pipeTo(fixedLength.writable);
      await uploadPromise;
    } catch (error) {
      await uploadPromise.catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ objectKey });
  } catch (error) {
    console.error("R2 upload failed", error instanceof Error ? { name: error.name, message: error.message } : { error });
    return NextResponse.json({ error: "Could not upload image" }, { status: 500 });
  }
}
