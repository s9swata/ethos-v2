export function parseDuration(durationStr: string | null | undefined): number {
  if (!durationStr || typeof durationStr !== "string") return 0;

  const trimmed = durationStr.trim();
  if (!trimmed) return 0;

  const parts = trimmed.split(":").map((p) => parseInt(p.trim(), 10));

  if (parts.length === 1) {
    return isNaN(parts[0]) ? 0 : parts[0];
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (isNaN(minutes) ? 0 : minutes) * 60 + (isNaN(seconds) ? 0 : seconds);
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (
      (isNaN(hours) ? 0 : hours) * 3600 +
      (isNaN(minutes) ? 0 : minutes) * 60 +
      (isNaN(seconds) ? 0 : seconds)
    );
  }

  return 0;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
