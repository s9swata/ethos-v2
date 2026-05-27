import { requireNativeModule } from 'expo-modules-core'
import type { AudioStream, GetBestAudioStreamOptions } from './ExpoYoutubeAudioStream.types'

let NativeModule: any
try {
  NativeModule = requireNativeModule('ExpoYoutubeAudioStream')
} catch (e) {
  console.error('[expo-youtube-audio-stream] Failed to load native module:', e)
}

/** Health check — verifies the native module loaded and responds */
export function ping(): string {
  return NativeModule?.ping() ?? 'module-not-loaded'
}

/**
 * Extract all available audio streams for a YouTube video.
 * Returns streams with local proxy URLs that support range requests.
 */
export async function getAudioStreams(videoId: string): Promise<AudioStream[]> {
  const raw = await NativeModule.getAudioStreams(videoId)
  console.log(`[getAudioStreams] raw from native (${videoId}):`, JSON.stringify(raw))
  return raw
}

/**
 * Extract and select the best audio stream based on quality preferences.
 *
 * Selection strategy (in order):
 * 1. Match preferredMimeType if specified
 * 2. Filter out streams below minBitrate if specified
 * 3. Pick the highest bitrate stream among remaining
 */
export async function getBestAudioStream(
  videoId: string,
  options?: GetBestAudioStreamOptions,
): Promise<AudioStream | null> {
  const streams = await NativeModule.getAudioStreams(videoId)
  if (streams.length === 0) return null

  let candidates = streams

  if (options?.preferredMimeType) {
    const matching = streams.filter((s: AudioStream) => s.mimeType === options.preferredMimeType)
    if (matching.length > 0) candidates = matching
  }

  if (options?.minBitrate != null) {
    candidates = candidates.filter((s: AudioStream) => s.bitrate >= options.minBitrate!)
    if (candidates.length === 0) candidates = streams
  }

  return candidates.reduce((best: AudioStream, curr: AudioStream) =>
    curr.bitrate > best.bitrate ? curr : best,
  )
}

/**
 * Eagerly extract a stream URL and start buffering data.
 * Call before the user taps play so the first byte arrives instantly.
 */
export async function prefetchStream(videoId: string): Promise<void> {
  return NativeModule.prefetchStream(videoId)
}

/**
 * Eagerly extract multiple streams in batch (e.g. for playlist warmup).
 */
export async function prefetchStreams(videoIds: string[]): Promise<void> {
  return NativeModule.prefetchStreams(videoIds)
}

/**
 * Stop the local proxy server and release resources.
 * The proxy auto-starts on first getAudioStreams call.
 */
export async function stop(): Promise<void> {
  return NativeModule.stop()
}

export type { AudioStream, GetBestAudioStreamOptions } from './ExpoYoutubeAudioStream.types'
