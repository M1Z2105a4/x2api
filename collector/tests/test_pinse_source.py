import unittest

from collector.pinse_source import build_list_page_url, normalize_pinse_target_value


class PinseSourceTests(unittest.TestCase):
    def test_normalizes_target_and_page(self):
        self.assertEqual(normalize_pinse_target_value("https://91pinse.com/v/"), "https://91pinse.com/v/")
        self.assertEqual(build_list_page_url("https://91pinse.com/v/", 10), "https://91pinse.com/v/?page=10")

