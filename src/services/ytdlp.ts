import { spawn } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { Pool } from "./pool.js";

const pool = new Pool(config.ytDlpMaxConcurrent);

const ytDlpBaseArgs: string[] = [
  ...(config.ytDlpExtractorArgs
    ? ["--extractor-args", config.ytDlpExtractorArgs]
    : []),
  ...(config.ytDlpCookiesFile
    ? ["--cookies", config.ytDlpCookiesFile]
    : []),
];

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
  constructor(args: string[]) {
    super(`yt-dlp timed out after ${config.ytDlpTimeout}ms`);
    this.name = "YtDlpTimeoutError";
  }
}

class QueueTimeoutError extends Error {
  constructor() {
    super("Request queued too long, try again later");
    this.name = "QueueTimeoutError";
  }
}

function execYtDlp(args: string[]): Promise<string> {
  const fullArgs = [...ytDlpBaseArgs, ...args];
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
          reject(new YtDlpTimeoutError(args));
        } else {
          reject(err);
        }
      });
    });
  });
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
  const raw = await execYtDlp([urlOrId, "--dump-json", "--no-playlist"]);
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

export async function getStreamUrl(urlOrId: string): Promise<string> {
  return execYtDlp(["-g", "-f", "bestaudio/best", urlOrId]);
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
