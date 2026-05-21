import { spawn } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { Pool } from "./pool.js";

const pool = new Pool(config.ytDlpMaxConcurrent);

const ytDlpCookiesArgs: string[] = config.ytDlpCookiesFile
  ? ["--cookies", config.ytDlpCookiesFile]
  : [];

export interface TrackResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
  thumbnail: string;
  webpageUrl: string;
}

export interface TrackInfo extends TrackResult {
  formats: Array<{ url: string; ext: string; format: string; bitrate?: number }>;
  directUrl: string;
}

class YtDlpError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly stderr: string,
  ) {
    super(message);
    this.name = "YtDlpError";
  }
}

class YtDlpTimeoutError extends Error {
  constructor() {
    super(`yt-dlp timed out after ${config.ytDlpTimeout}ms`);
    this.name = "YtDlpTimeoutError";
  }
}

// Ordered list of YouTube clients to try in rotation on rate-limit
const YT_CLIENTS = config.ytDlpClients.split(",").map((c) => c.trim()).filter(Boolean);

/**
 * Low-level yt-dlp subprocess call. Does NOT include client rotation.
 * Pass optional extraArgs for client-specific flags.
 */
function execYtDlp(args: string[], extraArgs?: string[]): Promise<string> {
  const fullArgs = [...ytDlpCookiesArgs, ...(extraArgs ?? []), ...args];
  logger.debug({ args: fullArgs }, "yt-dlp exec");
  return pool.run(async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), config.ytDlpTimeout);

    return new Promise<string>((resolve, reject) => {
      const proc = spawn(config.ytDlpPath, fullArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        signal: ac.signal,
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(stdout.trim());
        else reject(new YtDlpError(
          `yt-dlp exited ${code}`,
          code,
          stderr.trim().slice(0, 1000),
        ));
      });
      proc.on("error", (err: Error) => {
        clearTimeout(timer);
        if ((err as NodeJS.ErrnoException).code === "ABORT_ERR") {
          reject(new YtDlpTimeoutError());
        } else {
          reject(err);
        }
      });
    });
  });
}

/**
 * Wraps execYtDlp with client rotation.
 * Tries each configured YouTube client (android → ios → tv → web).
 * If yt-dlp exits with code 1 and stderr hints at rate-limiting (429 / bot check),
 * it falls through to the next client.
 *
 * @param useDesktopClient - when true, adds player_skip flags (HLS manifest mode
 * for desktop/web clients that handle m3u8 natively)
 */
async function execYtDlpWithRotation(
  args: string[],
  useDesktopClient = false,
): Promise<string> {
  for (const client of YT_CLIENTS) {
    const extraArgs: string[] = [
      "--extractor-args", `youtube:player_client=${client}`,
    ];

    // For desktop clients, skip webpage/configs extraction to reduce YouTube
    // fingerprinting and return an HLS manifest instead of progressive MP4.
    // The m3u8 works natively in <audio> on desktop browsers and mobile.
    if (useDesktopClient) {
      extraArgs.push(
        "--extractor-args", "youtube:player_skip=webpage,configs",
      );
    }

    try {
      return await execYtDlp(args, extraArgs);
    } catch (err) {
      const isRateLimited = err instanceof YtDlpError && (
        err.stderr.includes("HTTP Error 429") ||
        err.stderr.includes("Sign in to confirm") ||
        err.stderr.includes("bot")
      );

      if (isRateLimited && client !== YT_CLIENTS[YT_CLIENTS.length - 1]) {
        logger.warn({ client, next: YT_CLIENTS[YT_CLIENTS.indexOf(client) + 1] },
          "YouTube rate-limited, rotating client");
        continue;
      }

      // If all clients exhausted or non-rate-limit error, surface it
      if (isRateLimited) {
        logger.error("All YouTube clients exhausted — all are rate-limited");
      }

      // Don't expose internal extractor-args in the error message
      const cleanErr = err instanceof YtDlpError
        ? new YtDlpError(err.message, err.exitCode, "(suppressed)")
        : err;
      throw cleanErr;
    }
  }

  throw new YtDlpError("All YouTube clients exhausted", null, "");
}

function parseSearchLine(raw: string): TrackResult {
  const j = JSON.parse(raw);
  return {
    id: j.id,
    title: j.title ?? "Unknown",
    artist: j.uploader ?? j.channel ?? "Unknown",
    duration: j.duration ?? 0,
    url: j.url ?? j.webpage_url,
    thumbnail: j.thumbnail ?? "",
    webpageUrl: j.webpage_url ?? j.url,
  };
}

export async function search(query: string, limit = 10): Promise<TrackResult[]> {
  const out = await execYtDlp([
    `ytsearch${limit}:${query}`,
    "--dump-json",
    "--no-playlist",
    "--flat-playlist",
  ]);
  return out.split("\n").filter(Boolean).map(parseSearchLine);
}

export async function getInfo(urlOrId: string): Promise<TrackInfo> {
  const raw = await execYtDlpWithRotation([urlOrId, "--dump-json", "--no-playlist"]);
  const j = JSON.parse(raw);
  const best = j.formats?.findLast(
    (f: { url?: string; format?: string }) => f.url && f.format?.includes("audio only"),
  ) ?? j.formats?.[j.formats.length - 1] ?? {};

  return {
    id: j.id,
    title: j.title ?? "Unknown",
    artist: j.uploader ?? j.channel ?? "Unknown",
    duration: j.duration ?? 0,
    url: best.url ?? j.url ?? "",
    thumbnail: j.thumbnail ?? "",
    webpageUrl: j.webpage_url ?? j.url,
    formats: (j.formats ?? []).map(
      (f: { url: string; ext: string; format: string; tbr?: number }) => ({
        url: f.url,
        ext: f.ext,
        format: f.format,
        bitrate: f.tbr,
      }),
    ),
    directUrl: best.url ?? j.url ?? "",
  };
}

/** Returns a direct progressive audio URL (mobile-friendly, simple redirect). */
export async function getStreamUrl(urlOrId: string): Promise<string> {
  return execYtDlpWithRotation(["-g", "-f", "bestaudio/best", urlOrId]);
}

/**
 * Returns an HLS manifest URL for desktop clients.
 * Uses player_skip=webpage,configs which reduces YouTube fingerprinting and
 * returns a .m3u8 playlist. Compatible with HTML5 <audio> and most web players.
 */
export async function getDesktopStreamUrl(urlOrId: string): Promise<string> {
  return execYtDlpWithRotation(
    ["-g", "-f", "bestaudio/best", urlOrId],
    true,
  );
}

async function ensureCacheDir(): Promise<void> {
  try {
    await access(config.cacheDir);
  } catch {
    await mkdir(config.cacheDir, { recursive: true });
  }
}

export async function downloadAudio(urlOrId: string): Promise<string> {
  await ensureCacheDir();
  const info = await getInfo(urlOrId);
  const ext = "mp3";
  const dest = join(config.cacheDir, `${info.id}.${ext}`);
  try {
    await access(dest);
    logger.info({ id: info.id }, "Cache hit for audio");
    return dest;
  } catch { /* miss */ }
  logger.info({ id: info.id }, "Downloading audio");
  await execYtDlp([
    urlOrId, "-x", "--audio-format", ext,
    "-o", join(config.cacheDir, "%(id)s.%(ext)s"),
    "--no-playlist", "--quiet",
  ]);
  return dest;
}
