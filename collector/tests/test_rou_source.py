import struct
import unittest
import zlib

from collector.rou_source import normalize_hls_playlist_url, unwrap_rou_payload


class RouSourceTests(unittest.TestCase):
    def test_normalize_rou_api_hls_endpoint(self):
        self.assertEqual(
            normalize_hls_playlist_url("/api/hls/video-1", "https://rou.video"),
            "https://rou.video/api/hls/video-1",
        )


    def test_unwrap_rou_payload_decodes_compressed_payload(self):
        payload = b"#EXTM3U\n#EXTINF:8.0,\nsegment.png\n"
        chunk_type = 0x726F5564
        compressed = zlib.compress(payload)
        chunk = struct.pack(">II", len(compressed) + 1, chunk_type) + b"\x01" + compressed + b"\x00\x00\x00\x00"
        png = b"\x89PNG\r\n\x1a\n" + chunk
        self.assertEqual(unwrap_rou_payload(png), payload)
