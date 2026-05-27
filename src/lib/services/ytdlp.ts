import type { TrackInfo, AudioFormat } from "$lib/types";

interface YtDlpFormat {
  format_id: string;
  ext: string;
  acodec: string;
  vcodec: string;
  abr?: number;
  tbr?: number;
  url: string;
  filesize?: number;
}

interface YtDlpInfo {
  id: string;
  title: string;
  artist?: string;
  uploader?: string;
  duration?: number;
  webpage_url?: string;
  thumbnail?: string;
  formats?: YtDlpFormat[];
  url?: string;
  ext?: string;
}

function isTauri(): boolean {
  try {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  } catch {
    return false;
  }
}

function pickBestFormat(formats: YtDlpFormat[]): { url: string; ext: string; bitrate: number } {
  const audioOnly = formats
    .filter((f) => f.vcodec === "none" && f.acodec !== "none" && f.url)
    .sort((a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0));

  if (audioOnly.length > 0) {
    const best = audioOnly[0];
    return { url: best.url, ext: best.ext, bitrate: Math.round(best.abr || best.tbr || 0) };
  }

  const muxed = formats
    .filter((f) => f.acodec !== "none" && f.vcodec !== "none" && f.url)
    .sort((a, b) => (b.tbr || b.abr || 0) - (a.tbr || a.abr || 0));

  if (muxed.length > 0) {
    const best = muxed[0];
    return { url: best.url, ext: best.ext, bitrate: Math.round(best.tbr || best.abr || 0) };
  }

  if (formats.length > 0 && formats[0].url) {
    return { url: formats[0].url, ext: formats[0].ext, bitrate: 0 };
  }

  throw new Error("No playable URL found");
}

export async function getTrackInfo(trackId: string): Promise<TrackInfo> {
  if (!isTauri()) throw new Error("Tauri API not available");

  const url = `https://music.youtube.com/watch?v=${trackId}`;

  let cmd: any;
  try {
    const { Command } = await import("@tauri-apps/plugin-shell");
    cmd = Command.create("yt-dlp", ["--dump-json", "--no-download", url]);
  } catch {
    throw new Error("Shell plugin not available");
  }

  const output = await cmd.execute();
  console.log(`[yt-dlp] exit code ${output.code}, stderr:`, output.stderr?.slice(0, 500));
  if (output.code !== 0) {
    throw new Error(`yt-dlp exited with code ${output.code}: ${output.stderr}`);
  }

  const info: YtDlpInfo = JSON.parse(output.stdout);
  console.log(`[yt-dlp] parsed info: title="${info.title}", formats=${info.formats?.length || 0}`);

  const best = info.formats?.length
    ? pickBestFormat(info.formats)
    : { url: info.url || "", ext: info.ext || "unknown", bitrate: 0 };

  console.log(`[yt-dlp] selected format: ext=${best.ext}, bitrate=${best.bitrate}, url=${best.url?.slice(0, 60)}`);
  if (!best.url) throw new Error("No stream URL found");

  return {
    id: trackId,
    title: info.title || "Unknown",
    artist: info.artist || info.uploader || "Unknown",
    duration: info.duration || 0,
    url: best.url,
    thumbnail: info.thumbnail || "",
    webpageUrl: info.webpage_url || url,
    directUrl: best.url,
    formats: [{ url: best.url, ext: best.ext, format: "audio", bitrate: best.bitrate } as AudioFormat],
  };
}
