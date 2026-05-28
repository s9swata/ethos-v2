export interface TimedLyricLine {
  time: number;
  text: string;
}

export function parseTimedLyrics(
  lyrics: { text: string; startTime: number }[],
): TimedLyricLine[] {
  return lyrics
    .filter((l) => l.text)
    .map((l) => ({ time: l.startTime / 1000, text: l.text }))
    .sort((a, b) => a.time - b.time);
}

export function findActiveLine(
  lines: TimedLyricLine[],
  currentTime: number,
): number {
  if (!lines.length) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid].time <= currentTime) lo = mid;
    else hi = mid - 1;
  }
  const result = lines[lo].time <= currentTime ? lo : -1;
  console.log("[Lyrics] findActiveLine time=%.2f result=%d firstTime=%.2f lastTime=%.2f",
    currentTime, result, lines[0].time, lines[lines.length - 1].time);
  return result;
}
