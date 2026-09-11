export type FeedBlockRule = {
  ruleType: string;
  normalizedValue: string;
  matchMode: string;
  platform?: string | null;
};

function escapeOpenSearchWildcard(value: string) {
  return value.replace(/[\\*?]/g, (match) => `\\${match}`);
}

function textFieldsForRule(ruleType: string) {
  return ruleType === "user"
    ? ["author", "fullname"]
    : ["title", "content", "raw_content", "translated_content"];
}

function platformClause(platform: string) {
  const value = `*${escapeOpenSearchWildcard(platform.trim().toLowerCase())}*`;
  return {
    bool: {
      should: [
        { wildcard: { source: { value } } },
      ],
      minimum_should_match: 1,
    },
  };
}

export function buildBlockRuleMustNotClauses(rules: FeedBlockRule[]) {
  return rules.map((rule) => {
    const value = `*${escapeOpenSearchWildcard(rule.normalizedValue)}*`;
    const textMatch = {
      bool: {
        should: textFieldsForRule(rule.ruleType).map((field) => ({
          wildcard: { [field]: { value } },
        })),
        minimum_should_match: 1,
      },
    };
    const platform = rule.platform?.trim();
    if (!platform) {
      return textMatch;
    }
    return {
      bool: {
        filter: [platformClause(platform), textMatch],
      },
    };
  });
}
