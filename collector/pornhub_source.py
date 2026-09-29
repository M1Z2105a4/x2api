from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from html import unescape as html_unescape
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup
from psycopg.types.json import Jsonb

try:
    from collector.badnews_source import (
        BADNEWS_REQUEST_TIMEOUT_SECONDS,
        BADNEWS_STABLE_VIDEO_URL_EXPIRES_AT,
        clean_text,
        fetch_html,
        now_iso,
        now_utc,
        parse_epoch_datetime,
        playback_expiry,
        update_opensearch_item_document,
        upsert_item_record_with_opensearch,
        verify_hls_url,
    )
    from collector.opensearch_items import refresh_item_playback as refresh_item_playback_in_opensearch
except ModuleNotFoundError:
    from badnews_source import (
        BADNEWS_REQUEST_TIMEOUT_SECONDS,
        BADNEWS_STABLE_VIDEO_URL_EXPIRES_AT,
        clean_text,
        fetch_html,
        now_iso,
        now_utc,
        parse_epoch_datetime,
        playback_expiry,
        update_opensearch_item_document,
        upsert_item_record_with_opensearch,
        verify_hls_url,
    )
    from opensearch_items import refresh_item_playback as refresh_item_playback_in_opensearch


PORNHUB_SITE_NAME = "Pornhub"
PORNHUB_SOURCE = "pornhub"
PORNHUB_KIND = "site"
PORNHUB_DEFAULT_BASE_URL = os.environ.get("PORNHUB_BASE_URL", "https://cn.pornhub.com/recommended?o=time").strip()
PORNHUB_RETENTION_HOURS = int(os.environ.get("PORNHUB_RETENTION_HOURS", "84"))
PORNHUB_REQUEST_TIMEOUT_SECONDS = int(os.environ.get("PORNHUB_REQUEST_TIMEOUT_SECONDS", str(BADNEWS_REQUEST_TIMEOUT_SECONDS)))
PORNHUB_REFRESH_WINDOW_MINUTES = int(os.environ.get("PORNHUB_REFRESH_WINDOW_MINUTES", "90"))
PORNHUB_CRITICAL_WINDOW_MINUTES = int(os.environ.get("PORNHUB_CRITICAL_WINDOW_MINUTES", "15"))
PORNHUB_MAX_PAGES = int(os.environ.get("PORNHUB_MAX_PAGES", "5"))
PORNHUB_MIN_VIDEO_DURATION_SECONDS = int(os.environ.get("PORNHUB_MIN_VIDEO_DURATION_SECONDS", "3"))
PORNHUB_ALLOWED_HOSTS = {"pornhub.com", "www.pornhub.com", "cn.pornhub.com"}


def int_or_none(value) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def normalize_site_target_key(value: str) -> str:
    parsed = urlparse(value)
    return parsed.netloc.lower() or value.lower().rstrip("/")


def normalize_pornhub_target_value(raw: str) -> str:
    value = (raw or PORNHUB_DEFAULT_BASE_URL).strip()
    parsed = urlparse(value if "://" in value else f"https://{value}")
    if parsed.netloc.lower() not in PORNHUB_ALLOWED_HOSTS:
        raise ValueError("Pornhub target must use pornhub.com or cn.pornhub.com.")
    path = parsed.path or "/recommended"
    query = parsed.query or "o=time"
    return urlunparse((parsed.scheme or "https", parsed.netloc.lower(), path.rstrip("/"), "", query, ""))


def is_pornhub_target_url(raw: str) -> bool:
    try:
        parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    except Exception:
        return False
    return parsed.netloc.lower() in PORNHUB_ALLOWED_HOSTS and parsed.path.startswith("/recommended")


def format_target_row(target_row: dict) -> str:
    return f"{PORNHUB_SOURCE}:{target_row['value']}"


def build_list_page_url(base_url: str, page: int) -> str:
    value = normalize_pornhub_target_value(base_url)
    parsed = urlparse(value)
    query = parse_qs(parsed.query, keep_blank_values=True)
    query["o"] = [query.get("o", ["time"])[0]]
    if page > 1:
        query["page"] = [str(page)]
    else:
        query.pop("page", None)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/recommended", "", urlencode(query, doseq=True), ""))


def detail_url(base_url: str, viewkey: str) -> str:
    parsed = urlparse(normalize_pornhub_target_value(base_url))
    return urlunparse((parsed.scheme, parsed.netloc, "/view_video.php", "", urlencode({"viewkey": viewkey}), ""))


def normalize_asset_url(page_url: str, raw: str | None) -> str | None:
    value = clean_text(raw)
    if not value:
        return None
    value = html_unescape(value).replace("\\/", "/")
    normalized = urljoin(page_url, value)
    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return urlunparse(parsed._replace(fragment=""))


def parse_duration(value: str | None) -> int | None:
    raw = clean_text(value)
    if not raw:
        return None
    parts = raw.split(":")
    if not all(p.isdigit() for p in parts):
        return None
    numbers = [int(p) for p in parts]
    if len(numbers) == 2:
        return numbers[0] * 60 + numbers[1]
    if len(numbers) == 3:
        return numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
    return None


def parse_relative_age(value: str | None) -> datetime:
    raw = clean_text(value) or ""
    match = re.search(r"(\d+)\s*(秒|分鐘?|小時?|天|週|月|年)", raw)
    if not match:
        return now_utc()
    amount = int(match.group(1))
    unit = match.group(2)
    factors = {"秒": 1, "分鐘": 60, "分鐘": 60, "小時": 3600, "天": 86400, "週": 604800, "月": 2592000, "年": 31536000}
    return now_utc() - timedelta(seconds=amount * next((factor for key, factor in factors.items() if unit.startswith(key)), 1))


def parse_list_page(base_url: str, page: int) -> list[dict]:
    page_url = build_list_page_url(base_url, page)
    soup = BeautifulSoup(fetch_html(page_url, build_list_page_url(base_url, 1)), "html.parser")
    items: list[dict] = []
    seen: set[str] = set()
    for node in soup.select("li.pcVideoListItem[data-video-vkey]"):
        viewkey = clean_text(node.get("data-video-vkey"))
        link = node.select_one('a[href*="view_video.php?viewkey="]')
        if not viewkey and link:
            viewkey = (parse_qs(urlparse(link.get("href", "")).query).get("viewkey") or [None])[0]
        if not viewkey or viewkey in seen:
            continue
        title_node = node.select_one("span.title a, a.gtm-event-thumb-click")
        image = node.select_one("img[data-image], img[src]")
        uploader = node.select_one(".usernameWrap a, a.gtm-event-watch-page")
        duration = node.select_one(".duration")
        detail = normalize_asset_url(page_url, link.get("href") if link else None) or detail_url(base_url, viewkey)
        title = clean_text(title_node.get("title") if title_node else None) or clean_text(title_node.get_text(" ", strip=True) if title_node else None) or f"Pornhub video {viewkey}"
        item = {
            "guid": f"{PORNHUB_SOURCE}:{viewkey}", "video_id": viewkey, "url": detail, "title": title,
            "description": title, "image": normalize_asset_url(page_url, (image.get("data-image") or image.get("src")) if image else None),
            "author_name": clean_text(uploader.get_text(" ", strip=True) if uploader else None),
            "author_url": normalize_asset_url(page_url, uploader.get("href") if uploader else None),
            "duration": parse_duration(duration.get_text(" ", strip=True) if duration else None),
            "published_at": parse_relative_age((node.select_one(".added") or {}).get_text(" ", strip=True) if node.select_one(".added") else None),
            "tags": [],
        }
        items.append(item); seen.add(viewkey)
    return items


def parse_detail_page(detail_page_url: str, list_item: dict | None = None) -> dict:
    html = fetch_html(detail_page_url, detail_page_url)
    match = re.search(r"var\s+flashvars_\d+\s*=\s*(\{.*?\});", html, re.S)
    if not match:
        raise ValueError("Pornhub detail page is missing flashvars media data.")
    data = json.loads(match.group(1))
    viewkey = (parse_qs(urlparse(detail_page_url).query).get("viewkey") or [None])[0]
    definitions = data.get("mediaDefinitions")
    if not isinstance(definitions, list):
        raise ValueError("Pornhub detail page has no media definitions.")
    hls = [item for item in definitions if isinstance(item, dict) and str(item.get("format", "")).lower() == "hls" and item.get("videoUrl")]
    hls.sort(key=lambda item: (bool(item.get("defaultQuality")), int_or_none(item.get("quality")) or 0), reverse=True)
    if not hls:
        raise ValueError("Pornhub detail page has no HLS video URL.")
    title = clean_text(data.get("video_title")) or (list_item or {}).get("title") or f"Pornhub video {viewkey}"
    duration = int_or_none(data.get("video_duration")) or (list_item or {}).get("duration")
    player = {"guid": f"{PORNHUB_SOURCE}:{viewkey}", "video_id": viewkey, "player_index": 1, "video_title": title, "video_url": normalize_asset_url(detail_page_url, hls[0]["videoUrl"]), "video_type": "hls", "quality": hls[0].get("quality")}
    return {"url": detail_page_url, "video_id": viewkey, "title": title, "description": title, "image": normalize_asset_url(detail_page_url, data.get("image_url")), "author_name": (list_item or {}).get("author_name"), "author_url": (list_item or {}).get("author_url"), "duration": duration, "published_at": (list_item or {}).get("published_at") or now_utc(), "tags": (list_item or {}).get("tags") or [], "players": [player]}


def pornhub_playback_expiry(url: str) -> datetime | None:
    value = (parse_qs(urlparse(url).query).get("validto") or [None])[0]
    return parse_epoch_datetime(value)


def verify_pornhub_hls_url(video_url: str, page_url: str, expected_duration: int | None = None) -> dict:
    result = verify_hls_url(video_url, page_url, expected_duration)
    expiry = pornhub_playback_expiry(video_url)
    if expiry and expiry <= now_utc() + timedelta(minutes=1):
        raise ValueError("Pornhub HLS URL is expired or too close to expiry.")
    result["video_url_expires_at"] = expiry or result["video_url_expires_at"]
    result["playback_refresh_required"] = expiry is not None
    return result


def upsert_target(conn, base_url: str) -> dict:
    value = normalize_pornhub_target_value(base_url)
    with conn.cursor() as cur:
        cur.execute("""INSERT INTO targets (source, kind, value, normalized_value) VALUES (%s,%s,%s,%s) ON CONFLICT (source,kind,normalized_value) DO UPDATE SET value=EXCLUDED.value RETURNING id,source,kind,value,normalized_value""", (PORNHUB_SOURCE, PORNHUB_KIND, value, normalize_site_target_key(value)))
        return cur.fetchone()


def ensure_target(conn, base_url: str, *, public_pool: bool = True) -> dict:
    target = upsert_target(conn, base_url)
    with conn.cursor() as cur:
        cur.execute("""INSERT INTO target_profiles (target_id,scope,tags,category,weight,is_public_pool) VALUES (%s,'system',%s,'adult',45,%s) ON CONFLICT (target_id) DO UPDATE SET tags=EXCLUDED.tags,category=EXCLUDED.category,weight=EXCLUDED.weight,is_public_pool=EXCLUDED.is_public_pool,updated_at=NOW()""", (target["id"], Jsonb([PORNHUB_SITE_NAME, "视频"]), public_pool))
    return target


def item_exists_for_guid(conn, target_id: str, guid: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM items WHERE target_id=%s AND guid=%s LIMIT 1", (target_id, guid)); return cur.fetchone() is not None


def upsert_crawl_state(conn, target_id: str, *, last_guid: str | None, last_error: str | None, success: bool) -> None:
    with conn.cursor() as cur:
        cur.execute("""INSERT INTO crawl_state (target_id,last_guid,last_checked_at,last_success_at,last_error) VALUES (%s,%s,NOW(),CASE WHEN %s THEN NOW() ELSE NULL END,%s) ON CONFLICT (target_id) DO UPDATE SET last_guid=COALESCE(EXCLUDED.last_guid,crawl_state.last_guid),last_checked_at=EXCLUDED.last_checked_at,last_success_at=CASE WHEN %s THEN EXCLUDED.last_checked_at ELSE crawl_state.last_success_at END,last_error=EXCLUDED.last_error,updated_at=NOW()""", (target_id,last_guid,success,last_error,success))


def upsert_video_item(conn, target_row: dict, detail: dict, player: dict, verified: dict, retention_hours: int) -> bool:
    published = detail.get("published_at") or now_utc(); content = detail.get("title") or PORNHUB_SITE_NAME; image = detail.get("image");
    metadata = {"target": format_target_row(target_row), "target_type": PORNHUB_KIND, "target_value": target_row["value"], "site_name": PORNHUB_SITE_NAME, "source_url": detail["url"], "pornhub_video_id": detail["video_id"], "video_type": player["video_type"], "video_poster_url": image, "duration": detail.get("duration"), "quality": player.get("quality"), "resolver": "pornhub-flashvars", "resolved_at": now_iso(), "video_url_expires_at": verified["video_url_expires_at"].isoformat(), "playback_refresh_required": verified.get("playback_refresh_required"), "playlist_duration_seconds": verified.get("playlist_duration_seconds"), "media_url_count": verified.get("media_url_count"), "variant_count": verified.get("variant_count")}
    return upsert_item_record_with_opensearch(conn, target_id=str(target_row["id"]), guid=player["guid"], display_author=detail.get("author_name") or PORNHUB_SITE_NAME, display_handle=None, author_profile_url=detail.get("author_url") or detail["url"], author_profile_platform=PORNHUB_SITE_NAME, video_url=verified["video_url"], expires_at=published + timedelta(hours=retention_hours), video_url_expires_at=verified["video_url_expires_at"], published_at=published, stored_at=now_utc(), is_retweet=False, metadata=metadata, cover_url=image, title=detail["title"], caption=content, content=content, author=detail.get("author_name") or PORNHUB_SITE_NAME, fullname=detail.get("author_name") or PORNHUB_SITE_NAME, x_url=None, link=detail["url"], images=[image] if image else [])[1]


def monitor_site(conn, *, base_url: str, max_pages: int, retention_hours: int, public_pool: bool, dry_run: bool = False) -> dict:
    target = None if dry_run else ensure_target(conn, base_url, public_pool=public_pool); cutoff = now_utc() - timedelta(hours=retention_hours); stats = {"pages": 0, "parsed_videos": 0, "verified": 0, "inserted": 0, "updated": 0, "skipped_existing": 0, "skipped_detail_errors": 0, "skipped_unverified": 0, "skipped_old": 0, "samples": []}; latest = None
    for page in range(1, min(max_pages, PORNHUB_MAX_PAGES) + 1):
        stats["pages"] += 1
        try:
            items = parse_list_page(base_url, page)
        except Exception as exc:
            print(f"[pornhub] page={page} unavailable stop=true: {exc}")
            break
        print(f"[pornhub] page={page} list_items={len(items)} url={build_list_page_url(base_url,page)}")
        if not items: break
        for item in items:
            latest = latest or item["guid"]
            if item["published_at"] < cutoff: stats["skipped_old"] += 1; continue
            if target and item_exists_for_guid(conn, str(target["id"]), item["guid"]): stats["skipped_existing"] += 1; continue
            try: detail = parse_detail_page(item["url"], item); stats["parsed_videos"] += 1
            except Exception as exc: stats["skipped_detail_errors"] += 1; print(f"[pornhub] skip detail {item['url']}: {exc}"); continue
            player = detail["players"][0]
            try: verified = verify_pornhub_hls_url(player["video_url"], detail["url"], detail.get("duration"))
            except Exception as exc: stats["skipped_unverified"] += 1; print(f"[pornhub] skip unverified {player['guid']}: {exc}"); continue
            stats["verified"] += 1
            if dry_run: stats["samples"].append({"guid": player["guid"], "title": detail["title"], "link": detail["url"], "video_url": verified["video_url"], "video_url_expires_at": verified["video_url_expires_at"].isoformat(), "playlist_duration_seconds": verified.get("playlist_duration_seconds")}); continue
            if upsert_video_item(conn, target, detail, player, verified, retention_hours): stats["inserted"] += 1
            else: stats["updated"] += 1
        if target: upsert_crawl_state(conn, target["id"], last_guid=latest, last_error=None, success=True)
    return stats


def refresh_playback_urls(conn, limit: int, refresh_window_minutes: int, critical_window_minutes: int) -> dict[str, int]:
    processed = refreshed = failed = 0
    queries = [(critical_window_minutes, "ORDER BY i.video_url_expires_at ASC"), (refresh_window_minutes, "ORDER BY i.video_url_expires_at ASC, i.published_at DESC")]
    seen_ids: set[str] = set()
    for window_minutes, ordering in queries:
        if processed >= limit:
            break
        with conn.cursor() as cur:
            cur.execute(f"SELECT i.* FROM items i INNER JOIN targets t ON t.id=i.target_id WHERE t.source=%s AND i.expires_at>NOW() AND i.video_url_expires_at<=NOW()+(%s||' minutes')::interval {ordering} LIMIT %s", (PORNHUB_SOURCE, window_minutes, limit))
            rows = cur.fetchall()
        for row in rows:
            row_id = str(row["id"])
            if row_id in seen_ids or processed >= limit:
                continue
            seen_ids.add(row_id)
            processed += 1
            metadata = row["metadata"] or {}
            source_url = metadata.get("source_url")
            try:
                detail = parse_detail_page(source_url)
                player = detail["players"][0]
                verified = verify_pornhub_hls_url(player["video_url"], detail["url"], detail.get("duration"))
                next_metadata = metadata | {"resolved_at": now_iso(), "video_url_expires_at": verified["video_url_expires_at"].isoformat(), "playback_refresh_required": verified.get("playback_refresh_required"), "playlist_duration_seconds": verified.get("playlist_duration_seconds"), "media_url_count": verified.get("media_url_count")}
                refresh_item_playback_in_opensearch(conn, item_id=row_id, video_url=verified["video_url"], video_url_expires_at=verified["video_url_expires_at"], metadata=next_metadata, cover_url=detail.get("image") or metadata.get("video_poster_url"))
                refreshed += 1
            except Exception as exc:
                failed += 1
                print(f"[pornhub] refresh failed for {row['guid']}: {exc}")
            conn.commit()
    return {"processed": processed, "refreshed": refreshed, "failed": failed, "skipped_static": 0}
