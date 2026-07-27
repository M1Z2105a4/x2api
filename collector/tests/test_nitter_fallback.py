from __future__ import annotations

import base64
import json
import unittest
from unittest.mock import patch

from collector.twitter_monitor import (
    NITTER_RUNTIME_DISABLE_PENALTY,
    classify_nitter_page,
    enrich_nitter_rss_tweets,
    fetch_nitter_with_curl,
    load_nitter_browser_storage_state,
    order_instances_for_attempts,
    parse_nitter_rss,
    parse_nitter_timeline_html,
    scrape_nitter_with_playwright,
)


TIMELINE_HTML = """
<html><body>
  <div class="timeline-item">
    <a class="tweet-link" href="/alice/status/123#m"></a>
    <div class="tweet-content">Hello from Nitter</div>
    <a class="tweet-date"><a title="Jul 27, 2026 · 1:00 PM UTC"></a></a>
    <a class="username">@alice</a>
    <a class="fullname">Alice</a>
    <div class="attachments gallery-video">
      <img src="/pic/media%2Fexample.jpg" />
      <a class="video-download" href="/video/SIGNATURE/https%3A%2F%2Fvideo.twimg.com%2Fvideo.mp4"></a>
    </div>
  </div>
</body></html>
"""

RSS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
  <channel>
    <title>Alice / @alice</title>
    <item>
      <title>Hello from RSS</title>
      <dc:creator>@alice</dc:creator>
      <description><![CDATA[
        <p>Hello from RSS</p>
        <a href="https://nitter.net/alice/status/456#m">
          <br>Video<br>
          <img src="https://nitter.net/pic/amplify_video_thumb%2F456%2Fimg%2Fposter.jpg" />
        </a>
      ]]></description>
      <pubDate>Mon, 27 Jul 2026 05:00:00 GMT</pubDate>
      <guid isPermaLink="false">456</guid>
      <link>https://nitter.net/alice/status/456#m</link>
    </item>
  </channel>
</rss>
"""

DETAIL_HTML = TIMELINE_HTML.replace(
    '<a class="tweet-link" href="/alice/status/123#m"></a>',
    "",
).replace(
    '<a title="Jul 27, 2026 · 1:00 PM UTC"></a>',
    '<a href="/alice/status/123#m" title="Jul 27, 2026 · 1:00 PM UTC"></a>',
)


class FakeResponse:
    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text


class NitterFallbackTest(unittest.TestCase):
    def test_loads_browser_storage_state_from_base64_secret(self):
        state = {"cookies": [{"name": "session", "value": "authorized"}], "origins": []}
        encoded = base64.b64encode(json.dumps(state).encode()).decode()

        with patch("collector.twitter_monitor.NITTER_BROWSER_STORAGE_STATE_B64", encoded):
            self.assertEqual(load_nitter_browser_storage_state(), state)

    def test_classifies_empty_and_challenge_pages(self):
        self.assertEqual(classify_nitter_page(200, ""), "empty")
        self.assertEqual(classify_nitter_page(200, "<title>Making sure you're not a bot!</title>"), "challenge")
        self.assertEqual(classify_nitter_page(403, "Forbidden"), "denied")
        self.assertEqual(classify_nitter_page(502, "Bad Gateway"), "server_error")

    def test_parses_timeline_html(self):
        tweets = parse_nitter_timeline_html("alice", "https://nitter.net", TIMELINE_HTML)

        self.assertEqual(len(tweets), 1)
        self.assertEqual(tweets[0]["guid"], "123")
        self.assertEqual(tweets[0]["content"], "Hello from Nitter")
        self.assertEqual(tweets[0]["x_url"], "https://x.com/alice/status/123")
        self.assertEqual(tweets[0]["author"], "@alice")
        self.assertEqual(tweets[0]["video_url"], "https://video.twimg.com/video.mp4")
        self.assertEqual(tweets[0]["video_poster_url"], tweets[0]["images"][0])

    def test_parses_tweet_detail_link_from_date_anchor(self):
        tweets = parse_nitter_timeline_html("alice", "https://nitter.net", DETAIL_HTML)

        self.assertEqual(len(tweets), 1)
        self.assertEqual(tweets[0]["guid"], "123")
        self.assertEqual(tweets[0]["video_url"], "https://video.twimg.com/video.mp4")

    def test_user_and_keyword_html_share_the_same_field_shape(self):
        user_tweet = parse_nitter_timeline_html("alice", "https://nitter.net", TIMELINE_HTML)[0]
        keyword_tweet = parse_nitter_timeline_html("search:AI", "https://nitter.net", TIMELINE_HTML)[0]

        self.assertEqual(set(user_tweet), set(keyword_tweet))
        self.assertEqual(keyword_tweet["target_type"], "keyword")
        self.assertEqual(keyword_tweet["target_value"], "AI")
        self.assertEqual(user_tweet["target_type"], "user")
        self.assertEqual(user_tweet["target_value"], "alice")

    def test_parses_rss_as_existing_tweet_shape(self):
        tweets = parse_nitter_rss("alice", "https://nitter.net", RSS_XML)

        self.assertEqual(len(tweets), 1)
        self.assertEqual(tweets[0]["guid"], "456")
        self.assertEqual(tweets[0]["published"], "2026-07-27T05:00:00+00:00")
        self.assertEqual(tweets[0]["video_poster_url"], tweets[0]["images"][0])
        self.assertEqual(tweets[0]["x_url"], "https://x.com/alice/status/456")

        keyword_tweet = parse_nitter_rss("search:AI", "https://nitter.net", RSS_XML)[0]
        self.assertEqual(set(tweets[0]), set(keyword_tweet))
        self.assertEqual(keyword_tweet["target_type"], "keyword")
        self.assertEqual(keyword_tweet["target_value"], "AI")
        self.assertIsNone(keyword_tweet["fullname"])

    @patch(
        "collector.twitter_monitor.requests.get",
        return_value=FakeResponse(200, TIMELINE_HTML.replace("/123", "/456")),
    )
    def test_rss_video_is_enriched_from_tweet_detail(self, request_get):
        tweets = parse_nitter_rss("alice", "https://nitter.net", RSS_XML)

        enriched = enrich_nitter_rss_tweets("alice", "https://nitter.net", tweets)

        self.assertEqual(request_get.call_count, 1)
        self.assertEqual(enriched[0]["video_url"], "https://video.twimg.com/video.mp4")
        self.assertEqual(enriched[0]["content"], "Hello from Nitter")

    def test_rejects_xcancel_whitelist_placeholder_feed(self):
        rss_xml = RSS_XML.replace("Alice / @alice", "RSS reader not yet whitelisted!")
        self.assertEqual(parse_nitter_rss("alice", "https://rss.xcancel.com", rss_xml), [])

    @patch("collector.twitter_monitor.subprocess.run")
    def test_curl_transport_separates_body_and_status(self, subprocess_run):
        subprocess_run.return_value.returncode = 0
        subprocess_run.return_value.stdout = TIMELINE_HTML.encode() + b"\n200"

        response = fetch_nitter_with_curl("https://nitter.net/alice")

        self.assertEqual(response, (200, TIMELINE_HTML))

    @patch("collector.twitter_monitor.fetch_nitter_with_curl", return_value=(200, TIMELINE_HTML))
    @patch("collector.twitter_monitor.requests.get", return_value=FakeResponse(200, ""))
    def test_empty_requests_response_uses_curl_html(self, _request_get, curl):
        tweets = scrape_nitter_with_playwright("alice", ["https://nitter.net"], {})

        self.assertEqual(len(tweets), 1)
        self.assertEqual(tweets[0]["guid"], "123")
        curl.assert_called_once_with("https://nitter.net/alice")

    @patch("collector.twitter_monitor.requests.get", return_value=FakeResponse(200, TIMELINE_HTML))
    def test_scraper_uses_http_timeline_without_starting_playwright(self, request_get):
        tweets = scrape_nitter_with_playwright("alice", ["https://nitter.net"], {})

        self.assertEqual(len(tweets), 1)
        self.assertEqual(request_get.call_count, 1)

    @patch("collector.twitter_monitor.NITTER_RSS_DETAIL_LIMIT", 0)
    @patch("collector.twitter_monitor.fetch_nitter_with_curl", return_value=None)
    @patch("collector.twitter_monitor.requests.get")
    def test_empty_html_falls_back_to_rss(self, request_get, _curl):
        request_get.side_effect = [FakeResponse(200, ""), FakeResponse(200, RSS_XML)]
        penalties: dict[str, int] = {}

        tweets = scrape_nitter_with_playwright("alice", ["https://nitter.net"], penalties)

        self.assertEqual(len(tweets), 1)
        self.assertEqual(tweets[0]["guid"], "456")
        self.assertEqual(penalties, {})

    @patch("collector.twitter_monitor.time.sleep")
    @patch("collector.twitter_monitor.fetch_nitter_with_curl", return_value=None)
    @patch("collector.twitter_monitor.requests.get")
    def test_keyword_empty_response_retries_before_rss(self, request_get, _curl, sleep):
        request_get.side_effect = [FakeResponse(200, ""), FakeResponse(200, TIMELINE_HTML)]

        tweets = scrape_nitter_with_playwright("search:AI", ["https://nitter.net"], {})

        self.assertEqual(len(tweets), 1)
        self.assertEqual(tweets[0]["target_type"], "keyword")
        self.assertEqual(request_get.call_count, 2)
        sleep.assert_called_once_with(1)

    @patch("collector.twitter_monitor.fetch_nitter_with_browser")
    @patch(
        "collector.twitter_monitor.requests.get",
        return_value=FakeResponse(200, "<title>Verifying your browser...</title>"),
    )
    def test_challenge_uses_browser_then_disables_failed_instance(self, _request_get, browser_fetch):
        penalties: dict[str, int] = {}

        def fail_browser(_target, fallbacks, runtime_penalties):
            for instance, _url in fallbacks:
                runtime_penalties[instance] = NITTER_RUNTIME_DISABLE_PENALTY
            return []

        browser_fetch.side_effect = fail_browser

        tweets = scrape_nitter_with_playwright("alice", ["https://xcancel.com"], penalties)

        self.assertEqual(tweets, [])
        browser_fetch.assert_called_once_with(
            "alice",
            [("https://xcancel.com", "https://xcancel.com/alice")],
            penalties,
        )
        self.assertEqual(penalties["https://xcancel.com"], NITTER_RUNTIME_DISABLE_PENALTY)
        self.assertEqual(
            order_instances_for_attempts(["https://xcancel.com", "https://nitter.net"], penalties),
            ["https://nitter.net"],
        )


if __name__ == "__main__":
    unittest.main()
