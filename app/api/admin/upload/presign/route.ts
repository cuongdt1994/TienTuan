import { AwsClient } from "aws4fetch";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";
import { uploadSchema } from "@/lib/validations";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "edge";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = consumeRateLimit(`presign:${getClientKey(request)}`, 100, 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many upload requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } });

  const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unsupported image or size" }, { status: 400 });

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_S3_SECRET_ACCESS_KEY;
  const bucket = process.env.MINIO_BUCKET ?? "photography";
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ error: "R2 direct upload is not configured" }, { status: 503 });
  }

  const safeName = parsed.data.filename.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 180);
  const objectKey = `originals/${crypto.randomUUID()}-${safeName}`;
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectKey}`);
  url.searchParams.set("X-Amz-Expires", "900");
  const signed = await new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }).sign(
    new Request(url, { method: "PUT", headers: { "Content-Type": parsed.data.contentType } }),
    { aws: { signQuery: true } },
  );
  return NextResponse.json({ objectKey, uploadUrl: signed.url, contentType: parsed.data.contentType, expiresIn: 900 });
}
