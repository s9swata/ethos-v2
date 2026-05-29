import Constants from "expo-constants";

export interface LRCLIBResponse {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  duration: number;
}

function normalizeQuery(s: string): string {
  return s.replace(/\(official\s+(video|audio|lyrics?|music\s*video)\)/gi, "")
    .replace(/\(.*?version\)/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function requestLRCLIB(
  artist: string,
  title: string,
  duration: number,
  timeoutMs = 8000
): Promise<LRCLIBResponse | null> {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), timeoutMs);
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
    duration: String(Math.round(duration)),
  });
  try {
    let res = await fetch(`https://lrclib.net/api/get?${params}`, { signal: ac.signal });
    if (res.ok) return res.json();

    const query = `${normalizeQuery(artist)} ${normalizeQuery(title)}`;
    const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, { signal: ac.signal });
    if (!searchRes.ok) return null;

    const results = await searchRes.json() as any[];
    if (!Array.isArray(results) || results.length === 0) return null;

    const roundedDuration = Math.round(duration);
    const exact = results.find((r) => Math.round(r.duration) === roundedDuration);
    if (exact) return exact;

    const similar = results.filter((r) => Math.abs(Math.round(r.duration) - roundedDuration) <= 3);
    if (similar.length > 0) return similar.reduce((a, b) =>
      Math.abs(Math.round(a.duration) - roundedDuration) < Math.abs(Math.round(b.duration) - roundedDuration) ? a : b
    );

    return results[0];
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const TTML_RETRIES = 3;

function getTTMLBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_TTML_URL;
  if (!url) throw new Error("TTML URL not configured. Set EXPO_PUBLIC_TTML_URL in .env.local");
  return url;
}

function getDeviceId(): string {
  return Constants.installationId || Constants.sessionId || "unknown";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchTTML(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TTML fetch failed: ${res.status}`);
  return res.text();
}

async function pollStatus(baseUrl: string, jobId: string): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    const res = await fetch(`${baseUrl}/status/${jobId}`);
    if (!res.ok) throw new Error(`Status poll failed: ${res.status}`);
    const data = await res.json();
    if (data.status === "done") return fetchTTML(`${baseUrl}/${data.ttmlUrl}`);
    if (data.status === "error") throw new Error(data.error || "Alignment failed");
    await delay(2000);
  }
  throw new Error("Alignment timed out");
}

export async function downloadAudioSegment(
  url: string,
  maxBytes = 1_048_576,
): Promise<Blob> {
  console.log(`[ttml] Downloading audio segment (${maxBytes} bytes max)...`);
  const res = await fetch(url, {
    headers: { Range: `bytes=0-${maxBytes - 1}` },
  });
  if (!res.ok) {
    console.warn(`[ttml] Audio download FAILED: HTTP ${res.status}`);
    throw new Error(`Audio download failed: ${res.status}`);
  }
  const blob = await res.blob();
  console.log(`[ttml] Audio download OK: ${(blob.size / 1024).toFixed(1)} KB`);
  return blob;
}

export async function alignTrack(
  trackId: string,
  lyrics: string,
  audioBlob: Blob,
  language = "en",
): Promise<string> {
  const baseUrl = getTTMLBaseUrl();
  const deviceId = getDeviceId();

  const form = new FormData();
  form.append("trackId", trackId);
  form.append("lyrics", lyrics);
  form.append("audio", audioBlob, "audio.mp4");
  form.append("language", language);

  console.log(`[ttml] POST /align for ${trackId} (audio: ${(audioBlob.size / 1024).toFixed(1)} KB)`);

  for (let attempt = 0; attempt < TTML_RETRIES; attempt++) {
    const res = await fetch(`${baseUrl}/align`, {
      method: "POST",
      headers: { "X-Device-ID": deviceId },
      body: form,
    });

    if (res.status === 200) {
      const data = await res.json();
      console.log(`[ttml] Align response 200:`, JSON.stringify(data));
      return fetchTTML(`${baseUrl}/${data.ttmlUrl}`);
    }

    if (res.status === 202) {
      console.log(`[ttml] Align response 202 (queued), polling...`);
      const data = await res.json();
      return pollStatus(baseUrl, data.jobId);
    }

    if (res.status === 429) {
      console.warn(`[ttml] Rate limited (attempt ${attempt + 1}), retrying...`);
      if (attempt < TTML_RETRIES - 1) {
        await delay(1000 * Math.pow(2, attempt));
        continue;
      }
      throw new Error("Rate limit exceeded");
    }

    if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      console.warn(`[ttml] Align rejected 400:`, data);
      throw new Error(data.error || "Invalid alignment request");
    }

    console.warn(`[ttml] Unexpected status ${res.status}`);
    throw new Error(`Unexpected alignment response: ${res.status}`);
  }

  throw new Error("Failed to align track");
}
