export interface LikePressedEvent {
  videoId?: string;
}

export interface MediaMetadata {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  duration: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  position: number;
  duration: number;
  isLiked: boolean;
}

export interface MediaControlEvent {
  videoId?: string;
}
