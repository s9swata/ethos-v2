export interface TimedLyricLine {
  time: number;
  text: string;
}

const LRC_LINE = /\[(\d+):(\d+\.?\d*)\](.*)/;

export function parseLRC(lrc: string): TimedLyricLine[] {
  const lines: TimedLyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const match = raw.match(LRC_LINE);
    if (!match) continue;
    const time = parseInt(match[1], 10) * 60 + parseFloat(match[2]);
    const text = match[3].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function findActiveLineIndex(
  lines: TimedLyricLine[],
  currentTime: number
): number {
  if (!lines.length) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid].time <= currentTime) lo = mid;
    else hi = mid - 1;
  }
  return lines[lo].time <= currentTime ? lo : -1;
}
