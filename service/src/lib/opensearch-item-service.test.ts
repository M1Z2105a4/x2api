import assert from "node:assert/strict";
import test from "node:test";

import { __testables } from "@/lib/opensearch-item-service";

test("toRow maps OpenSearch docs into item records", () => {
  const row = __testables.toRow(
    {
      id: "item-1",
      guid: "guid-1",
      title: "Title",
      content: "Content",
      raw_content: "Raw",
      translated_content: "Translated",
      author: "alice",
      fullname: "Alice",
      display_author: "Alice",
      link: "https://example.com/post",
      x_url: "https://x.com/alice/status/1",
      images: ["https://example.com/1.jpg"],
      video_url: "https://cdn.example.com/video.mp4",
      expires_at: "2026-06-20T00:00:00.000Z",
      video_url_expires_at: "2026-06-20T00:00:00.000Z",
      published_at: "2026-06-19T00:00:00.000Z",
      stored_at: "2026-06-19T00:05:00.000Z",
      sort_at: "2026-06-19T00:05:00.000Z",
      source: "twitter",
      target: "alice",
      target_link: "https://x.com/alice",
      kind: "user",
      category: "news",
      tags: ["foo", "bar"],
      is_retweet: false,
      is_sensitive: false,
      item_role: "entry",
    },
    new Set(["adult"]),
  );

  assert.ok(row);
  assert.equal(row?.id, "item-1");
  assert.equal(row?.target, "alice");
  assert.deepEqual(row?.tags, ["foo", "bar"]);
  assert.equal(row?.videoUrl, "https://cdn.example.com/video.mp4");
  assert.equal(row?.isSensitive, false);
});

test("buildItemsQuery uses search_after when cursor is present", () => {
  const query = __testables.buildItemsQuery({
    targetIds: ["target-1"],
    publicTargetIds: ["target-public"],
    size: 25,
    keyword: "alice",
    targetFilter: "twitter",
    tagFilters: ["foo"],
    categoryFilters: ["news"],
    sinceFilter: "2026-06-19T00:00:00.000Z",
    sourceScope: "all",
    cursor: {
      sortTime: "2026-06-19T00:05:00.000Z",
      storedAt: "2026-06-19T00:05:00.000Z",
      id: "item-1",
    },
  }) as { search_after?: unknown[]; size: number };

  assert.equal(query.size, 25);
  assert.deepEqual(query.search_after, [
    "2026-06-19T00:05:00.000Z",
    "2026-06-19T00:05:00.000Z",
    "item-1",
  ]);
});

test("buildItemsQuery filters public pool when sourceScope=public", () => {
  const query = __testables.buildItemsQuery({
    targetIds: ["target-1"],
    publicTargetIds: ["target-public"],
    size: 10,
    keyword: null,
    targetFilter: null,
    tagFilters: [],
    categoryFilters: [],
    sinceFilter: null,
    sourceScope: "public",
    cursor: null,
  }) as { query: { bool: { filter: unknown[] } } };

  assert.deepEqual(query.query.bool.filter.slice(0, 3), [
    { range: { expires_at: { gt: "now" } } },
    { term: { item_role: "entry" } },
    { terms: { target_id: ["target-public"] } },
  ]);
});

test("buildItemsQuery merges subscriptions with item public pool when sourceScope=all", () => {
  const query = __testables.buildItemsQuery({
    targetIds: ["target-1"],
    publicTargetIds: ["target-public"],
    size: 10,
    keyword: null,
    targetFilter: null,
    tagFilters: [],
    categoryFilters: [],
    sinceFilter: null,
    sourceScope: "all",
    cursor: null,
  }) as { query: { bool: { filter: unknown[] } } };

  assert.deepEqual(query.query.bool.filter.slice(0, 3), [
    { range: { expires_at: { gt: "now" } } },
    { term: { item_role: "entry" } },
    { bool: { filter: [{ terms: { target_id: ["target-1", "target-public"] } }] } },
  ]);
});

test("buildItemsQuery excludes enabled block rules from item results", () => {
  const query = __testables.buildItemsQuery({
    targetIds: ["target-1"],
    publicTargetIds: [],
    size: 10,
    keyword: null,
    targetFilter: null,
    tagFilters: [],
    categoryFilters: [],
    sinceFilter: null,
    sourceScope: "user",
    cursor: null,
    blockRules: [
      {
        ruleType: "keyword",
        normalizedValue: "spoiler",
        matchMode: "phrase",
        platform: null,
      },
    ],
  }) as {
    query: {
      bool: {
        must_not: Array<{ bool: { should: unknown[] } }>;
      };
    };
  };

  assert.equal(query.query.bool.must_not.length, 1);
  assert.deepEqual(query.query.bool.must_not[0], {
    bool: {
      should: [
        { wildcard: { title: { value: "*spoiler*" } } },
        { wildcard: { caption: { value: "*spoiler*" } } },
        { wildcard: { content: { value: "*spoiler*" } } },
        { wildcard: { raw_content: { value: "*spoiler*" } } },
        { wildcard: { translated_content: { value: "*spoiler*" } } },
      ],
      minimum_should_match: 1,
    },
  });
});
