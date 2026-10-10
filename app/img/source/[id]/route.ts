import { imageSourceBucket, readImageSourceManifest } from "@/lib/image-source";
import { verifyImageSourceToken } from "@/lib/image-source-auth";

export const dynamic = "force-dynamic";

const imageId = /^[A-Za-z0-9_-]{12,80}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!imageId.test(id)) return new Response("Not found", { status: 404 });

  const secret = process.env.AUTH_SECRET ?? "";
  if (!await verifyImageSourceToken(id, request.headers.get("x-image-source-token"), secret)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const bucket = await imageSourceBucket();
    if (!bucket) return new Response("Not found", { status: 404 });
    const manifest = await readImageSourceManifest(bucket, id);
    if (!manifest) return new Response("Not found", { status: 404 });
    const object = await bucket.get(manifest.objectKey);
    if (!object?.body) return new Response("Not found", { status: 404 });

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Type": object.httpMetadata?.contentType ?? manifest.contentType,
      "X-Content-Type-Options": "nosniff",
    });
    if (typeof object.size === "number") headers.set("Content-Length", String(object.size));
    return new Response(object.body, { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
