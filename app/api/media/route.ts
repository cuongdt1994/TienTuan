import { NextRequest } from "next/server";
import { mediaResponse } from "@/lib/media-response";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  return mediaResponse(key);
}
