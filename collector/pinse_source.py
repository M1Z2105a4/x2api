from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from psycopg.types.json import Jsonb

try:
    from collector.badnews_source import (
        BADNEWS_STABLE_VIDEO_URL_EXPIRES_AT,
        clean_text,
        fetch_html,
        now_iso,
        now_utc,
        upsert_item_record_with_opensearch,
        verify_hls_url,
    )
    from collector.opensearch_items import refresh_item_playback as refresh_item_playback_in_opensearch
except ModuleNotFoundError:
    from badnews_source import (
        BADNEWS_STABLE_VIDEO_URL_EXPIRES_AT,
        clean_text,
        fetch_html,
        now_iso,
        now_utc,
        upsert_item_record_with_opensearch,
        verify_hls_url,
    )
    from opensearch_items import refresh_item_playback as refresh_item_playback_in_opensearch


PINSE_SITE_NAME = "91PinSe"
PINSE_SOURCE = "pinse"
PINSE_KIND = "site"
PINSE_DEFAULT_BASE_URL = os.environ.get("PINSE_BASE_URL", "https://91pinse.com/v/").strip()
PINSE_RETENTION_HOURS = int(os.environ.get("PINSE_RETENTION_HOURS", "84"))
PINSE_REQUEST_TIMEOUT_SECONDS = int(os.environ.get("PINSE_REQUEST_TIMEOUT_SECONDS", "30"))
PINSE_REFRESH_WINDOW_MINUTES = int(os.environ.get("PINSE_REFRESH_WINDOW_MINUTES", "90"))
PINSE_CRITICAL_WINDOW_MINUTES = int(os.environ.get("PINSE_CRITICAL_WINDOW_MINUTES", "15"))
PINSE_MAX_PAGES = int(os.environ.get("PINSE_MAX_PAGES", "10"))


def headers(referer: str | None = None, *, json_request: bool = False) -> dict[str, str]:
    result = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        "Accept": "application/json, text/plain, */*" if json_request else "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    if referer:
        result.update({"Referer": referer, "Origin": "https://91pinse.com"})
    if json_request:
        result["X-Requested-With"] = "XMLHttpRequest"
    return result


def normalize_site_target_key(value: str) -> str:
    return urlparse(value).netloc.lower() or value.lower().rstrip("/")


def normalize_pinse_target_value(raw: str) -> str:
    value = (raw or PINSE_DEFAULT_BASE_URL).strip()
    parsed = urlparse(value if "://" in value else f"https://{value}")
    if parsed.netloc.lower() not in {"91pinse.com", "www.91pinse.com"}:
        raise ValueError("91PinSe target must use 91pinse.com.")
    path = parsed.path or "/v/"
    if not path.startswith("/v"):
        path = "/v/"
    return urlunparse((parsed.scheme or "https", parsed.netloc.lower(), path.rstrip("/") + "/", "", parsed.query, ""))


def is_pinse_target_url(raw: str) -> bool:
    try:
        parsed = urlparse(raw if "://" in raw else f"https://{raw}")
        return parsed.netloc.lower() in {"91pinse.com", "www.91pinse.com"} and parsed.path.startswith("/v")
    except Exception:
        return False


def format_target_row(target_row: dict) -> str:
    return f"{PINSE_SOURCE}:{target_row['value']}"


def build_list_page_url(base_url: str, page: int) -> str:
    root = normalize_pinse_target_value(base_url)
    if page <= 1:
        return root
    return f"{root}?{urlencode({'page': page})}"


def detail_url(base_url: str, video_id: str) -> str:
    parsed = urlparse(normalize_pinse_target_value(base_url))
    return urlunparse((parsed.scheme, parsed.netloc, f"/v/{video_id}", "", "", ""))


def parse_duration(value: str | None) -> int | None:
    raw = clean_text(value)
    if not raw:
        return None
    parts = raw.split(":")
    if not all(part.isdigit() for part in parts):
        return None
    numbers = [int(part) for part in parts]
    return numbers[-1] + (numbers[-2] * 60 if len(numbers) > 1 else 0) + (numbers[-3] * 3600 if len(numbers) > 2 else 0)


def parse_list_page(base_url: str, page: int) -> list[dict]:
    page_url = build_list_page_url(base_url, page)
    soup = BeautifulSoup(fetch_html(page_url, build_list_page_url(base_url, 1)), "html.parser")
    items = []
    seen: set[str] = set()
    for link in soup.select('a[href^="/v/"]'):
        match = re.fullmatch(r"/v/(\d+)/?", urlparse(link.get("href", "")).path)
        if not match or match.group(1) in seen:
            continue
        video_id = match.group(1)
        card = link.find_parent("article") or link.find_parent(class_=re.compile(r"video|card|item", re.I)) or link.parent
        title_node = card.select_one("a.video-card-title[title], a.video-card-title") if card else None
        title = clean_text(title_node.get("title") if title_node else None) or clean_text(title_node.get_text(" ", strip=True) if title_node else None) or clean_text(link.get("aria-label")) or clean_text(link.get_text(" ", strip=True))
        text = card.get_text(" ", strip=True) if card else ""
        image = card.select_one("img") if card else None
        author = card.select_one('a[href*="/author/"]') if card else None
        duration = re.search(r"\b\d+:\d{2}:?\d*\b", text)
        items.append({"guid": f"{PINSE_SOURCE}:{video_id}", "video_id": video_id, "url": detail_url(base_url, video_id), "title": title or f"91PinSe video {video_id}", "description": title or f"91PinSe video {video_id}", "image": (image.get("src") if image else None), "author_name": clean_text(author.get_text(" ", strip=True) if author else None), "author_url": urljoin(page_url, author.get("href")) if author else None, "duration": parse_duration(duration.group(0) if duration else None), "published_at": now_utc(), "tags": []})
        seen.add(video_id)
    return items


def playback_source(detail_page_url: str, video_id: str) -> dict:
    endpoint = urljoin(detail_page_url, f"/api/videos/{video_id}/playback")
    response = requests.post(endpoint, headers=headers(detail_page_url, json_request=True), timeout=PINSE_REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    payload = response.json()
    source = payload.get("url") if isinstance(payload, dict) else None
    if not isinstance(source, str) or not source.startswith(("https://", "http://")):
        raise ValueError("91PinSe playback API returned no absolute URL.")
    return {"video_url": source, "fallback_url": payload.get("fallback_url")}


def parse_detail_page(detail_page_url: str, list_item: dict | None = None) -> dict:
    html = fetch_html(detail_page_url, detail_page_url)
    soup = BeautifulSoup(html, "html.parser")
    expected_id = re.search(r"/v/(\d+)/?$", urlparse(detail_page_url).path)
    video_id = expected_id.group(1) if expected_id else (list_item or {}).get("video_id")
    if not video_id:
        raise ValueError("91PinSe detail page has no video id.")
    ld = next((json.loads(node.string or node.get_text()) for node in soup.select('script[type="application/ld+json"]') if '"VideoObject"' in node.get_text()), {})
    title = clean_text(ld.get("name")) or (list_item or {}).get("title") or f"91PinSe video {video_id}"
    duration_match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", str(ld.get("duration") or ""))
    duration = (int(duration_match.group(1) or 0) * 3600 + int(duration_match.group(2) or 0) * 60 + int(duration_match.group(3) or 0)) if duration_match else (list_item or {}).get("duration")
    source = playback_source(detail_page_url, video_id)
    return {"url": detail_page_url, "video_id": video_id, "title": title, "description": clean_text(ld.get("description")) or title, "image": ld.get("thumbnailUrl", [None])[0] if isinstance(ld.get("thumbnailUrl"), list) else ld.get("thumbnailUrl"), "author_name": (ld.get("author") or {}).get("name") if isinstance(ld.get("author"), dict) else (list_item or {}).get("author_name"), "author_url": (list_item or {}).get("author_url"), "duration": duration, "published_at": now_utc(), "tags": (list_item or {}).get("tags") or [], "players": [{"guid": f"{PINSE_SOURCE}:{video_id}", "video_id": video_id, "player_index": 1, "video_title": title, "video_url": source["video_url"], "video_type": "hls"}]}


def verify_pinse_hls_url(video_url: str, page_url: str, expected_duration: int | None = None) -> dict:
    result = verify_hls_url(video_url, page_url, expected_duration)
    raw_ts = (parse_qs(urlparse(video_url).query).get("ts") or [None])[0]
    try:
        issued_at = datetime.fromtimestamp(int(raw_ts), tz=timezone.utc) if raw_ts else None
    except (TypeError, ValueError, OSError):
        issued_at = None
    expires_at = issued_at + timedelta(minutes=10) if issued_at else None
    if expires_at and expires_at <= now_utc() + timedelta(minutes=1):
        raise ValueError("91PinSe HLS URL is expired or too close to expiry.")
    result["video_url_expires_at"] = expires_at or result["video_url_expires_at"]
    result["playback_refresh_required"] = expires_at is not None
    return result


def upsert_target(conn, base_url: str) -> dict:
    value = normalize_pinse_target_value(base_url)
    with conn.cursor() as cur:
        cur.execute("""INSERT INTO targets (source,kind,value,normalized_value) VALUES (%s,%s,%s,%s) ON CONFLICT (source,kind,normalized_value) DO UPDATE SET value=EXCLUDED.value RETURNING id,source,kind,value,normalized_value""", (PINSE_SOURCE, PINSE_KIND, value, normalize_site_target_key(value))); return cur.fetchone()


def ensure_target(conn, base_url: str, *, public_pool: bool = True) -> dict:
    target = upsert_target(conn, base_url)
    with conn.cursor() as cur:
        cur.execute("""INSERT INTO target_profiles (target_id,scope,tags,category,weight,is_public_pool) VALUES (%s,'system',%s,'adult',45,%s) ON CONFLICT (target_id) DO UPDATE SET tags=EXCLUDED.tags,category=EXCLUDED.category,weight=EXCLUDED.weight,is_public_pool=EXCLUDED.is_public_pool,updated_at=NOW()""", (target["id"], Jsonb([PINSE_SITE_NAME, "视频"]), public_pool))
    return target


def item_exists_for_guid(conn, target_id: str, guid: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM items WHERE target_id=%s AND guid=%s LIMIT 1", (target_id, guid)); return cur.fetchone() is not None


def upsert_crawl_state(conn, target_id: str, *, last_guid: str | None, last_error: str | None, success: bool) -> None:
    with conn.cursor() as cur:
        cur.execute("""INSERT INTO crawl_state (target_id,last_guid,last_checked_at,last_success_at,last_error) VALUES (%s,%s,NOW(),CASE WHEN %s THEN NOW() ELSE NULL END,%s) ON CONFLICT (target_id) DO UPDATE SET last_guid=COALESCE(EXCLUDED.last_guid,crawl_state.last_guid),last_checked_at=EXCLUDED.last_checked_at,last_success_at=CASE WHEN %s THEN EXCLUDED.last_checked_at ELSE crawl_state.last_success_at END,last_error=EXCLUDED.last_error,updated_at=NOW()""", (target_id,last_guid,success,last_error,success))


def upsert_video_item(conn, target_row: dict, detail: dict, player: dict, verified: dict, retention_hours: int) -> bool:
    published = detail.get("published_at") or now_utc(); image = detail.get("image"); author = detail.get("author_name") or PINSE_SITE_NAME
    metadata = {"target": format_target_row(target_row), "target_type": PINSE_KIND, "target_value": target_row["value"], "site_name": PINSE_SITE_NAME, "source_url": detail["url"], "pinse_video_id": detail["video_id"], "video_type": player["video_type"], "video_poster_url": image, "duration": detail.get("duration"), "resolver": "pinse-playback-api", "resolved_at": now_iso(), "video_url_expires_at": verified["video_url_expires_at"].isoformat(), "playback_refresh_required": verified.get("playback_refresh_required"), "playlist_duration_seconds": verified.get("playlist_duration_seconds"), "media_url_count": verified.get("media_url_count")}
    return upsert_item_record_with_opensearch(conn, target_id=str(target_row["id"]), guid=player["guid"], display_author=author, display_handle=None, author_profile_url=detail.get("author_url") or detail["url"], author_profile_platform=PINSE_SITE_NAME, video_url=verified["video_url"], expires_at=published + timedelta(hours=retention_hours), video_url_expires_at=verified["video_url_expires_at"], published_at=published, stored_at=now_utc(), is_retweet=False, metadata=metadata, cover_url=image, title=detail["title"], caption=detail["description"], content=detail["description"], author=author, fullname=author, x_url=None, link=detail["url"], images=[image] if image else [])[1]


def monitor_site(conn, *, base_url: str, max_pages: int, retention_hours: int, public_pool: bool, dry_run: bool = False) -> dict:
    target = None if dry_run else ensure_target(conn, base_url, public_pool=public_pool); stats = {"pages": 0, "parsed_videos": 0, "verified": 0, "inserted": 0, "updated": 0, "skipped_existing": 0, "skipped_detail_errors": 0, "skipped_unverified": 0, "skipped_old": 0, "samples": []}; latest = None
    for page in range(1, min(max_pages, PINSE_MAX_PAGES) + 1):
        try: items = parse_list_page(base_url, page)
        except Exception as exc: print(f"[pinse] page={page} unavailable stop=true: {exc}"); break
        stats["pages"] += 1; print(f"[pinse] page={page} list_items={len(items)} url={build_list_page_url(base_url,page)}")
        if not items: break
        for item in items:
            latest = latest or item["guid"]
            if target and item_exists_for_guid(conn, str(target["id"]), item["guid"]): stats["skipped_existing"] += 1; continue
            try: detail = parse_detail_page(item["url"], item); stats["parsed_videos"] += 1; player = detail["players"][0]; verified = verify_pinse_hls_url(player["video_url"], detail["url"], detail.get("duration"))
            except Exception as exc: stats["skipped_unverified"] += 1; print(f"[pinse] skip {item['guid']}: {exc}"); continue
            stats["verified"] += 1
            if dry_run: stats["samples"].append({"guid": player["guid"], "title": detail["title"], "video_url": verified["video_url"], "video_url_expires_at": verified["video_url_expires_at"].isoformat(), "playlist_duration_seconds": verified.get("playlist_duration_seconds")}); continue
            if upsert_video_item(conn, target, detail, player, verified, retention_hours): stats["inserted"] += 1
            else: stats["updated"] += 1
        if target: upsert_crawl_state(conn, target["id"], last_guid=latest, last_error=None, success=True)
    return stats


def refresh_playback_urls(conn, limit: int, refresh_window_minutes: int, critical_window_minutes: int) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute("SELECT i.* FROM items i INNER JOIN targets t ON t.id=i.target_id WHERE t.source=%s AND i.expires_at>NOW() AND i.video_url_expires_at<=NOW()+(%s||' minutes')::interval ORDER BY i.video_url_expires_at ASC LIMIT %s", (PINSE_SOURCE, refresh_window_minutes, limit)); rows = cur.fetchall()
    refreshed = failed = 0
    for row in rows:
        try:
            metadata = row["metadata"] or {}; detail = parse_detail_page(metadata["source_url"]); player = detail["players"][0]; verified = verify_pinse_hls_url(player["video_url"], detail["url"], detail.get("duration")); next_metadata = metadata | {"resolved_at": now_iso(), "video_url_expires_at": verified["video_url_expires_at"].isoformat(), "playback_refresh_required": verified.get("playback_refresh_required"), "playlist_duration_seconds": verified.get("playlist_duration_seconds"), "media_url_count": verified.get("media_url_count")}; refresh_item_playback_in_opensearch(conn, item_id=str(row["id"]), video_url=verified["video_url"], video_url_expires_at=verified["video_url_expires_at"], metadata=next_metadata, cover_url=detail.get("image") or metadata.get("video_poster_url")); refreshed += 1
        except Exception as exc: failed += 1; print(f"[pinse] refresh failed for {row['guid']}: {exc}")
        conn.commit()
    return {"processed": len(rows), "refreshed": refreshed, "failed": failed, "skipped_static": 0}
