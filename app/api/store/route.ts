import { publicCatalog } from "@/lib/server/store-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await publicCatalog(), {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" },
  });
}
