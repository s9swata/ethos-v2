import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { getTasteProfile } from "@/utils/taste";

export const queryKeys = {
  home: (profile: string) => ["home", profile] as const,
  artist: (browseId: string) => ["artist", browseId] as const,
  album: (browseId: string) => ["album", browseId] as const,
  playlist: (id: string) => ["playlist", id] as const,
  track: (id: string) => ["track", id] as const,
};

export function useHomeFeedQuery() {
  return useQuery({
    queryKey: queryKeys.home("default"),
    queryFn: async () => {
      const profile = await getTasteProfile();
      return api.getHomeFeed(profile || undefined);
    },
    staleTime: 1000 * 60 * 60 * 6,
    gcTime: 1000 * 60 * 60 * 6,
  });
}

export function useArtistQuery(browseId: string | null) {
  return useQuery({
    queryKey: queryKeys.artist(browseId ?? ""),
    queryFn: () => api.getArtist(browseId!),
    enabled: !!browseId,
  });
}

export function useAlbumQuery(browseId: string | null) {
  return useQuery({
    queryKey: queryKeys.album(browseId ?? ""),
    queryFn: () => api.getAlbum(browseId!),
    enabled: !!browseId,
  });
}

export function useTrackQuery(trackId: string | null) {
  return useQuery({
    queryKey: queryKeys.track(trackId ?? ""),
    queryFn: () => api.getTrack(trackId!),
    enabled: !!trackId,
    staleTime: 1000 * 60 * 60 * 2,
    gcTime: 1000 * 60 * 60 * 2,
  });
}

export function usePlaylistQuery(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.playlist(id ?? ""),
    queryFn: () => api.getPlaylist(`https://music.youtube.com/playlist?list=${id}`),
    enabled: enabled && !!id,
  });
}
