from __future__ import annotations

import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from collector.twitter_monitor import insert_items, tweet_has_media


class FakeCursor:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False


class FakeConnection:
    def cursor(self, **_kwargs):
        return FakeCursor()


def make_tweet(*, guid: str, images=None, video_url=None) -> dict:
    now = datetime(2026, 7, 28, 12, 0, tzinfo=timezone.utc).isoformat()
    return {
        "guid": guid,
        "target": "alice",
        "target_type": "user",
        "target_value": "alice",
        "author": "@alice",
        "fullname": "Alice",
        "content": "Tweet content",
        "link": f"https://x.com/alice/status/{guid}",
        "x_url": f"https://x.com/alice/status/{guid}",
        "images": images if images is not None else [],
        "video_url": video_url,
        "published": now,
        "stored_at": now,
        "is_retweet": False,
    }


class TwitterSensitiveMediaFilterTest(unittest.TestCase):
    def setUp(self):
        self.conn = FakeConnection()
        self.target = {"id": "target-id", "source": "twitter", "kind": "user", "value": "alice"}

    def test_media_detection_ignores_blank_values(self):
        self.assertFalse(tweet_has_media({"images": ["", "  "], "video_url": " "}))
        self.assertTrue(tweet_has_media({"images": ["https://example.com/image.jpg"], "video_url": None}))
        self.assertTrue(tweet_has_media({"images": [], "video_url": "https://example.com/video.mp4"}))

    @patch("collector.twitter_monitor.rewrite_images_with_imgbb")
    @patch("collector.twitter_monitor.upsert_item_record_with_opensearch", return_value=("item-id", True))
    @patch("collector.twitter_monitor.load_target_context", return_value={"is_sensitive": True})
    def test_sensitive_item_without_media_is_not_stored(self, _context, upsert, rewrite):
        inserted = insert_items(self.conn, self.target, [make_tweet(guid="1")], None)

        self.assertEqual(inserted, 0)
        upsert.assert_not_called()
        rewrite.assert_not_called()

    @patch("collector.twitter_monitor.rewrite_images_with_imgbb")
    @patch("collector.twitter_monitor.upsert_item_record_with_opensearch", return_value=("item-id", True))
    @patch("collector.twitter_monitor.load_target_context", return_value={"is_sensitive": True})
    def test_sensitive_item_with_image_is_stored(self, _context, upsert, rewrite):
        tweet = make_tweet(guid="2", images=["https://example.com/image.jpg"])

        inserted = insert_items(self.conn, self.target, [tweet], None)

        self.assertEqual(inserted, 1)
        rewrite.assert_called_once_with([tweet])
        upsert.assert_called_once()

    @patch("collector.twitter_monitor.rewrite_images_with_imgbb")
    @patch("collector.twitter_monitor.upsert_item_record_with_opensearch", return_value=("item-id", True))
    @patch("collector.twitter_monitor.load_target_context", return_value={"is_sensitive": True})
    def test_sensitive_item_with_video_is_stored(self, _context, upsert, rewrite):
        tweet = make_tweet(guid="3", video_url="https://example.com/video.mp4")

        inserted = insert_items(self.conn, self.target, [tweet], None)

        self.assertEqual(inserted, 1)
        rewrite.assert_called_once_with([tweet])
        upsert.assert_called_once()

    @patch("collector.twitter_monitor.rewrite_images_with_imgbb")
    @patch("collector.twitter_monitor.upsert_item_record_with_opensearch", return_value=("item-id", True))
    @patch("collector.twitter_monitor.load_target_context", return_value={"is_sensitive": False})
    def test_non_sensitive_item_without_media_is_stored(self, _context, upsert, rewrite):
        tweet = make_tweet(guid="4")

        inserted = insert_items(self.conn, self.target, [tweet], None)

        self.assertEqual(inserted, 1)
        rewrite.assert_called_once_with([tweet])
        upsert.assert_called_once()


if __name__ == "__main__":
    unittest.main()
