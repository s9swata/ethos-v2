import { EventEmitter, requireNativeModule, type EventSubscription } from 'expo-modules-core'
import type { LikePressedEvent } from './ExpoMusicControls.types'

let NativeModule: any
try {
  NativeModule = requireNativeModule('ExpoMusicControls')
} catch (e) {
  console.error('[expo-music-controls] Failed to load native module:', e)
}

const emitter = new EventEmitter(NativeModule) as unknown as {
  addListener(event: string, callback: (...args: any[]) => void): EventSubscription;
}

export function setLikeState(videoId: string, isLiked: boolean): void {
  NativeModule?.setLikeState(videoId, isLiked)
}

export function emitLikePressed(): void {
  NativeModule?.emitLikePressed()
}

export function addLikeListener(callback: (event: LikePressedEvent) => void): EventSubscription {
  return emitter.addListener('onLikePressed', callback)
}

export type { LikePressedEvent }
