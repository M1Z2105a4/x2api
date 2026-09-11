import assert from "node:assert/strict";
import test from "node:test";

import { buildBlockRuleMustNotClauses } from "@/lib/feed-block-rules";

test("global keyword rules inspect both item and video-feed text fields", () => {
  const [clause] = buildBlockRuleMustNotClauses([
    {
      ruleType: "keyword",
      normalizedValue: "spoiler",
      matchMode: "phrase",
      platform: null,
    },
  ]);

  assert.deepEqual(clause, {
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

test("a platform-scoped user rule requires both the platform and author match", () => {
  const [clause] = buildBlockRuleMustNotClauses([
    {
      ruleType: "user",
      normalizedValue: "alice",
      matchMode: "phrase",
      platform: "X",
    },
  ]);

  assert.deepEqual(clause, {
    bool: {
      filter: [
        {
          bool: {
            should: [
              { wildcard: { source: { value: "*x*" } } },
              { wildcard: { author_profile_platform: { value: "*x*" } } },
            ],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [
              { wildcard: { author: { value: "*alice*" } } },
              { wildcard: { fullname: { value: "*alice*" } } },
              { wildcard: { display_author: { value: "*alice*" } } },
              { wildcard: { display_handle: { value: "*alice*" } } },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  });
});

test("a blank platform is treated as a global rule", () => {
  const [clause] = buildBlockRuleMustNotClauses([
    {
      ruleType: "keyword",
      normalizedValue: "spoiler",
      matchMode: "phrase",
      platform: "  ",
    },
  ]);

  assert.deepEqual(clause, {
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
