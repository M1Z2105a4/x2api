type AuthorPresentationInput = {
  source: string;
  target: string | null;
  author?: string | null;
  fullname?: string | null;
  xUrl?: string | null;
  link?: string | null;
};

export type AuthorPresentation = {
  displayAuthor: string;
  displayHandle: string | null;
  authorProfileUrl: string | null;
  authorProfilePlatform: string | null;
};

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const DETAIL_LINK_PROFILE_PLATFORMS: Record<string, string> = {
  heiliao: "黑料",
  cg91: "91吃瓜",
  baoliao51: "51爆料",
  douyin: "抖阴",
  "18mh": "禁漫天堂",
  rou: "肉視頻",
  dadaafa: "DadaAFA",
  "18j": "18J.TV",
  "1mtif": "蜜桃视频",
  tikporn: "Tik.Porn",
  "91porna": "91porna",
  "91porn": "91porn",
  "91rb": "91热爆",
  badnews: "Bad.news",
  pornhub: "Pornhub",
  pinse: "91PinSe",
  bdrq: "背德人妻",
  avgood: "AvGood",
  "705hs": "992KP",
  xxxtik: "xxxtik",
  affair: "911爆料",
  attach: "黑料吃瓜网",
  dirtyship: "DirtyShip",
  influencersgonewild: "InfluencersGoneWild",
  missav: "MISSAV",
};

export function buildAuthorPresentation(input: AuthorPresentationInput): AuthorPresentation {
  const source = normalizePresentationSource(input.source);
  const profile = authorProfile(source, input);
  const displayAuthor =
    nonEmpty(input.fullname) ??
    nonEmpty(input.author) ??
    displayTarget(input.target) ??
    sourceDisplayName(source);

  return {
    displayAuthor,
    displayHandle: source === "twitter" && nonEmpty(input.fullname) ? twitterHandle(input.author) : null,
    authorProfileUrl: profile?.url ?? null,
    authorProfilePlatform: profile?.platform ?? null,
  };
}

export function resolveAuthorPresentation(
  input: AuthorPresentationInput & Partial<AuthorPresentation>,
): AuthorPresentation {
  const built = buildAuthorPresentation(input);
  return {
    displayAuthor: nonEmpty(input.displayAuthor) ?? built.displayAuthor,
    displayHandle: nonEmpty(input.displayHandle) ?? built.displayHandle,
    authorProfileUrl: nonEmpty(input.authorProfileUrl) ?? built.authorProfileUrl,
    authorProfilePlatform: nonEmpty(input.authorProfilePlatform) ?? built.authorProfilePlatform,
  };
}

export function normalizePresentationSource(value: string) {
  const source = value.trim().toLowerCase();
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
    case "18mh":
    case "mh18":
      return "18mh";
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
    default:
      return source;
  }
}

function authorProfile(source: string, input: AuthorPresentationInput) {
  if (source === "youtube") {
    const url = youtubeProfileUrl(input.target) ?? youtubeProfileUrl(input.link);
    return url ? { url, platform: "YouTube" } : null;
  }

  if (source === "twitter") {
    const username =
      twitterUsername(input.author) ??
      twitterUsername(input.target) ??
      twitterUsername(input.xUrl) ??
      twitterUsername(input.link);
    return username ? { url: `https://x.com/${username}`, platform: "X" } : null;
  }

  const detailLinkPlatform = DETAIL_LINK_PROFILE_PLATFORMS[source];
  if (detailLinkPlatform) {
    const url = httpUrl(input.link);
    return url ? { url, platform: detailLinkPlatform } : null;
  }

  return null;
}

function sourceDisplayName(source: string) {
  switch (source) {
    case "twitter":
      return "X";
    case "youtube":
      return "YouTube";
    case "heiliao":
      return "黑料";
    case "cg91":
      return "91吃瓜";
    case "baoliao51":
      return "51爆料";
    case "douyin":
      return "抖阴";
    case "18mh":
      return "禁漫天堂";
    case "rou":
      return "肉視頻";
    case "dadaafa":
      return "DadaAFA";
    case "18j":
      return "18J.TV";
    case "1mtif":
      return "蜜桃视频";
    case "tikporn":
      return "Tik.Porn";
    case "91porna":
      return "91porna";
    case "91porn":
      return "91porn";
    case "91rb":
      return "91热爆";
    case "badnews":
      return "Bad.news";
    case "pornhub":
      return "Pornhub";
    case "pinse":
      return "91PinSe";
    case "missav":
      return "MISSAV";
    case "bdrq":
      return "背德人妻";
    case "avgood":
      return "AvGood";
    case "705hs":
      return "992KP";
    case "xxxtik":
      return "xxxtik";
    case "affair":
      return "911爆料";
    case "attach":
      return "黑料吃瓜网";
    case "dirtyship":
      return "DirtyShip";
    case "influencersgonewild":
      return "InfluencersGoneWild";
    default:
      return source || "X";
  }
}

function displayTarget(value: string | null | undefined) {
  let target = nonEmpty(value);
  if (!target) {
    return null;
  }

  const separatorIndex = target.indexOf(":");
  if (separatorIndex > 0) {
    target = target.slice(separatorIndex + 1);
  }
  return nonEmpty(target);
}

function twitterHandle(value: string | null | undefined) {
  const username = twitterUsername(value);
  return username ? `@${username}` : null;
}

function twitterUsername(value: string | null | undefined) {
  let username = nonEmpty(value);
  if (!username) {
    return null;
  }

  username = username
    .replace(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\//i, "")
    .replace(/^@+/, "")
    .trim();
  const slashIndex = username.indexOf("/");
  if (slashIndex >= 0) {
    username = username.slice(0, slashIndex);
  }
  username = nonEmpty(username) ?? "";
  return /^[A-Za-z0-9_]{1,15}$/.test(username) ? username : null;
}

function youtubeProfileUrl(value: string | null | undefined) {
  let raw = nonEmpty(value);
  if (!raw) {
    return null;
  }

  raw = raw.replace(/^youtube:/i, "");
  const channelID = youtubeChannelID(raw);
  if (channelID) {
    return `https://www.youtube.com/channel/${channelID}`;
  }

  if (raw.startsWith("@")) {
    return `https://www.youtube.com/${raw}`;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const user = nonEmpty(url.searchParams.get("user"));
  if (user) {
    return `https://www.youtube.com/user/${user}`;
  }

  const playlistID = nonEmpty(url.searchParams.get("playlist_id"));
  if (playlistID) {
    return `https://www.youtube.com/playlist?list=${playlistID}`;
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length >= 2 && ["channel", "user", "c"].includes(pathParts[0]!.toLowerCase())) {
    return `https://www.youtube.com/${pathParts[0]}/${pathParts[1]}`;
  }
  const first = pathParts[0];
  if (first?.startsWith("@")) {
    return `https://www.youtube.com/${first}`;
  }
  return null;
}

function httpUrl(value: string | null | undefined) {
  const raw = nonEmpty(value);
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function youtubeChannelID(value: string | null | undefined) {
  let channelID = nonEmpty(value);
  if (!channelID) {
    return null;
  }

  try {
    const url = new URL(channelID);
    if (YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
      channelID = nonEmpty(url.searchParams.get("channel_id")) ?? channelID;
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0]?.toLowerCase() === "channel") {
        channelID = pathParts[1]!;
      }
    }
  } catch {
    // Plain channel IDs are expected here.
  }

  return channelID.startsWith("UC") ? channelID : null;
}

function nonEmpty(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
