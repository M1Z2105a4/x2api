import assert from "node:assert/strict";
import test from "node:test";

import { __testables } from "@/lib/feed-engine";

test("video feed query applies block rules before ranking", () => {
  const body = __testables.buildFeedQuery({
    size: 10,
    source: "mixed",
    subscribedTargetIds: ["target-1"],
    seenIds: [],
    seenGuids: [],
    seenVideoKeys: [],
    categoryFilters: [],
    tagFilters: [],
    keyword: null,
    profile: {
      shortProfile: {},
      longProfile: {},
      negativeProfile: {},
      sourceProfile: {},
      targetProfile: {},
      authorProfile: {},
      exploreRatio: 0.4,
      confidence: 0,
      eventCount: 0,
      hasProfile: false,
    },
    mode: "personalized",
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
      function_score: {
        query: {
          constant_score: {
            filter: {
              bool: {
                must_not: unknown[];
              };
            };
          };
        };
      };
    };
  };

  const mustNot =
    body.query.function_score.query.constant_score.filter.bool.must_not;
  assert.equal(mustNot.length, 1);
  assert.deepEqual(mustNot[0], {
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
