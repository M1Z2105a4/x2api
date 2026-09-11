import assert from "node:assert/strict";
import test from "node:test";

import { filterExistingItemIds } from "@/lib/item-visibility";
import type { SqlFunction } from "@/lib/db";

test("filterExistingItemIds returns only ids that still exist in pg", async () => {
  const calls: { text: string; values: unknown[] }[] = [];
  const fakeSql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join("$"), values });
    return Promise.resolve({
      rows: [{ id: "item-1" }, { id: "item-3" }],
    });
  }) as unknown as SqlFunction;

  const visible = await filterExistingItemIds(["item-1", "item-2", "item-3", "item-1"], fakeSql);
  assert.deepEqual([...visible].sort(), ["item-1", "item-3"]);
  assert.equal(calls.length, 1);
});
