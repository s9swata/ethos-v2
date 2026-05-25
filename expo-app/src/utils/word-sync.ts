export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export function computeWordTimings(lines: { time: number; text: string }[]): WordTiming[][] {
  return lines.map((line, i) => {
    const nextTime = lines[i + 1]?.time ?? line.time + 4;
    const lineDuration = nextTime - line.time;
    const words = line.text.split(/\s+/);
    if (words.length < 2) return [];
    const wordDuration = lineDuration / words.length;
    return words.map((word, j) => ({
      word,
      start: line.time + j * wordDuration,
      end: line.time + (j + 1) * wordDuration,
    }));
  });
}

export function findCurrentWordIndex(words: WordTiming[], currentTime: number): number {
  if (!words.length) return -1;
  let lo = 0;
  let hi = words.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (words[mid].start <= currentTime) lo = mid;
    else hi = mid - 1;
  }
  return words[lo].start <= currentTime ? lo : -1;
}
