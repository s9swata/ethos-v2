import { XMLParser } from "fast-xml-parser";

export interface WordSpan {
  word: string;
  begin: number;
  end: number;
}

export interface AlignedLine {
  begin: number;
  end: number;
  words: WordSpan[];
  text: string;
}

function parseTTMLTime(t: string): number {
  const [m, s] = t.split(":");
  return parseInt(m, 10) * 60 + parseFloat(s);
}

export function parseTTML(xml: string): AlignedLine[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(xml);
  const paragraphs = doc.tt.body.div.p;
  const lines = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

  return lines.map((p: any) => {
    const spans = Array.isArray(p.span) ? p.span : [p.span];
    const words: WordSpan[] = spans.map((s: any) => ({
      word: s["#text"],
      begin: parseTTMLTime(s["@_begin"]),
      end: parseTTMLTime(s["@_end"]),
    }));
    return {
      begin: parseTTMLTime(p["@_begin"]),
      end: parseTTMLTime(p["@_end"]),
      words,
      text: words.map((w) => w.word).join(" "),
    };
  });
}

const CACHE_PREFIX = "ttml:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  lines: AlignedLine[];
  cachedAt: number;
}

export function getCachedTTML(trackId: string): AlignedLine[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${trackId}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(`${CACHE_PREFIX}${trackId}`);
      return null;
    }
    return entry.lines;
  } catch {
    return null;
  }
}

export function setCachedTTML(trackId: string, lines: AlignedLine[]): void {
  try {
    const entry: CacheEntry = { lines, cachedAt: Date.now() };
    localStorage.setItem(`${CACHE_PREFIX}${trackId}`, JSON.stringify(entry));
  } catch {
    // storage full — ignore
  }
}
