export type TargetSource = "twitter" | "youtube" | "heiliao" | "cg91" | "baoliao51" | "douyin" | "18mh" | "rou" | "dadaafa" | "18j" | "1mtif" | "tikporn" | "91porna" | "91porn" | "91rb" | "badnews" | "pornhub" | "pinse" | "bdrq" | "avgood" | "705hs" | "xxxtik" | "affair" | "attach" | "caoliu" | "dirtyship" | "influencersgonewild" | "missav";
export type TargetKind = "user" | "keyword" | "channel" | "site";

export type ParsedTarget = {
  source: TargetSource;
  kind: TargetKind;
  value: string;
  normalizedValue: string;
  category?: string | null;
  tags: string[];
};

const MAX_TARGET_TAGS = 12;
const MAX_TARGET_TAG_LENGTH = 40;
const MAX_TARGET_CATEGORY_LENGTH = 80;
const YOUTUBE_CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{20,}$/;
const YOUTUBE_FEED_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const HEILIAO_DEFAULT_URL = "https://among.uvsoskqus.cc";
const CG91_DEFAULT_URL = "https://www.91cg1.com";
const BAOLIAO51_DEFAULT_URL = "https://www.51baoliao01.com/category/jrbl/";
const DOUYIN_DEFAULT_URL = "https://xygrfrfb3g.b2h7y8w.com";
const MH18_DEFAULT_URL = "https://18mh.net";
const ROU_DEFAULT_URL = "https://rou.video";
const DADAAFA_DEFAULT_URL = "https://dadaafa.cc";
const J18_DEFAULT_URL = "https://18j.tv";
const MTIF_DEFAULT_URL = "https://1mtif.sbs";
const TIKPORN_DEFAULT_URL = "https://tik.porn";
const PORNA91_DEFAULT_URL = "https://91porna.com";
const PORN91_DEFAULT_URL = "https://91porn.com";
const RB91_DEFAULT_URL = "https://www.91rb.com";
const BADNEWS_DEFAULT_URL = "https://bad.news";
const PORNHUB_DEFAULT_URL = "https://cn.pornhub.com/recommended?o=time";
const PINSE_DEFAULT_URL = "https://91pinse.com/v/";
const BDRQ_DEFAULT_URL = "https://g3h4i5j6.bdrq45.cc";
const AVGOOD_DEFAULT_URL = "https://avgood.com";
const HS705_DEFAULT_URL = "https://705hs.com";
const XXXTIK_DEFAULT_URL = "https://xxxtik.com";
const AFFAIR_DEFAULT_URL = "https://affair.zhkrsawaw.cc/category/jrgb/";
const ATTACH_DEFAULT_URL = "https://attach.bslqmdvk.cc/category/zxcg/";
const DIRTYSHIP_DEFAULT_URL = "https://dirtyship.com";
const INFLUENCERSGONEWILD_DEFAULT_URL = "https://influencersgonewild.com";
const MISSAV_DEFAULT_URL = "https://missav.app/vodtype/20/";

function normalizeHeiliaoTargetValue(raw: string) {
  const value = (raw.trim() || HEILIAO_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function normalizeHeiliaoTargetKey(value: string) {
  return new URL(value).host.toLowerCase();
}

function isHeiliaoTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = url.host.toLowerCase();
    return host === "among.uvsoskqus.cc" || host.endsWith(".uvsoskqus.cc");
  } catch {
    return false;
  }
}

function normalizeCg91TargetValue(raw: string) {
  const value = (raw.trim() || CG91_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isCg91TargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "91cg1.com" || url.host.toLowerCase() === "www.91cg1.com";
  } catch {
    return false;
  }
}

function normalizeBaoliao51TargetValue(raw: string) {
  const value = raw.trim() || BAOLIAO51_DEFAULT_URL;
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  let path = url.pathname || "/category/jrbl/";
  if (path === "/") {
    path = "/category/jrbl/";
  }
  path = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  return `${url.protocol}//${url.host.toLowerCase()}${path}`;
}

function isBaoliao51TargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "51baoliao01.com" || url.host.toLowerCase() === "www.51baoliao01.com";
  } catch {
    return false;
  }
}

function normalizeDouyinTargetValue(raw: string) {
  const value = (raw.trim() || DOUYIN_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isDouyinTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === new URL(DOUYIN_DEFAULT_URL).host.toLowerCase();
  } catch {
    return false;
  }
}

function normalize18mhTargetValue(raw: string) {
  const value = (raw.trim() || MH18_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function is18mhTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "18mh.net" || url.host.toLowerCase() === "www.18mh.net";
  } catch {
    return false;
  }
}

function normalizeRouTargetValue(raw: string) {
  const value = (raw.trim() || ROU_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isRouTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "rou.video" || url.host.toLowerCase() === "www.rou.video";
  } catch {
    return false;
  }
}

function normalizeDadaAfaTargetValue(raw: string) {
  const value = (raw.trim() || DADAAFA_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isDadaAfaTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "dadaafa.cc" || url.host.toLowerCase() === "www.dadaafa.cc";
  } catch {
    return false;
  }
}

function normalize18jTargetValue(raw: string) {
  const value = (raw.trim() || J18_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function is18jTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "18j.tv" || url.host.toLowerCase() === "www.18j.tv";
  } catch {
    return false;
  }
}

function normalizeMtifTargetValue(raw: string) {
  const value = (raw.trim() || MTIF_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isMtifTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "1mtif.sbs" || url.host.toLowerCase() === "www.1mtif.sbs";
  } catch {
    return false;
  }
}

function normalizeTikPornTargetValue(raw: string) {
  const value = (raw.trim() || TIKPORN_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isTikPornTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "tik.porn" || url.host.toLowerCase() === "www.tik.porn";
  } catch {
    return false;
  }
}

function normalizePorna91TargetValue(raw: string) {
  const value = (raw.trim() || PORNA91_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isPorna91TargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "91porna.com" || url.host.toLowerCase() === "www.91porna.com";
  } catch {
    return false;
  }
}

function normalizePorn91TargetValue(raw: string) {
  const value = (raw.trim() || PORN91_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isPorn91TargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "91porn.com" || url.host.toLowerCase() === "www.91porn.com";
  } catch {
    return false;
  }
}

function normalizeRb91TargetValue(raw: string) {
  const value = (raw.trim() || RB91_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isRb91TargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "91rb.com" || url.host.toLowerCase() === "www.91rb.com";
  } catch {
    return false;
  }
}

function normalizeBadNewsTargetValue(raw: string) {
  const value = (raw.trim() || BADNEWS_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isBadNewsTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "bad.news" || url.host.toLowerCase() === "www.bad.news";
  } catch {
    return false;
  }
}

function normalizePornhubTargetValue(raw: string) {
  const value = (raw.trim() || PORNHUB_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (!["pornhub.com", "www.pornhub.com", "cn.pornhub.com"].includes(url.host.toLowerCase())) throw new Error("Pornhub targets must use pornhub.com.");
  return `${url.protocol}//${url.host.toLowerCase()}${url.pathname || "/recommended"}${url.search || "?o=time"}`;
}

function isPornhubTargetURL(raw: string) {
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return ["pornhub.com", "www.pornhub.com", "cn.pornhub.com"].includes(url.host.toLowerCase()) && url.pathname.startsWith("/recommended");
  } catch { return false; }
}

function normalizePinseTargetValue(raw: string) {
  const value = (raw.trim() || PINSE_DEFAULT_URL).replace(/\/+$/, "") + "/";
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (!["91pinse.com", "www.91pinse.com"].includes(url.host.toLowerCase())) throw new Error("91PinSe targets must use 91pinse.com.");
  return `${url.protocol}//${url.host.toLowerCase()}${url.pathname}`;
}

function isPinseTargetURL(raw: string) {
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return ["91pinse.com", "www.91pinse.com"].includes(url.host.toLowerCase()) && url.pathname.startsWith("/v");
  } catch { return false; }
}

function normalizeBdrqTargetValue(raw: string) {
  const value = (raw.trim() || BDRQ_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isBdrqTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = url.host.toLowerCase();
    return host === "bdrq45.cc" || host.endsWith(".bdrq45.cc") || host === "bdrq12.cc" || host.endsWith(".bdrq12.cc");
  } catch {
    return false;
  }
}

function normalizeAvGoodTargetValue(raw: string) {
  const value = (raw.trim() || AVGOOD_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isAvGoodTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "avgood.com" || url.host.toLowerCase() === "www.avgood.com";
  } catch {
    return false;
  }
}

function normalizeHs705TargetValue(raw: string) {
  const value = (raw.trim() || HS705_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isHs705TargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "705hs.com" || url.host.toLowerCase() === "www.705hs.com";
  } catch {
    return false;
  }
}

function normalizeXxxTikTargetValue(raw: string) {
  const value = (raw.trim() || XXXTIK_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isXxxTikTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "xxxtik.com" || url.host.toLowerCase() === "www.xxxtik.com";
  } catch {
    return false;
  }
}

function normalizeAffairTargetValue(raw: string) {
  const value = raw.trim() || AFFAIR_DEFAULT_URL;
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  let path = url.pathname || "/category/jrgb/";
  if (path === "/") {
    path = "/category/jrgb/";
  }
  path = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  return `${url.protocol}//${url.host.toLowerCase()}${path}`;
}

function isAffairTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = url.host.toLowerCase();
    return host === "affair.zhkrsawaw.cc" || host === "911bl.com" || host === "www.911bl.com";
  } catch {
    return false;
  }
}

function normalizeAttachTargetValue(raw: string) {
  const value = raw.trim() || ATTACH_DEFAULT_URL;
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  let path = url.pathname || "/category/zxcg/";
  if (path === "/") {
    path = "/category/zxcg/";
  }
  path = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  return `${url.protocol}//${url.host.toLowerCase()}${path}`;
}

function isAttachTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = url.host.toLowerCase();
    return host === "attach.bslqmdvk.cc" || host === "hlcgw.com" || host === "www.hlcgw.com";
  } catch {
    return false;
  }
}

function normalizeDirtyShipTargetValue(raw: string) {
  const value = (raw.trim() || DIRTYSHIP_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isDirtyShipTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "dirtyship.com" || url.host.toLowerCase() === "www.dirtyship.com";
  } catch {
    return false;
  }
}

function normalizeInfluencersGoneWildTargetValue(raw: string) {
  const value = (raw.trim() || INFLUENCERSGONEWILD_DEFAULT_URL).replace(/\/+$/, "");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  return `${url.protocol}//${url.host.toLowerCase()}`;
}

function isInfluencersGoneWildTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "influencersgonewild.com" || url.host.toLowerCase() === "www.influencersgonewild.com";
  } catch {
    return false;
  }
}

function normalizeMissavTargetValue(raw: string) {
  const value = raw.trim() || MISSAV_DEFAULT_URL;
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  let path = url.pathname || "/vodtype/20/";
  if (path === "/") {
    path = "/vodtype/20/";
  }
  path = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  return `${url.protocol}//${url.host.toLowerCase()}${path}`;
}

function isMissavTargetURL(raw: string) {
  try {
    const value = raw.trim();
    if (!value) {
      return false;
    }
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.host.toLowerCase() === "missav.app" || url.host.toLowerCase() === "www.missav.app";
  } catch {
    return false;
  }
}

function normalizeYouTubeChannelID(raw: string) {
  const value = raw.trim();
  if (!value) {
    throw new Error("YouTube channel target cannot be empty.");
  }

  let channelID = value;
  try {
    const url = new URL(value);
    const host = url.host.toLowerCase();
    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      const feedChannelID = url.searchParams.get("channel_id")?.trim();
      if (feedChannelID) {
        channelID = feedChannelID;
      } else {
        const components = url.pathname.split("/").filter(Boolean);
        if (components[0]?.toLowerCase() === "channel" && components[1]) {
          channelID = components[1];
        }
      }
    }
  } catch {
    if (value.toLowerCase().startsWith("/channel/")) {
      channelID = value.split("/").filter(Boolean)[1] ?? value;
    }
  }

  if (!YOUTUBE_CHANNEL_ID_PATTERN.test(channelID)) {
    throw new Error("YouTube channel target must be a channel ID or /channel/UC... URL.");
  }
  return channelID;
}

function normalizeYouTubeFeedURL(raw: string) {
  const value = raw.trim();
  if (!value) {
    throw new Error("YouTube feed target cannot be empty.");
  }

  const url = new URL(value);
  const host = url.host.toLowerCase();
  if (!YOUTUBE_FEED_HOSTS.has(host) || url.pathname !== "/feeds/videos.xml") {
    throw new Error("YouTube feed target must be a YouTube feed URL.");
  }

  const channelID = url.searchParams.get("channel_id")?.trim();
  if (channelID && YOUTUBE_CHANNEL_ID_PATTERN.test(channelID)) {
    return channelID;
  }

  const user = url.searchParams.get("user")?.trim();
  if (user) {
    const normalized = new URL("https://www.youtube.com/feeds/videos.xml");
    normalized.searchParams.set("user", user);
    return normalized.toString();
  }

  const playlistID = url.searchParams.get("playlist_id")?.trim();
  if (playlistID) {
    const normalized = new URL("https://www.youtube.com/feeds/videos.xml");
    normalized.searchParams.set("playlist_id", playlistID);
    return normalized.toString();
  }

  throw new Error("YouTube feed target must include channel_id, user, or playlist_id.");
}

function isYouTubeTargetURL(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.host.toLowerCase();
    return YOUTUBE_FEED_HOSTS.has(host) && (url.pathname === "/feeds/videos.xml" || url.pathname.startsWith("/channel/"));
  } catch {
    return value.trim().toLowerCase().startsWith("/channel/") || value.trim().toLowerCase().startsWith("/feeds/videos.xml");
  }
}

function normalizeYouTubeTargetValue(raw: string) {
  const value = raw.trim();
  if (!value) {
    throw new Error("YouTube target cannot be empty.");
  }

  if (value.toLowerCase().startsWith("/channel/")) {
    const parts = value.split("/").filter(Boolean);
    const channelID = parts[1];
    if (!channelID) {
      throw new Error("YouTube channel target cannot be empty.");
    }
    return normalizeYouTubeChannelID(channelID);
  }

  if (value.toLowerCase().startsWith("/feeds/videos.xml") || value.includes("youtube.com/feeds/videos.xml")) {
    return normalizeYouTubeFeedURL(value);
  }

  if (value.includes("youtube.com")) {
    const url = new URL(value);
    const host = url.host.toLowerCase();
    if (!YOUTUBE_FEED_HOSTS.has(host)) {
      throw new Error("YouTube target must be a YouTube URL.");
    }
    if (url.pathname === "/feeds/videos.xml") {
      return normalizeYouTubeFeedURL(value);
    }
    return normalizeYouTubeChannelID(value);
  }

  return normalizeYouTubeChannelID(value);
}

export function parseTarget(raw: string): ParsedTarget {
  const value = raw.trim();
  if (!value) {
    throw new Error("Target cannot be empty.");
  }

  if (value.toLowerCase().startsWith("avgood:")) {
    const normalized = normalizeAvGoodTargetValue(value.slice("avgood:".length));
    return { source: "avgood", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("avgood.com:")) {
    const normalized = normalizeAvGoodTargetValue(value.slice("avgood.com:".length));
    return { source: "avgood", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isAvGoodTargetURL(value)) {
    const normalized = normalizeAvGoodTargetValue(value);
    return { source: "avgood", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("705hs:")) {
    const normalized = normalizeHs705TargetValue(value.slice("705hs:".length));
    return { source: "705hs", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("705hs.com:")) {
    const normalized = normalizeHs705TargetValue(value.slice("705hs.com:".length));
    return { source: "705hs", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("992kp:")) {
    const normalized = normalizeHs705TargetValue(value.slice("992kp:".length));
    return { source: "705hs", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("992kp.com:")) {
    const normalized = normalizeHs705TargetValue(value.slice("992kp.com:".length));
    return { source: "705hs", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isHs705TargetURL(value)) {
    const normalized = normalizeHs705TargetValue(value);
    return { source: "705hs", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("xxxtik:")) {
    const normalized = normalizeXxxTikTargetValue(value.slice("xxxtik:".length));
    return { source: "xxxtik", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("xxxtik.com:")) {
    const normalized = normalizeXxxTikTargetValue(value.slice("xxxtik.com:".length));
    return { source: "xxxtik", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isXxxTikTargetURL(value)) {
    const normalized = normalizeXxxTikTargetValue(value);
    return { source: "xxxtik", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("affair:")) {
    const normalized = normalizeAffairTargetValue(value.slice("affair:".length));
    return { source: "affair", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("911bl:")) {
    const normalized = normalizeAffairTargetValue(value.slice("911bl:".length));
    return { source: "affair", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("911bl.com:")) {
    const normalized = normalizeAffairTargetValue(value.slice("911bl.com:".length));
    return { source: "affair", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isAffairTargetURL(value)) {
    const normalized = normalizeAffairTargetValue(value);
    return { source: "affair", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("attach:")) {
    const normalized = normalizeAttachTargetValue(value.slice("attach:".length));
    return { source: "attach", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("hlcgw:")) {
    const normalized = normalizeAttachTargetValue(value.slice("hlcgw:".length));
    return { source: "attach", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("attach.bslqmdvk.cc:")) {
    const normalized = normalizeAttachTargetValue(value.slice("attach.bslqmdvk.cc:".length));
    return { source: "attach", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isAttachTargetURL(value)) {
    const normalized = normalizeAttachTargetValue(value);
    return { source: "attach", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("dirtyship:")) {
    const normalized = normalizeDirtyShipTargetValue(value.slice("dirtyship:".length));
    return { source: "dirtyship", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("dirtyship.com:")) {
    const normalized = normalizeDirtyShipTargetValue(value.slice("dirtyship.com:".length));
    return { source: "dirtyship", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isDirtyShipTargetURL(value)) {
    const normalized = normalizeDirtyShipTargetValue(value);
    return { source: "dirtyship", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("influencersgonewild:")) {
    const normalized = normalizeInfluencersGoneWildTargetValue(value.slice("influencersgonewild:".length));
    return { source: "influencersgonewild", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("igw:")) {
    const normalized = normalizeInfluencersGoneWildTargetValue(value.slice("igw:".length));
    return { source: "influencersgonewild", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("influencersgonewild.com:")) {
    const normalized = normalizeInfluencersGoneWildTargetValue(value.slice("influencersgonewild.com:".length));
    return { source: "influencersgonewild", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isInfluencersGoneWildTargetURL(value)) {
    const normalized = normalizeInfluencersGoneWildTargetValue(value);
    return { source: "influencersgonewild", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("missav:")) {
    const normalized = normalizeMissavTargetValue(value.slice("missav:".length));
    return { source: "missav", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("missav.app:")) {
    const normalized = normalizeMissavTargetValue(value.slice("missav.app:".length));
    return { source: "missav", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isMissavTargetURL(value)) {
    const normalized = normalizeMissavTargetValue(value);
    return { source: "missav", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("bdrq:")) {
    const normalized = normalizeBdrqTargetValue(value.slice("bdrq:".length));
    return { source: "bdrq", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("bdrq45:")) {
    const normalized = normalizeBdrqTargetValue(value.slice("bdrq45:".length));
    return { source: "bdrq", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("bdrq12:")) {
    const normalized = normalizeBdrqTargetValue(value.slice("bdrq12:".length));
    return { source: "bdrq", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isBdrqTargetURL(value)) {
    const normalized = normalizeBdrqTargetValue(value);
    return { source: "bdrq", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("badnews:")) {
    const normalized = normalizeBadNewsTargetValue(value.slice("badnews:".length));
    return { source: "badnews", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("bad.news:")) {
    const normalized = normalizeBadNewsTargetValue(value.slice("bad.news:".length));
    return { source: "badnews", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isBadNewsTargetURL(value)) {
    const normalized = normalizeBadNewsTargetValue(value);
    return { source: "badnews", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("pornhub:")) {
    const normalized = normalizePornhubTargetValue(value.slice("pornhub:".length));
    return { source: "pornhub", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }
  if (isPornhubTargetURL(value)) {
    const normalized = normalizePornhubTargetValue(value);
    return { source: "pornhub", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("pinse:")) {
    const normalized = normalizePinseTargetValue(value.slice("pinse:".length));
    return { source: "pinse", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }
  if (isPinseTargetURL(value)) {
    const normalized = normalizePinseTargetValue(value);
    return { source: "pinse", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("91porn:")) {
    const normalized = normalizePorn91TargetValue(value.slice("91porn:".length));
    return { source: "91porn", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isPorn91TargetURL(value)) {
    const normalized = normalizePorn91TargetValue(value);
    return { source: "91porn", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("91rb:")) {
    const normalized = normalizeRb91TargetValue(value.slice("91rb:".length));
    return { source: "91rb", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("rb91:")) {
    const normalized = normalizeRb91TargetValue(value.slice("rb91:".length));
    return { source: "91rb", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isRb91TargetURL(value)) {
    const normalized = normalizeRb91TargetValue(value);
    return { source: "91rb", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("91porna:")) {
    const normalized = normalizePorna91TargetValue(value.slice("91porna:".length));
    return { source: "91porna", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("porna91:")) {
    const normalized = normalizePorna91TargetValue(value.slice("porna91:".length));
    return { source: "91porna", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isPorna91TargetURL(value)) {
    const normalized = normalizePorna91TargetValue(value);
    return { source: "91porna", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("tikporn:")) {
    const normalized = normalizeTikPornTargetValue(value.slice("tikporn:".length));
    return { source: "tikporn", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("tik.porn:")) {
    const normalized = normalizeTikPornTargetValue(value.slice("tik.porn:".length));
    return { source: "tikporn", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isTikPornTargetURL(value)) {
    const normalized = normalizeTikPornTargetValue(value);
    return { source: "tikporn", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("rou:")) {
    const normalized = normalizeRouTargetValue(value.slice("rou:".length));
    return { source: "rou", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isRouTargetURL(value)) {
    const normalized = normalizeRouTargetValue(value);
    return { source: "rou", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("dadaafa:")) {
    const normalized = normalizeDadaAfaTargetValue(value.slice("dadaafa:".length));
    return { source: "dadaafa", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isDadaAfaTargetURL(value)) {
    const normalized = normalizeDadaAfaTargetValue(value);
    return { source: "dadaafa", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("18j:")) {
    const normalized = normalize18jTargetValue(value.slice("18j:".length));
    return { source: "18j", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (is18jTargetURL(value)) {
    const normalized = normalize18jTargetValue(value);
    return { source: "18j", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("1mtif:")) {
    const normalized = normalizeMtifTargetValue(value.slice("1mtif:".length));
    return { source: "1mtif", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("mtif:")) {
    const normalized = normalizeMtifTargetValue(value.slice("mtif:".length));
    return { source: "1mtif", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isMtifTargetURL(value)) {
    const normalized = normalizeMtifTargetValue(value);
    return { source: "1mtif", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("douyin:")) {
    const normalized = normalizeDouyinTargetValue(value.slice("douyin:".length));
    return { source: "douyin", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isDouyinTargetURL(value)) {
    const normalized = normalizeDouyinTargetValue(value);
    return { source: "douyin", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("18mh:")) {
    const normalized = normalize18mhTargetValue(value.slice("18mh:".length));
    return { source: "18mh", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (is18mhTargetURL(value)) {
    const normalized = normalize18mhTargetValue(value);
    return { source: "18mh", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("baoliao51:")) {
    const normalized = normalizeBaoliao51TargetValue(value.slice("baoliao51:".length));
    return { source: "baoliao51", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (isBaoliao51TargetURL(value)) {
    const normalized = normalizeBaoliao51TargetValue(value);
    return { source: "baoliao51", kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  }

  if (value.toLowerCase().startsWith("cg91:")) {
    const normalized = normalizeCg91TargetValue(value.slice("cg91:".length));
    return {
      source: "cg91",
      kind: "site",
      value: normalized,
      normalizedValue: normalizeHeiliaoTargetKey(normalized),
      tags: [],
    };
  }

  if (isCg91TargetURL(value)) {
    const normalized = normalizeCg91TargetValue(value);
    return {
      source: "cg91",
      kind: "site",
      value: normalized,
      normalizedValue: normalizeHeiliaoTargetKey(normalized),
      tags: [],
    };
  }

  if (value.toLowerCase().startsWith("heiliao:")) {
    const normalized = normalizeHeiliaoTargetValue(value.slice("heiliao:".length));
    return {
      source: "heiliao",
      kind: "site",
      value: normalized,
      normalizedValue: normalizeHeiliaoTargetKey(normalized),
      tags: [],
    };
  }

  if (isHeiliaoTargetURL(value)) {
    const normalized = normalizeHeiliaoTargetValue(value);
    return {
      source: "heiliao",
      kind: "site",
      value: normalized,
      normalizedValue: normalizeHeiliaoTargetKey(normalized),
      tags: [],
    };
  }

  if (value.toLowerCase().startsWith("youtube:")) {
    const normalized = normalizeYouTubeTargetValue(value.slice("youtube:".length));
    return {
      source: "youtube",
      kind: "channel",
      value: normalized,
      normalizedValue: normalized.toLowerCase(),
      tags: [],
    };
  }

  if (isYouTubeTargetURL(value)) {
    const normalized = normalizeYouTubeTargetValue(value);
    return {
      source: "youtube",
      kind: "channel",
      value: normalized,
      normalizedValue: normalized.toLowerCase(),
      tags: [],
    };
  }

  if (value.startsWith("search:")) {
    const keyword = value.slice("search:".length).trim();
    if (!keyword) {
      throw new Error("Keyword target cannot be empty.");
    }
    return {
      source: "twitter",
      kind: "keyword",
      value: keyword,
      normalizedValue: keyword.toLowerCase(),
      tags: [],
    };
  }

  return {
    source: "twitter",
    kind: "user",
    value,
    normalizedValue: value.toLowerCase(),
    tags: [],
  };
}

export function formatTarget(target: ParsedTarget | { source?: TargetSource; kind: TargetKind; value: string }): string {
  if (target.source === "avgood") {
    return `avgood:${target.value}`;
  }
  if (target.source === "705hs") {
    return `705hs:${target.value}`;
  }
  if (target.source === "xxxtik") {
    return `xxxtik:${target.value}`;
  }
  if (target.source === "affair") {
    return `affair:${target.value}`;
  }
  if (target.source === "attach") {
    return `attach:${target.value}`;
  }
  if (target.source === "dirtyship") {
    return `dirtyship:${target.value}`;
  }
  if (target.source === "influencersgonewild") {
    return `influencersgonewild:${target.value}`;
  }
  if (target.source === "missav") {
    return `missav:${target.value}`;
  }
  if (target.source === "bdrq") {
    return `bdrq:${target.value}`;
  }
  if (target.source === "badnews") {
    return `badnews:${target.value}`;
  }
  if (target.source === "pornhub") {
    return `pornhub:${target.value}`;
  }
  if (target.source === "pinse") {
    return `pinse:${target.value}`;
  }
  if (target.source === "91porn") {
    return `91porn:${target.value}`;
  }
  if (target.source === "91rb") {
    return `91rb:${target.value}`;
  }
  if (target.source === "91porna") {
    return `91porna:${target.value}`;
  }
  if (target.source === "tikporn") {
    return `tikporn:${target.value}`;
  }
  if (target.source === "rou") {
    return `rou:${target.value}`;
  }
  if (target.source === "dadaafa") {
    return `dadaafa:${target.value}`;
  }
  if (target.source === "18j") {
    return `18j:${target.value}`;
  }
  if (target.source === "1mtif") {
    return `1mtif:${target.value}`;
  }
  if (target.source === "douyin") {
    return `douyin:${target.value}`;
  }
  if (target.source === "18mh") {
    return `18mh:${target.value}`;
  }
  if (target.source === "heiliao") {
    return `heiliao:${target.value}`;
  }
  if (target.source === "cg91") {
    return `cg91:${target.value}`;
  }
  if (target.source === "baoliao51") {
    return `baoliao51:${target.value}`;
  }
  if (target.source === "youtube") {
    return `youtube:${target.value}`;
  }
  return target.kind === "keyword" ? `search:${target.value}` : target.value;
}

function normalizeTargetTag(rawTag: unknown) {
  if (typeof rawTag !== "string") {
    throw new Error("Each target tag must be a string.");
  }

  const tag = rawTag.trim();
  if (!tag) {
    return null;
  }
  if (tag.length > MAX_TARGET_TAG_LENGTH) {
    throw new Error(`Target tag cannot exceed ${MAX_TARGET_TAG_LENGTH} characters.`);
  }

  return tag;
}

function normalizeTargetTags(rawTags: unknown) {
  if (rawTags === undefined || rawTags === null) {
    return [];
  }
  if (!Array.isArray(rawTags)) {
    throw new Error("Target tags must be an array.");
  }

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const rawTag of rawTags) {
    const tag = normalizeTargetTag(rawTag);
    if (!tag) {
      continue;
    }

    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
    if (tags.length > MAX_TARGET_TAGS) {
      throw new Error(`Each target can have at most ${MAX_TARGET_TAGS} tags.`);
    }
  }

  return tags;
}

function normalizeTargetCategory(rawCategory: unknown) {
  if (typeof rawCategory !== "string") {
    throw new Error("Target category must be a string.");
  }

  const category = rawCategory.trim();
  if (!category) {
    throw new Error("Target category is required.");
  }
  if (category.length > MAX_TARGET_CATEGORY_LENGTH) {
    throw new Error(`Target category cannot exceed ${MAX_TARGET_CATEGORY_LENGTH} characters.`);
  }

  return category;
}

function normalizeTargetSource(rawSource: unknown): TargetSource {
  if (rawSource === undefined || rawSource === null) {
    return "twitter";
  }
  if (typeof rawSource !== "string") {
    throw new Error("Target source must be a string.");
  }
  const source = rawSource.trim().toLowerCase();
  switch (source) {
    case "x":
    case "twitter":
      return "twitter";
    case "yt":
    case "youtube":
      return "youtube";
    case "91":
    case "cg91":
      return "cg91";
    case "51":
    case "baoliao51":
      return "baoliao51";
    case "rou":
    case "rouvideo":
    case "rou.video":
      return "rou";
    case "dada":
    case "dadaafa":
      return "dadaafa";
    case "18j":
    case "18j.tv":
    case "j18":
      return "18j";
    case "1mtif":
    case "mtif":
    case "1mtif.sbs":
      return "1mtif";
    case "tik":
    case "tikporn":
    case "tik.porn":
      return "tikporn";
    case "badnews":
    case "bad.news":
      return "badnews";
    case "pornhub":
    case "pornhub.com":
    case "cn.pornhub.com":
      return "pornhub";
    case "pinse":
    case "91pinse":
    case "91pinse.com":
      return "pinse";
    case "avgood":
    case "avgood.com":
      return "avgood";
    case "705hs":
    case "705hs.com":
    case "992kp":
    case "992kp.com":
      return "705hs";
    case "xxxtik":
    case "xxxtik.com":
      return "xxxtik";
    case "affair":
    case "911bl":
    case "911bl.com":
    case "affair.zhkrsawaw.cc":
      return "affair";
    case "attach":
    case "attach.bslqmdvk.cc":
    case "hlcgw":
    case "hlcgw.com":
      return "attach";
    case "dirtyship":
    case "dirtyship.com":
      return "dirtyship";
    case "influencersgonewild":
    case "influencersgonewild.com":
    case "igw":
      return "influencersgonewild";
    case "missav":
    case "missav.app":
      return "missav";
    case "bdrq":
    case "bdrq45":
    case "bdrq45.cc":
    case "bdrq12":
    case "bdrq12.cc":
      return "bdrq";
    case "91porn":
    case "91porn.com":
      return "91porn";
    case "91rb":
    case "rb91":
    case "91rb.com":
      return "91rb";
    case "91porna":
    case "porna91":
      return "91porna";
    case "heiliao":
    case "douyin":
      return source;
    case "18mh":
    case "mh18":
      return "18mh";
    default:
      throw new Error("Unsupported target source.");
  }
}

function assertFrontendSubscriptionSourceAllowed(source: TargetSource) {
  if (source === "caoliu") {
    throw new Error("Unsupported target source.");
  }
}

function normalizeTargetKind(rawKind: unknown, source: TargetSource): TargetKind | null {
  if (rawKind === undefined || rawKind === null) {
    return null;
  }
  if (typeof rawKind !== "string") {
    throw new Error("Target kind must be a string.");
  }
  const kind = rawKind.trim().toLowerCase();
  if (source === "youtube") {
    if (kind === "channel") {
      return "channel";
    }
    throw new Error("YouTube targets must use channel kind.");
  }
  if (source === "heiliao") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("Heiliao targets must use site kind.");
  }
  if (source === "cg91") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("91cg targets must use site kind.");
  }
  if (source === "baoliao51") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("51baoliao targets must use site kind.");
  }
  if (source === "douyin") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("Douyin targets must use site kind.");
  }
  if (source === "18mh") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("18mh targets must use site kind.");
  }
  if (source === "rou") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("RouVideo targets must use site kind.");
  }
  if (source === "dadaafa") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("DadaAFA targets must use site kind.");
  }
  if (source === "18j") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("18j targets must use site kind.");
  }
  if (source === "1mtif") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("1mtif targets must use site kind.");
  }
  if (source === "tikporn") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("Tik.Porn targets must use site kind.");
  }
  if (source === "91porna") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("91porna targets must use site kind.");
  }
  if (source === "91porn") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("91porn targets must use site kind.");
  }
  if (source === "91rb") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("91rb targets must use site kind.");
  }
  if (source === "badnews") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("Bad.news targets must use site kind.");
  }
  if (source === "pornhub") {
    if (kind === "site") return "site";
    throw new Error("Pornhub targets must use site kind.");
  }
  if (source === "pinse") {
    if (kind === "site") return "site";
    throw new Error("91PinSe targets must use site kind.");
  }
  if (source === "avgood") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("AvGood targets must use site kind.");
  }
  if (source === "705hs") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("705hs targets must use site kind.");
  }
  if (source === "xxxtik") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("xxxtik targets must use site kind.");
  }
  if (source === "affair") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("Affair targets must use site kind.");
  }
  if (source === "attach") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("Attach targets must use site kind.");
  }
  if (source === "dirtyship") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("DirtyShip targets must use site kind.");
  }
  if (source === "influencersgonewild") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("InfluencersGoneWild targets must use site kind.");
  }
  if (source === "missav") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("MISSAV targets must use site kind.");
  }
  if (source === "bdrq") {
    if (kind === "site") {
      return "site";
    }
    throw new Error("BDRQ targets must use site kind.");
  }
  if (kind === "user" || kind === "keyword") {
    return kind;
  }
  throw new Error("Twitter targets must use user or keyword kind.");
}

function parseObjectTarget(candidate: { source?: unknown; kind?: unknown; target?: unknown; category?: unknown; tags?: unknown }) {
  if (typeof candidate.target !== "string") {
    throw new Error("Each target object must include a string target.");
  }
  if (candidate.category === undefined || candidate.category === null) {
    throw new Error("Target category is required.");
  }

  const source = normalizeTargetSource(candidate.source);
  assertFrontendSubscriptionSourceAllowed(source);
  const explicitKind = normalizeTargetKind(candidate.kind, source);
  let parsed: ParsedTarget;
  if (source === "youtube") {
    const normalized = normalizeYouTubeTargetValue(candidate.target);
    parsed = {
      source,
      kind: "channel",
      value: normalized,
      normalizedValue: normalized.toLowerCase(),
      tags: [],
    };
  } else if (source === "heiliao") {
    const normalized = normalizeHeiliaoTargetValue(candidate.target);
    parsed = {
      source,
      kind: "site",
      value: normalized,
      normalizedValue: normalizeHeiliaoTargetKey(normalized),
      tags: [],
    };
  } else if (source === "cg91") {
    const normalized = normalizeCg91TargetValue(candidate.target);
    parsed = {
      source,
      kind: "site",
      value: normalized,
      normalizedValue: normalizeHeiliaoTargetKey(normalized),
      tags: [],
    };
  } else if (source === "baoliao51") {
    const normalized = normalizeBaoliao51TargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "douyin") {
    const normalized = normalizeDouyinTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "18mh") {
    const normalized = normalize18mhTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "rou") {
    const normalized = normalizeRouTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "dadaafa") {
    const normalized = normalizeDadaAfaTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "18j") {
    const normalized = normalize18jTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "1mtif") {
    const normalized = normalizeMtifTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "tikporn") {
    const normalized = normalizeTikPornTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "91porna") {
    const normalized = normalizePorna91TargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "91porn") {
    const normalized = normalizePorn91TargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "91rb") {
    const normalized = normalizeRb91TargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "badnews") {
    const normalized = normalizeBadNewsTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "pornhub") {
    const normalized = normalizePornhubTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "pinse") {
    const normalized = normalizePinseTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "avgood") {
    const normalized = normalizeAvGoodTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "705hs") {
    const normalized = normalizeHs705TargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "xxxtik") {
    const normalized = normalizeXxxTikTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "affair") {
    const normalized = normalizeAffairTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "attach") {
    const normalized = normalizeAttachTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "dirtyship") {
    const normalized = normalizeDirtyShipTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "influencersgonewild") {
    const normalized = normalizeInfluencersGoneWildTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "missav") {
    const normalized = normalizeMissavTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (source === "bdrq") {
    const normalized = normalizeBdrqTargetValue(candidate.target);
    parsed = { source, kind: "site", value: normalized, normalizedValue: normalizeHeiliaoTargetKey(normalized), tags: [] };
  } else if (explicitKind === "keyword") {
    parsed = parseTarget(candidate.target.toLowerCase().startsWith("search:") ? candidate.target : `search:${candidate.target}`);
  } else if (explicitKind === "user") {
    parsed = parseTarget(candidate.target);
  } else {
    parsed = parseTarget(candidate.target);
  }

  if (explicitKind && parsed.kind !== explicitKind) {
    throw new Error("Target kind does not match target value.");
  }
  if (parsed.source !== source) {
    throw new Error("Target source does not match target value.");
  }

  return {
    ...parsed,
    category: normalizeTargetCategory(candidate.category),
    tags: normalizeTargetTags(candidate.tags),
  };
}

function parseTargetInput(rawTarget: unknown) {
  if (typeof rawTarget === "string") {
    return parseTarget(rawTarget);
  }

  if (!rawTarget || typeof rawTarget !== "object" || Array.isArray(rawTarget)) {
    throw new Error("Each target must be a string or an object.");
  }

  return parseObjectTarget(rawTarget as { source?: unknown; kind?: unknown; target?: unknown; category?: unknown; tags?: unknown });
}

export function parseTargets(rawTargets: unknown): ParsedTarget[] {
  if (!Array.isArray(rawTargets)) {
    throw new Error("Expected an array of targets.");
  }

  const seen = new Set<string>();
  const parsed: ParsedTarget[] = [];

  for (const rawTarget of rawTargets) {
    const target = parseTargetInput(rawTarget);
    assertFrontendSubscriptionSourceAllowed(target.source);
    const key = `${target.source}:${target.kind}:${target.normalizedValue}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    parsed.push(target);
  }

  return parsed;
}
