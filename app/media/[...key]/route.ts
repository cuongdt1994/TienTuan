import { mediaResponse } from "@/lib/media-response";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  return mediaResponse(key.join("/"));
}
