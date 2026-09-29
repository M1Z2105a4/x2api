import unittest

from collector.pornhub_source import (
    build_list_page_url,
    normalize_pornhub_target_value,
    pornhub_playback_expiry,
)


class PornhubSourceTests(unittest.TestCase):
    def test_normalizes_recommended_target_and_pages(self):
        self.assertEqual(
            normalize_pornhub_target_value("https://cn.pornhub.com/recommended?o=time"),
            "https://cn.pornhub.com/recommended?o=time",
        )
        self.assertEqual(
            build_list_page_url("https://cn.pornhub.com/recommended?o=time", 5),
            "https://cn.pornhub.com/recommended?o=time&page=5",
        )

    def test_reads_signed_validto_expiry(self):
        self.assertIsNotNone(
            pornhub_playback_expiry(
                "https://ev-h.phncdn.com/master.m3u8?validfrom=1790647861&validto=1790655061"
            )
        )

