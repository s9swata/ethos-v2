import { resolve } from "node:path";

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

export const config = {
  port: envInt("PORT", 3000),
  host: env("HOST", "0.0.0.0"),
  nodeEnv: env("NODE_ENV", "development"),

  ytDlpPath: env("YT_DLP_PATH", "yt-dlp"),

  cacheDir: resolve(env("CACHE_DIR", "./cache")),
  cacheTtl: {
    search: envInt("CACHE_TTL_SEARCH", 300) * 1000,
    metadata: envInt("CACHE_TTL_METADATA", 3600) * 1000,
    stream: envInt("CACHE_TTL_STREAM", 600) * 1000,
  },

  rateLimit: {
    max: envInt("RATE_LIMIT_MAX", 60),
    timeWindow: envInt("RATE_LIMIT_WINDOW_MS", 60000),
  },

  ytDlpTimeout: envInt("YT_DLP_TIMEOUT_MS", 30000),
  ytDlpMaxConcurrent: envInt("YT_DLP_MAX_CONCURRENT", 3),
  queueTimeout: envInt("QUEUE_TIMEOUT_MS", 15000),

  maxQueryLength: envInt("MAX_QUERY_LENGTH", 200),

  ytDlpCookiesFile: env("YT_DLP_COOKIES_FILE", ""),

  // Ordered list of YouTube clients to rotate through on rate-limit
  ytDlpClients: env("YT_DLP_CLIENTS", "android,ios,tv,web"),
};
