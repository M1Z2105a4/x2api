import { requireClient } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const client = await requireClient();
    const sql = getSql();
    const rows = await sql`SELECT id::text, rule_type AS "ruleType", platform, value, normalized_value AS "normalizedValue", match_mode AS "matchMode", label, enabled, created_at AS "createdAt" FROM feed_block_rules WHERE client_id = ${client.id} ORDER BY created_at DESC`;
    return jsonOk({ rules: rows.rows });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Failed to load block rules.", 500); }
}

export async function POST(request: Request) {
  try {
    const client = await requireClient();
    const body = await request.json() as {
      type?: string;
      platform?: string | null;
      value?: string;
      matchMode?: string;
      label?: string;
    };
    const type = body.type === "user" || body.type === "keyword" ? body.type : null;
    const value = body.value?.trim();
    if (!type || !value) return jsonError("type and value are required.", 400);
    const platform = body.platform?.trim().toLocaleLowerCase() || null;
    const normalized = value.toLocaleLowerCase();
    const sql = getSql();
    const result = await sql`INSERT INTO feed_block_rules (client_id, rule_type, platform, value, normalized_value, match_mode, label) VALUES (${client.id}, ${type}, ${platform}, ${value}, ${normalized}, ${body.matchMode === "exact" ? "exact" : "phrase"}, ${body.label?.trim() || null}) ON CONFLICT (client_id, rule_type, (LOWER(BTRIM(COALESCE(platform, '')))), normalized_value) DO UPDATE SET enabled = TRUE, value = EXCLUDED.value, label = EXCLUDED.label, updated_at = NOW() RETURNING id::text, rule_type AS "ruleType", NULLIF(platform, '') AS platform, value, normalized_value AS "normalizedValue", match_mode AS "matchMode", label, enabled`;
    return jsonOk({ rule: result.rows[0] }, { status: 201 });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Failed to create block rule.", 500); }
}

export async function DELETE(request: Request) {
  try {
    const client = await requireClient();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonError("id is required.", 400);
    const sql = getSql();
    await sql`DELETE FROM feed_block_rules WHERE id = ${id} AND client_id = ${client.id}`;
    return jsonOk({ deleted: true });
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Failed to delete block rule.", 500); }
}
