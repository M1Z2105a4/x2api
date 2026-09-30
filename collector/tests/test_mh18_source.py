from __future__ import annotations

import unittest
from unittest.mock import patch

from collector import mh18_source as mh18


class Mh18SourceTests(unittest.TestCase):
    def test_proxy_playlist_url_is_normalized_and_verified(self):
        html = """
        <script>const _detail_ = {"id":"69681","title":"Sample","duration":120,
        "url":"/media/m3u8?url=https%3A%2F%2Fxv.dzuxta.cn%2Fvideo.m3u8&exp=1790664747&token=abc"};</script>
        """
        playlist = "#EXTM3U\n#EXTINF:120,\nhttps://xv.dzuxta.cn/segment.ts\n"
        with patch.object(mh18, "fetch_html", return_value=html), patch.object(mh18, "fetch_hls_text", return_value=playlist), patch.object(mh18, "read_hls_chunk", return_value=b"segment"):
            detail = mh18.parse_detail_page("https://18mh.net/mv/detail/69681")
            verified = mh18.verify_hls_url(detail["players"][0]["video_url"], detail["url"])

        self.assertEqual(detail["players"][0]["video_url"], "https://18mh.net/media/m3u8?url=https%3A%2F%2Fxv.dzuxta.cn%2Fvideo.m3u8&exp=1790664747&token=abc")
        self.assertEqual(verified["playlist_duration_seconds"], 120)


if __name__ == "__main__":
    unittest.main()
