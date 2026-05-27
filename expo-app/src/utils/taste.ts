import { Paths, File } from "expo-file-system";

const FILE = new File(Paths.document, "taste.json");

interface TasteData {
  recentTracks: string[];
  likedTracks: string[];
  likedArtists: string[];
  updatedAt: number;
}

const defaults: TasteData = { recentTracks: [], likedTracks: [], likedArtists: [], updatedAt: Date.now() };

let cache: TasteData | null = null;

async function load(): Promise<TasteData> {
  if (cache) return cache;
  try {
    const raw = await FILE.text();
    cache = JSON.parse(raw) as TasteData;
    return cache;
  } catch {
    cache = { ...defaults };
    return cache;
  }
}

async function save(data: TasteData): Promise<void> {
  cache = data;
  cache.updatedAt = Date.now();
  if (!FILE.exists) FILE.create();
  FILE.write(JSON.stringify(cache));
}

export async function initTaste(): Promise<void> {
  await load();
}

export async function recordPlay(trackId: string): Promise<void> {
  const data = await load();
  data.recentTracks = [trackId, ...data.recentTracks.filter((id) => id !== trackId)].slice(0, 50);
  await save(data);
}

export async function recordLikedTrack(trackId: string, liked: boolean): Promise<void> {
  const data = await load();
  if (liked) {
    if (!data.likedTracks.includes(trackId)) data.likedTracks.push(trackId);
  } else {
    data.likedTracks = data.likedTracks.filter((id) => id !== trackId);
  }
  await save(data);
}

export async function recordLikedArtist(artistId: string, liked: boolean): Promise<void> {
  const data = await load();
  if (liked) {
    if (!data.likedArtists.includes(artistId)) data.likedArtists.push(artistId);
  } else {
    data.likedArtists = data.likedArtists.filter((id) => id !== artistId);
  }
  await save(data);
}

export async function getTasteProfile(): Promise<string> {
  const data = await load();
  const profile = { recentTracks: data.recentTracks, likedArtists: data.likedArtists };
  const safe = btoa(JSON.stringify(profile)).replace(/\+/g, "-").replace(/\//g, "_");
  return safe;
}
