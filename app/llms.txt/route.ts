import { getSettings } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  const body = `# ${settings.photographerName}\n\nPhotography portfolio featuring commercial, beauty, portrait, and event projects.\n\n## Main pages\n\n- Home: /\n- Contact: /contact\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
