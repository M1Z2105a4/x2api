import { buildCachedFeedXml } from "@/lib/rss";
import { listItemsByFeedToken } from "@/lib/item-service";

type RouteContext = {
  params: Promise<{
    feedToken: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { feedToken } = await context.params;
  const { searchParams } = new URL(request.url);
  const rawToken = feedToken.endsWith(".xml") ? feedToken.slice(0, -4) : feedToken;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
  const items = await listItemsByFeedToken(rawToken, limit);
  const xml = await buildCachedFeedXml(rawToken, items);

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
