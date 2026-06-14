import { EventEmitter, requireNativeModule, type EventSubscription } from 'expo-modules-core'
import type { LikePressedEvent, MediaMetadata, PlaybackState } from './ExpoMusicControls.types'

let NativeModule: any
try {
  NativeModule = requireNativeModule('ExpoMusicControls')
} catch (e) {
  console.error('[expo-music-controls] Failed to load native module:', e)
}

const emitter = NativeModule ? new EventEmitter(NativeModule) as unknown as {
  addListener(event: string, callback: (...args: any[]) => void): EventSubscription;
} : null

export function setLikeState(videoId: string, isLiked: boolean): void {
  NativeModule?.setLikeState(videoId, isLiked)
}

export function emitLikePressed(): void {
  NativeModule?.emitLikePressed()
}

export function addLikeListener(callback: (event: LikePressedEvent) => void): EventSubscription {
  if (!emitter) return { remove() {} }
  return emitter.addListener('onLikePressed', callback)
}

export function setMetadata(metadata: MediaMetadata): void {
  NativeModule?.setMetadata(
    metadata.title,
    metadata.artist,
    metadata.album ?? null,
    metadata.artworkUrl ?? null,
    metadata.duration
  )
}

export function setPlayback(isPlaying: boolean, position: number, duration: number, isLiked: boolean): void {
  NativeModule?.setPlayback(isPlaying, position, duration, isLiked)
}

export function setProgress(position: number, duration: number): void {
  NativeModule?.setProgress(position, duration)
}

export function enableControls(): void {
  NativeModule?.enableControls()
}

export function disableControls(): void {
  NativeModule?.disableControls()
}

export function addEventListener(event: string, callback: (...args: any[]) => void): EventSubscription {
  if (!emitter) return { remove() {} }
  return emitter.addListener(event, callback)
}

export type { LikePressedEvent, MediaMetadata, PlaybackState }
