from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from collector.twitter_monitor import (
    build_author_presentation,
    build_item_author_presentation,
    insert_items,
    normalize_douyin_item,
    parse_target_value,
    upsert_badnews_video_item,
    upsert_91porn_video_item,
    upsert_18j_video_item,
    upsert_baoliao51_video_item,
    upsert_cg91_video_item,
    upsert_dadaafa_video_item,
    upsert_douyin_video_item,
    upsert_18mh_video_item,
    upsert_heiliao_video_item,
    upsert_resolved_youtube_item,
)


class FakeCursor:
    rowcount = 1

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def execute(self, sql, params=None):
        params = params or ()
        self.sql = sql
        self.params = params
        self.assert_placeholder_count(sql, params)

    @staticmethod
    def assert_placeholder_count(sql, params):
        expected = sql.count("%s")
        actual = len(params)
        if expected != actual:
            raise AssertionError(f"SQL placeholder mismatch: expected {expected}, got {actual}")

    def fetchone(self):
        return {"id": "item-id", "inserted": True}


class FakeConnection:
    def cursor(self, **_kwargs):
        return FakeCursor()


class AuthorPresentationTest(unittest.TestCase):
    def test_twitter_alias_builds_x_profile(self):
        presentation = build_author_presentation(
            source="x",
            target="search:AI",
            author="@openai",
            fullname="OpenAI",
            x_url="https://x.com/openai/status/1",
            link=None,
        )

        self.assertEqual(
            presentation,
            {
                "display_author": "OpenAI",
                "display_handle": "@openai",
                "author_profile_url": "https://x.com/openai",
                "author_profile_platform": "X",
            },
        )

    def test_youtube_alias_builds_channel_profile(self):
        presentation = build_author_presentation(
            source="yt",
            target="youtube:UC12345678901234567890",
            author="Channel",
            fullname="Channel",
            x_url=None,
            link="https://www.youtube.com/watch?v=abc123",
        )

        self.assertEqual(
            presentation,
            {
                "display_author": "Channel",
                "display_handle": None,
                "author_profile_url": "https://www.youtube.com/channel/UC12345678901234567890",
                "author_profile_platform": "YouTube",
            },
        )

    def test_site_sources_use_detail_link_for_clickable_profile(self):
        cases = [
            ("heiliao", "黑料", "https://among.uvsoskqus.cc/archives/1"),
            ("cg91", "91吃瓜", "https://www.91cg1.com/post/1"),
            ("baoliao51", "51爆料", "https://www.51baoliao01.com/archives/1"),
            ("douyin", "抖阴", "https://xygrfrfb3g.b2h7y8w.com/recommend/?id=1"),
            ("18mh", "禁漫天堂", "https://18mh.net/mv/detail/1"),
            ("rou", "肉視頻", "https://rou.video/v/video-1"),
            ("dadaafa", "DadaAFA", "https://dadaafa.cc/play/1O7BBW/video?utm_source=xx"),
            ("18j", "18J.TV", "https://18j.tv/v/37590/"),
            ("tikporn", "Tik.Porn", "https://tik.porn/video/1529368"),
            ("91porna", "91porna", "https://91porna.com/comic/index/detail?video_key=346951"),
            ("91porn", "91porn", "https://91porn.com/view_video.php?viewkey=abc123"),
            ("91rb", "91热爆", "https://www.91rb.com/videos/319962/example/"),
            ("badnews", "Bad.news", "https://bad.news/t/6227046"),
            ("dirtyship", "DirtyShip", "https://dirtyship.com/sample-video/"),
        ]

        for source, platform, link in cases:
            presentation = build_item_author_presentation(
                {"source": source, "kind": "site", "value": "https://example.com"},
                author=f"{platform}网",
                fullname=f"{platform}网",
                x_url=None,
                link=link,
            )

            self.assertEqual(presentation["display_author"], f"{platform}网")
            self.assertIsNone(presentation["display_handle"])
            self.assertEqual(presentation["author_profile_url"], link)
            self.assertEqual(presentation["author_profile_platform"], platform)

    def test_parse_target_value_accepts_18mh_url(self):
        self.assertEqual(
            parse_target_value("https://18mh.net/mv/all"),
            {
                "source": "18mh",
                "kind": "site",
                "value": "https://18mh.net",
                "normalized_value": "18mh.net",
            },
        )

    def test_parse_target_value_accepts_rou_url(self):
        self.assertEqual(
            parse_target_value("https://rou.video/v"),
            {
                "source": "rou",
                "kind": "site",
                "value": "https://rou.video",
                "normalized_value": "rou.video",
            },
        )

    def test_parse_target_value_accepts_dadaafa_url(self):
        self.assertEqual(
            parse_target_value("https://dadaafa.cc/?utm_source=xx&tab=new"),
            {
                "source": "dadaafa",
                "kind": "site",
                "value": "https://dadaafa.cc",
                "normalized_value": "dadaafa.cc",
            },
        )

    def test_parse_target_value_accepts_tikporn_url(self):
        self.assertEqual(
            parse_target_value("https://tik.porn/"),
            {
                "source": "tikporn",
                "kind": "site",
                "value": "https://tik.porn",
                "normalized_value": "tik.porn",
            },
        )

    def test_parse_target_value_accepts_18j_url(self):
        self.assertEqual(
            parse_target_value("https://18j.tv/show/1/"),
            {
                "source": "18j",
                "kind": "site",
                "value": "https://18j.tv",
                "normalized_value": "18j.tv",
            },
        )

    def test_parse_target_value_accepts_91porna_url(self):
        self.assertEqual(
            parse_target_value("https://91porna.com/comic/index/video?category=new_update"),
            {
                "source": "91porna",
                "kind": "site",
                "value": "https://91porna.com",
                "normalized_value": "91porna.com",
            },
        )

    def test_parse_target_value_accepts_91porn_url(self):
        self.assertEqual(
            parse_target_value("https://91porn.com/v.php?next=watch&page=1"),
            {
                "source": "91porn",
                "kind": "site",
                "value": "https://91porn.com",
                "normalized_value": "91porn.com",
            },
        )

    def test_parse_target_value_accepts_91rb_url(self):
        self.assertEqual(
            parse_target_value("https://www.91rb.com/latest-updates/"),
            {
                "source": "91rb",
                "kind": "site",
                "value": "https://www.91rb.com",
                "normalized_value": "www.91rb.com",
            },
        )

    def test_parse_target_value_accepts_badnews_url(self):
        self.assertEqual(
            parse_target_value("https://bad.news/sort-new/page-1"),
            {
                "source": "badnews",
                "kind": "site",
                "value": "https://bad.news",
                "normalized_value": "bad.news",
            },
        )

    def test_parse_target_value_accepts_dirtyship_url(self):
        self.assertEqual(
            parse_target_value("https://dirtyship.com/sample-video/"),
            {
                "source": "dirtyship",
                "kind": "site",
                "value": "https://dirtyship.com",
                "normalized_value": "dirtyship.com",
            },
        )

    def test_site_sources_do_not_use_target_homepage_as_item_link(self):
        presentation = build_item_author_presentation(
            {"source": "cg91", "kind": "site", "value": "https://www.91cg1.com"},
            author="91吃瓜网",
            fullname="91吃瓜网",
            x_url=None,
            link=None,
        )

        self.assertEqual(presentation["display_author"], "91吃瓜网")
        self.assertIsNone(presentation["display_handle"])
        self.assertIsNone(presentation["author_profile_url"])
        self.assertIsNone(presentation["author_profile_platform"])

    def test_douyin_normalized_item_uses_video_specific_source_url(self):
        item = normalize_douyin_item(
            "https://xygrfrfb3g.b2h7y8w.com",
            {
                "isAd": "n",
                "id": "video-1",
                "name": "Video",
                "play_links": [
                    {
                        "code": "line1",
                        "name": "线路1",
                        "m3u8_url": "/api/m3u8/p/video.m3u8",
                    }
                ],
            },
        )

        self.assertIsNotNone(item)
        self.assertEqual(item["source_url"], "https://xygrfrfb3g.b2h7y8w.com/recommend/?id=video-1")

    def test_collector_insert_sql_params_stay_aligned(self):
        conn = FakeConnection()
        now = datetime(2026, 6, 5, 12, 0, tzinfo=timezone.utc)
        verified = {
            "video_url": "https://media.example/video.m3u8",
            "video_url_expires_at": now + timedelta(hours=1),
        }
        detail = {
            "url": "https://www.91cg1.com/post/1",
            "page_id": "1",
            "title": "Title",
            "description": "Description",
            "image": "https://static.example/image.jpg",
            "published_at": now,
            "modified_at": now,
            "duration": 120,
            "view_count": 10,
            "created_at_label": "1小时前",
            "category": "视频",
            "tags": ["视频"],
            "players": [{"video_id": "video-1"}],
        }
        player = {
            "guid": "site:video:1",
            "player_index": 0,
            "video_id": "video-1",
            "video_type": "hls",
            "tags": ["视频"],
            "video_title": "Video title",
        }

        inserted = insert_items(
            conn,
            {"id": "target-id", "source": "twitter", "kind": "user", "value": "openai"},
            [
                {
                    "guid": "tweet-1",
                    "author": "@openai",
                    "fullname": "OpenAI",
                    "content": "Video",
                    "raw_content": "Video",
                    "translated_content": None,
                    "link": "https://x.com/openai/status/1",
                    "x_url": "https://x.com/openai/status/1",
                    "images": [],
                    "video_url": "https://video.example/video.mp4",
                    "published": now.isoformat(),
                    "stored_at": now.isoformat(),
                    "is_retweet": False,
                }
            ],
            None,
        )
        self.assertEqual(inserted, 1)

        self.assertEqual(
            upsert_resolved_youtube_item(
                conn,
                {
                    "target_id": "target-id",
                    "payload": {
                        "channel_id": "UC12345678901234567890",
                        "provider_video_id": "abc123",
                        "guid": "yt:video:abc123",
                        "author": "Channel",
                        "fullname": "Channel",
                        "title": "Video",
                        "content": "Video",
                        "raw_content": "Video",
                        "link": "https://www.youtube.com/watch?v=abc123",
                        "images": [],
                        "expires_at": (now + timedelta(hours=3)).isoformat(),
                        "published_at": now.isoformat(),
                    },
                },
                {"video_url": "https://media.example/video.mp4", "video_url_expires_at": now + timedelta(hours=1)},
            ),
            "item-id",
        )

        self.assertTrue(upsert_heiliao_video_item(conn, {"id": "target-id", "source": "heiliao", "kind": "site", "value": "https://among.uvsoskqus.cc"}, detail, player, verified, 84))
        self.assertTrue(upsert_cg91_video_item(conn, {"id": "target-id", "source": "cg91", "kind": "site", "value": "https://www.91cg1.com"}, detail, player, verified, 84))
        self.assertTrue(upsert_baoliao51_video_item(conn, {"id": "target-id", "source": "baoliao51", "kind": "site", "value": "https://www.51baoliao01.com"}, detail, player, verified, 84))
        self.assertTrue(upsert_18mh_video_item(conn, {"id": "target-id", "source": "18mh", "kind": "site", "value": "https://18mh.net"}, detail, player | {"guid": "18mh:1"}, verified, 84))
        self.assertTrue(upsert_dadaafa_video_item(conn, {"id": "target-id", "source": "dadaafa", "kind": "site", "value": "https://dadaafa.cc"}, detail | {"video_id": "1"}, player | {"guid": "dadaafa:1"}, verified, 84))
        self.assertTrue(upsert_18j_video_item(conn, {"id": "target-id", "source": "18j", "kind": "site", "value": "https://18j.tv"}, detail | {"video_id": "1"}, player | {"guid": "18j:1"}, verified, 84))
        self.assertTrue(upsert_91porn_video_item(conn, {"id": "target-id", "source": "91porn", "kind": "site", "value": "https://91porn.com"}, detail | {"url": "https://91porn.com/view_video.php?viewkey=1", "video_id": "1"}, player | {"guid": "91porn:1"}, verified | {"media_format": "mp4"}, 84))
        self.assertTrue(upsert_badnews_video_item(conn, {"id": "target-id", "source": "badnews", "kind": "site", "value": "https://bad.news"}, detail | {"url": "https://bad.news/t/1", "video_id": "1"}, player | {"guid": "badnews:1"}, verified | {"media_format": "hls"}, 84))
        self.assertTrue(
            upsert_douyin_video_item(
                conn,
                {"id": "target-id", "source": "douyin", "kind": "site", "value": "https://xygrfrfb3g.b2h7y8w.com"},
                {
                    "guid": "douyin:1",
                    "source_url": "https://xygrfrfb3g.b2h7y8w.com/v/1",
                    "title": "Video",
                    "description": "Description",
                    "image": "https://static.example/image.jpg",
                    "published_at": now,
                    "id": "1",
                    "video_id": "video-1",
                    "play_links": [],
                    "tags": [],
                },
                verified,
                84,
            )
        )


if __name__ == "__main__":
    unittest.main()
