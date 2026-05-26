export interface AudioStream {
  /** Local proxy URL: http://localhost:{port}/stream/{videoId} */
  url: string
  /** MIME type, e.g. "audio/mp4" */
  mimeType: string
  /** Bitrate in bits per second */
  bitrate: number
  /** Audio codec, e.g. "mp4a.40.2" */
  codec: string
  /** Content length in bytes */
  contentLength: number
  /** Container format, e.g. "m4a", "webm", "3gpp" */
  container: string
  /** Whether this is an HLS stream (m3u8) */
  isHLS: boolean
}

export interface GetBestAudioStreamOptions {
  /** Preferred MIME type, e.g. "audio/mp4". Falls back to best available if not found. */
  preferredMimeType?: string
  /** Minimum bitrate in bits per second */
  minBitrate?: number
}
