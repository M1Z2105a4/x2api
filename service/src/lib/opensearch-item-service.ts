import { resolveAuthorPresentation, type AuthorPresentation } from "@/lib/author-presentation";
import { getSql } from "@/lib/db";
import { filterExistingItemIds } from "@/lib/item-visibility";
import { getOpenSearchClient, getOpenSearchItemsIndex } from "@/lib/opensearch";
import { buildCursorPage, decodeCursor, normalizeLimit } from "@/lib/pagination";
import { cachedJson } from "@/lib/redis-cache";
import { asRows } from "@/lib/sql-result";
import type { TargetSource } from "@/lib/targets";
import { buildBlockRuleMustNotClauses, type FeedBlockRule } from "@/lib/feed-block-rules";

type ItemQuery = {
  clientId: string;
  limit?: number;
  cursor?: string | null;
  keyword?: string | null;
  target?: string | null;
  tags?: string[] | null;
  categories?: string[] | null;
  since?: string | null;
  sourceScope?: "user" | "public" | "all" | null;
};

type FeedTokenQuery = {
  feedToken: string;
  limit?: number;
};

type ItemCursor = {
  sortTime: string;
  storedAt: string;
  id: string;
};

type ItemRecordBase = {
  id: string;
  target: string;
  targetLink: string | null;
  source: TargetSource;
  kind: "user" | "keyword" | "channel" | "site";
  category: string | null;
  isSensitive: boolean;
  tags: string[];
  author: string | null;
  fullname: string | null;
  title: string | null;
  content: string | null;
  rawContent: string | null;
  translatedContent: string | null;
  link: string | null;
  xUrl: string | null;
  images: string[];
  videoUrl: string | null;
  expiresAt: string;
  videoUrlExpiresAt: string;
  publishedAt: string | null;
  storedAt: string;
  guid: string;
  isRetweet: boolean;
};

export type OpenSearchItemRecord = ItemRecordBase & AuthorPresentation;

export type OpenSearchListItemsResult = {
  items: OpenSearchItemRecord[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type OpenSearchItemSource = {
  id: string;
  target_id?: string | null;
  guid?: string | null;
  title?: string | null;
  content?: string | null;
  raw_content?: string | null;
  translated_content?: string | null;
  author?: string | null;
  fullname?: string | null;
  display_author?: string | null;
  display_handle?: string | null;
  author_profile_url?: string | null;
  author_profile_platform?: string | null;
  link?: string | null;
  x_url?: string | null;
  images?: unknown;
  video_url?: string | null;
  expires_at: string;
  video_url_expires_at: string;
  published_at?: string | null;
  stored_at: string;
  sort_at?: string | null;
  source: TargetSource;
  target: string;
  target_link?: string | null;
  kind: "user" | "keyword" | "channel" | "site";
  category?: string | null;
  tags?: unknown;
  is_retweet?: boolean | null;
  is_sensitive?: boolean | null;
  item_role?: string | null;
  is_public_pool?: boolean | null;
};

type OpenSearchHit = {
  _id: string;
  _source?: OpenSearchItemSource;
};

type OpenSearchSearchResponse = {
  body?: {
    hits?: {
      hits?: OpenSearchHit[];
    };
  };
  hits?: {
    hits?: OpenSearchHit[];
  };
};

type OpenSearchRow = ItemRecordBase & {
  sortTime: string;
} & Partial<AuthorPresentation>;

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function normalizedUnique(values: Array<string | null | undefined>) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(key);
  }
  return result;
}

function terms(field: string, values: string[]) {
  if (values.length === 0) {
    return null;
  }
  return { terms: { [field]: values } };
}

function escapeOpenSearchWildcard(value: string) {
  return value.replace(/[\\*?]/g, (match) => `\\${match}`);
}

function getHits(response: OpenSearchSearchResponse) {
  return response.body?.hits?.hits ?? response.hits?.hits ?? [];
}

function isItemCursor(value: unknown): value is ItemCursor {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<ItemCursor>;
  return (
    typeof candidate.sortTime === "string" &&
    typeof candidate.storedAt === "string" &&
    typeof candidate.id === "string"
  );
}

async function getSubscribedTargetIds(clientId: string) {
  return cachedJson("os-items-subscriptions", [clientId], 120, async () => {
    const sql = getSql();
    const rows = asRows<{ targetId: string }>(await sql`
      SELECT target_id AS "targetId"
      FROM subscriptions
      WHERE client_id = ${clientId}
    `);
    return rows.map((row) => row.targetId);
  });
}

async function getItemPublicPoolTargetIds() {
  return cachedJson("os-items-public-targets", [], 120, async () => {
    const sql = getSql();
    const rows = asRows<{ targetId: string }>(await sql`
      SELECT target_id AS "targetId"
      FROM target_profiles
      WHERE is_item_public_pool = TRUE
    `);
    return rows.map((row) => row.targetId);
  });
}

async function getEnabledBlockRules(clientId: string): Promise<FeedBlockRule[]> {
  const sql = getSql();
  return asRows<FeedBlockRule>(await sql`
    SELECT
      rule_type AS "ruleType",
      normalized_value AS "normalizedValue",
      match_mode AS "matchMode",
      platform
    FROM feed_block_rules
    WHERE client_id = ${clientId}
      AND enabled = TRUE
  `);
}

async function getFeedClient(feedToken: string) {
  const sql = getSql();
  const rows = asRows<{ clientId: string }>(await sql`
    SELECT id AS "clientId"
    FROM clients
    WHERE feed_token = ${feedToken}
      AND status = 'active'
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function normalizeCategoryFilters(categories: string[]) {
  if (categories.length === 0) {
    return [];
  }
  const sql = getSql();
  const rows = asRows<{ slug: string; name: string }>(await sql`
    SELECT slug, name
    FROM categories
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(${JSON.stringify(categories)}::jsonb) AS selected_category(name)
      WHERE LOWER(categories.slug) = selected_category.name
         OR LOWER(categories.name) = selected_category.name
    )
  `);
  return normalizedUnique([
    ...categories,
    ...rows.flatMap((row) => [row.slug, row.name]),
  ]);
}

async function getSensitiveCategorySet() {
  const categories = await cachedJson("os-sensitive-categories", [], 300, async () => {
    const sql = getSql();
    const rows = asRows<{ slug: string }>(await sql`
      SELECT slug
      FROM categories
      WHERE is_sensitive = TRUE
    `);
    return rows.map((row) => row.slug.trim().toLowerCase()).filter(Boolean);
  });
  return new Set(categories);
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function toRow(source: OpenSearchItemSource, sensitiveCategories: Set<string>): OpenSearchRow | null {
  if (!source.id || !source.target || !source.source || !source.kind || !source.stored_at || !source.expires_at || !source.video_url_expires_at) {
    return null;
  }
  if ((source.item_role ?? "entry") !== "entry") {
    return null;
  }
  const tags = toStringArray(source.tags);
  const category = source.category?.trim().toLowerCase() || null;
  const isSensitive = Boolean(source.is_sensitive) || (category ? sensitiveCategories.has(category) : false);
  return {
    id: source.id,
    target: source.target,
    targetLink: source.target_link ?? null,
    source: source.source,
    kind: source.kind,
    category,
    isSensitive,
    tags,
    author: source.author ?? null,
    fullname: source.fullname ?? null,
    displayAuthor: source.display_author ?? undefined,
    displayHandle: source.display_handle ?? undefined,
    authorProfileUrl: source.author_profile_url ?? undefined,
    authorProfilePlatform: source.author_profile_platform ?? undefined,
    title: source.title ?? null,
    content: source.content ?? null,
    rawContent: source.raw_content ?? null,
    translatedContent: source.translated_content ?? null,
    link: source.link ?? null,
    xUrl: source.x_url ?? null,
    images: toStringArray(source.images),
    videoUrl: source.video_url ?? null,
    expiresAt: source.expires_at,
    videoUrlExpiresAt: source.video_url_expires_at,
    publishedAt: source.published_at ?? null,
    storedAt: source.stored_at,
    sortTime: source.sort_at ?? source.published_at ?? source.stored_at,
    guid: source.guid ?? source.id,
    isRetweet: Boolean(source.is_retweet),
  };
}

async function rowsFromResponse(response: OpenSearchSearchResponse) {
  const sensitiveCategories = await getSensitiveCategorySet();
  const rows = getHits(response).map((hit) => (hit._source ? toRow(hit._source, sensitiveCategories) : null)).filter((row): row is OpenSearchRow => row !== null);
  const visibleIds = await filterExistingItemIds(rows.map((row) => row.id));
  return rows.filter((row) => visibleIds.has(row.id));
}

function sourceScopeFilter(sourceScope: ItemQuery["sourceScope"], targetIds: string[], publicTargetIds: string[]) {
  const scope = sourceScope ?? "user";
  if (scope === "public") {
    if (publicTargetIds.length === 0) {
      return { term: { target_id: "__no_public_pool__" } };
    }
    return { terms: { target_id: publicTargetIds } };
  }
  if (scope === "all") {
    if (targetIds.length === 0) {
      if (publicTargetIds.length === 0) {
        return { term: { target_id: "__no_public_pool__" } };
      }
      return { terms: { target_id: publicTargetIds } };
    }
    const mergedTargetIds = normalizedUnique([...targetIds, ...publicTargetIds]);
    return {
      bool: {
        filter: [{ terms: { target_id: mergedTargetIds } }],
      },
    };
  }
  if (targetIds.length === 0) {
    return { term: { target_id: "__no_subscriptions__" } };
  }
  return { terms: { target_id: targetIds } };
}

function buildItemsQuery(input: {
  targetIds: string[];
  publicTargetIds: string[];
  size: number;
  keyword: string | null;
  targetFilter: string | null;
  tagFilters: string[];
  categoryFilters: string[];
  sinceFilter: string | null;
  cursor: ItemCursor | null;
  sourceScope: ItemQuery["sourceScope"];
  blockRules?: FeedBlockRule[];
}) {
  const filter: unknown[] = [
    { range: { expires_at: { gt: "now" } } },
    { term: { item_role: "entry" } },
    sourceScopeFilter(input.sourceScope, input.targetIds, input.publicTargetIds),
  ];

  if (input.sinceFilter) {
    filter.push({ range: { stored_at: { gte: input.sinceFilter } } });
  }

  const tagTerms = terms("tags", input.tagFilters);
  if (tagTerms) {
    filter.push(tagTerms);
  }

  if (input.categoryFilters.length > 0) {
    filter.push({
      bool: {
        should: [
          { terms: { category: input.categoryFilters } },
          { terms: { tags: input.categoryFilters } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (input.targetFilter) {
    filter.push({
      bool: {
        should: [
          { term: { target: input.targetFilter } },
          { term: { source: input.targetFilter } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  if (input.keyword) {
    const wildcardKeyword = `*${escapeOpenSearchWildcard(input.keyword)}*`;
    filter.push({
      bool: {
        should: [
          { match_phrase: { title: input.keyword } },
          { match_phrase: { content: input.keyword } },
          { match_phrase: { raw_content: input.keyword } },
          { match_phrase: { translated_content: input.keyword } },
          { wildcard: { title: { value: wildcardKeyword } } },
          { wildcard: { content: { value: wildcardKeyword } } },
          { wildcard: { raw_content: { value: wildcardKeyword } } },
          { wildcard: { translated_content: { value: wildcardKeyword } } },
          { wildcard: { author: { value: wildcardKeyword } } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const blockRules = buildBlockRuleMustNotClauses(input.blockRules ?? []);
  return {
    size: input.size,
    track_total_hits: false,
    query: {
      bool: {
        filter,
        ...(blockRules.length > 0 ? { must_not: blockRules } : {}),
      },
    },
    sort: [
      { sort_at: { order: "desc", unmapped_type: "date" } },
      { stored_at: { order: "desc", unmapped_type: "date" } },
      { id: { order: "desc" } },
    ],
    ...(input.cursor
      ? {
          search_after: [input.cursor.sortTime, input.cursor.storedAt, input.cursor.id],
        }
      : {}),
  };
}

function dedupeRows(rows: OpenSearchRow[]) {
  const result: OpenSearchRow[] = [];
  const seenGuids = new Set<string>();
  for (const row of rows) {
    const guidKey = normalizeKey(row.guid) ?? row.id;
    if (seenGuids.has(guidKey)) {
      continue;
    }
    seenGuids.add(guidKey);
    result.push(row);
  }
  return result;
}

export const __testables = {
  buildItemsQuery,
  dedupeRows,
  normalizeKey,
  toRow,
};

async function queryItemsFromOpenSearch(input: {
  targetIds: string[];
  publicTargetIds: string[];
  limit: number;
  cursor: ItemCursor | null;
  keyword: string | null;
  targetFilter: string | null;
  tagFilters: string[];
  categoryFilters: string[];
  sinceFilter: string | null;
  sourceScope: ItemQuery["sourceScope"];
  blockRules: FeedBlockRule[];
}) {
  const client = getOpenSearchClient();
  if (!client) {
    throw new Error("OpenSearch is not configured.");
  }

  const searchParams = {
    index: getOpenSearchItemsIndex(),
    body: buildItemsQuery({
      ...input,
      size: Math.max(input.limit * 5, input.limit + 20),
    }),
  } as unknown as Parameters<typeof client.search>[0];
  const response = (await client.search(searchParams)) as unknown as OpenSearchSearchResponse;
  return dedupeRows(await rowsFromResponse(response));
}

function toResult(rows: OpenSearchRow[], limit: number): OpenSearchListItemsResult {
  const page = buildCursorPage({
    rows,
    limit,
    getCursor: (item) => ({
      sortTime: item.sortTime,
      storedAt: item.storedAt,
      id: item.id,
    }),
  });
  return {
    items: page.items.map(({ sortTime: _sortTime, ...item }) => ({
      ...item,
      ...resolveAuthorPresentation(item),
    })),
    pagination: page.pagination,
  };
}

export async function listItemsFromOpenSearch(query: ItemQuery): Promise<OpenSearchListItemsResult> {
  const limit = normalizeLimit(query.limit);
  const cursor = decodeCursor(query.cursor, isItemCursor);
  const normalizedTags = normalizedUnique((query.tags ?? []).map((tag) => tag.trim()));
  const normalizedCategories = normalizedUnique((query.categories ?? []).map((category) => category.trim()));
  const categoryFilters = await normalizeCategoryFilters(normalizedCategories);
  const targetIds = await getSubscribedTargetIds(query.clientId);
  const publicTargetIds = await getItemPublicPoolTargetIds();
  const blockRules = await getEnabledBlockRules(query.clientId);
  const rows = await queryItemsFromOpenSearch({
    targetIds,
    publicTargetIds,
    limit,
    cursor,
    keyword: normalizeKey(query.keyword),
    targetFilter: normalizeKey(query.target),
    tagFilters: normalizedTags,
    categoryFilters,
    sinceFilter: query.since ? new Date(query.since).toISOString() : null,
    sourceScope: query.sourceScope ?? "all",
    blockRules,
  });
  return toResult(rows, limit);
}

export async function listItemsByFeedTokenFromOpenSearch(query: FeedTokenQuery) {
  const client = await getFeedClient(query.feedToken);
  if (!client) {
    return [];
  }
  const limit = normalizeLimit(query.limit, { defaultLimit: 50, maxLimit: 100 });
  const targetIds = await getSubscribedTargetIds(client.clientId);
  const publicTargetIds = await getItemPublicPoolTargetIds();
  const blockRules = await getEnabledBlockRules(client.clientId);
  const rows = await queryItemsFromOpenSearch({
    targetIds,
    publicTargetIds,
    limit,
    cursor: null,
    keyword: null,
    targetFilter: null,
    tagFilters: [],
    categoryFilters: [],
    sinceFilter: null,
    sourceScope: "all",
    blockRules,
  });
  return rows.slice(0, limit).map(({ sortTime: _sortTime, ...item }) => ({
    ...item,
    ...resolveAuthorPresentation(item),
  }));
}
