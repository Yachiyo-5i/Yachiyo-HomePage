import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const root = resolve("dist");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/qq/playlist") {
      await handlePlaylist(url, res);
      return;
    }

    if (url.pathname === "/api/qq/song-url") {
      await handleSongUrl(url, res);
      return;
    }

    await serveStatic(url, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Home server listening at http://127.0.0.1:${port}/`);
});

async function handlePlaylist(url, res) {
  const raw = url.searchParams.get("url") || url.searchParams.get("id") || "";
  const id = extractPlaylistId(raw);

  if (!id) {
    sendJson(res, 400, { error: "Missing QQ Music playlist id or url" });
    return;
  }

  const endpoint =
    "https://i.y.qq.com/qzone-music/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg";
  const params = new URLSearchParams({
    type: "1",
    json: "1",
    utf8: "1",
    onlysong: "0",
    disstid: id,
    format: "jsonp",
    g_tk: "5381",
    jsonpCallback: "callback",
    loginUin: "0",
    hostUin: "0",
    inCharset: "utf8",
    outCharset: "utf-8",
    notice: "0",
    platform: "yqq",
    needNewCode: "0",
  });

  const response = await fetch(`${endpoint}?${params}`, {
    headers: qqHeaders(),
  });
  const text = await response.text();
  const data = parseJsonp(text);
  const playlist = data?.cdlist?.[0];

  if (!response.ok || !playlist) {
    sendJson(res, 502, { error: "Failed to load QQ Music playlist" });
    return;
  }

  sendJson(res, 200, {
    id,
    title: playlist.dissname || "QQ Music Playlist",
    cover: normalizeCover(playlist.logo),
    description: stripHtml(playlist.desc || ""),
    tracks: (playlist.songlist || []).map(normalizeTrack).filter(Boolean),
  });
}

async function handleSongUrl(url, res) {
  const mid = url.searchParams.get("mid");
  const mediaMid = url.searchParams.get("mediaMid") || mid;

  if (!mid || !mediaMid) {
    sendJson(res, 400, { error: "Missing song mid" });
    return;
  }

  const filename = `M500${mediaMid}.mp3`;
  const payload = {
    req_0: {
      module: "vkey.GetVkeyServer",
      method: "CgiGetVkey",
      param: {
        guid: "10000",
        songmid: [mid],
        songtype: [0],
        uin: "0",
        loginflag: 1,
        platform: "20",
        filename: [filename],
      },
    },
    comm: {
      uin: "0",
      format: "json",
      ct: 24,
      cv: 0,
    },
  };

  const response = await fetch("https://u.y.qq.com/cgi-bin/musicu.fcg", {
    method: "POST",
    headers: {
      ...qqHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  const info = data?.req_0?.data?.midurlinfo?.[0];
  const purl = info?.purl;
  const sip = data?.req_0?.data?.sip?.find((item) => item.startsWith("https://")) ||
    data?.req_0?.data?.sip?.[0] ||
    "https://dl.stream.qqmusic.qq.com/";

  if (!response.ok || !purl) {
    sendJson(res, 404, {
      error: "No playable URL returned. The song may require VIP/login or be region restricted.",
      detail: info?.tips || info?.errtype || "",
    });
    return;
  }

  sendJson(res, 200, {
    url: new URL(purl, sip).toString(),
    expiresIn: 3600,
  });
}

function extractPlaylistId(value) {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const disstid = url.searchParams.get("disstid") || url.searchParams.get("id");
    if (disstid && /^\d+$/.test(disstid)) return disstid;

    const match = url.pathname.match(/playlist\/(\d+)/);
    if (match) return match[1];
  } catch {
    return "";
  }

  return "";
}

function parseJsonp(text) {
  const normalized = text.trim().replace(/^callback\(/, "").replace(/\);?$/, "");
  return JSON.parse(normalized);
}

function normalizeTrack(song) {
  const mid = song.songmid;
  if (!mid) return null;

  return {
    id: String(song.songid || mid),
    mid,
    mediaMid: song.strMediaMid || mid,
    title: song.songname || song.songorig || "Untitled",
    artist: (song.singer || []).map((item) => item.name).filter(Boolean).join(" / "),
    album: song.albumname || "",
    duration: Number(song.interval || 0),
    cover: song.albummid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg`
      : "",
  };
}

function normalizeCover(url) {
  if (!url) return "";
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/g, "").trim();
}

function qqHeaders() {
  return {
    referer: "https://y.qq.com/",
    origin: "https://y.qq.com",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  };
}

async function serveStatic(url, res) {
  const pathname = decodeURIComponent(url.pathname);
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(root, safePath);

  if (pathname.endsWith("/")) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    filePath = join(root, "index.html");
  }

  const info = await stat(filePath);
  if (info.isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  res.writeHead(200, {
    "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "cache-control": filePath.includes(`${join("dist", "config")}`)
      ? "no-store"
      : "public, max-age=300",
  });
  createReadStream(filePath).pipe(res);
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(value));
}
