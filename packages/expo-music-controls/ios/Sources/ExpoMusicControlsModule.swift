import ExpoModulesCore
import MediaPlayer
import AVFoundation

public class ExpoMusicControlsModule: Module {
  private var nowPlayingInfo = [String: Any]()
  private var timeObserver: Any?
  private var isControlsEnabled = false
  private var pendingArtworkUrl: String?

  public func definition() -> ModuleDefinition {
    Name("ExpoMusicControls")

    Events("onLikePressed", "onPlay", "onPause", "onNext", "onPrevious", "onSeek")

    // --- Like button ---

    Function("setLikeState") { (videoId: String, isLiked: Bool) in
      let center = MPRemoteCommandCenter.shared()
      center.likeCommand.isActive = isLiked
      center.likeCommand.localizedTitle = isLiked ? "Unlike" : "Like"
      self.nowPlayingInfo["isLiked"] = isLiked
    }

    Function("emitLikePressed") {
      sendEvent("onLikePressed", [:])
    }

    // --- Metadata ---

    Function("setMetadata") { (title: String, artist: String, album: String?, artworkUrl: String?, duration: Double) in
      self.nowPlayingInfo[MPMediaItemPropertyTitle] = title
      self.nowPlayingInfo[MPMediaItemPropertyArtist] = artist
      self.nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = album
      self.nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration
      self.nowPlayingInfo[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue
      self.nowPlayingInfo[MPNowPlayingInfoPropertyDefaultPlaybackRate] = 1.0

      if artworkUrl != self.pendingArtworkUrl {
        self.pendingArtworkUrl = artworkUrl
        if let urlString = artworkUrl, let url = URL(string: urlString) {
          self.fetchArtwork(from: url) { artwork in
            if let artwork = artwork {
              self.nowPlayingInfo[MPMediaItemPropertyArtwork] = artwork
            }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = self.nowPlayingInfo
          }
        } else {
          self.nowPlayingInfo.removeValue(forKey: MPMediaItemPropertyArtwork)
          MPNowPlayingInfoCenter.default().nowPlayingInfo = self.nowPlayingInfo
        }
      } else {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = self.nowPlayingInfo
      }
    }

    // --- Playback state ---

    Function("setPlayback") { (isPlaying: Bool, position: Double, duration: Double, isLiked: Bool) in
      self.nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = position
      self.nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration
      self.nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
      self.nowPlayingInfo["isLiked"] = isLiked
      MPNowPlayingInfoCenter.default().nowPlayingInfo = self.nowPlayingInfo

      let center = MPRemoteCommandCenter.shared()
      center.likeCommand.isActive = isLiked
    }

    // --- Progress ---

    Function("setProgress") { (position: Double, duration: Double) in
      self.nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = position
      self.nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration
      MPNowPlayingInfoCenter.default().nowPlayingInfo = self.nowPlayingInfo
    }

    // --- Enable/disable controls ---

    Function("enableControls") {
      if self.isControlsEnabled { return }
      self.isControlsEnabled = true
      self.setupRemoteCommands()
    }

    Function("disableControls") {
      self.isControlsEnabled = false
      self.teardownRemoteCommands()
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    OnCreate {
      setupRemoteCommands()
    }

    OnDestroy {
      teardownRemoteCommands()
      if let observer = timeObserver {
        NotificationCenter.default.removeObserver(observer)
      }
    }
  }

  // MARK: - Remote Commands

  private func setupRemoteCommands() {
    let center = MPRemoteCommandCenter.shared()

    center.playCommand.isEnabled = true
    center.pauseCommand.isEnabled = true
    center.nextTrackCommand.isEnabled = true
    center.previousTrackCommand.isEnabled = true
    center.changePlaybackPositionCommand.isEnabled = true
    center.likeCommand.isEnabled = true

    center.playCommand.addTarget { [weak self] _ in
      self?.sendEvent("onPlay", [:])
      return .success
    }

    center.pauseCommand.addTarget { [weak self] _ in
      self?.sendEvent("onPause", [:])
      return .success
    }

    center.nextTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent("onNext", [:])
      return .success
    }

    center.previousTrackCommand.addTarget { [weak self] _ in
      self?.sendEvent("onPrevious", [:])
      return .success
    }

    center.changePlaybackPositionCommand.addTarget { [weak self] event in
      guard let seekEvent = event as? MPChangePlaybackPositionCommandEvent else {
        return .commandFailed
      }
      self?.sendEvent("onSeek", ["position": seekEvent.positionTime])
      return .success
    }

    center.likeCommand.addTarget { [weak self] _ in
      self?.sendEvent("onLikePressed", [:])
      return .success
    }
  }

  private func teardownRemoteCommands() {
    let center = MPRemoteCommandCenter.shared()
    center.playCommand.removeTarget(nil)
    center.pauseCommand.removeTarget(nil)
    center.nextTrackCommand.removeTarget(nil)
    center.previousTrackCommand.removeTarget(nil)
    center.changePlaybackPositionCommand.removeTarget(nil)
    center.likeCommand.removeTarget(nil)
    center.playCommand.isEnabled = false
    center.pauseCommand.isEnabled = false
    center.nextTrackCommand.isEnabled = false
    center.previousTrackCommand.isEnabled = false
    center.changePlaybackPositionCommand.isEnabled = false
    center.likeCommand.isEnabled = false
  }

  // MARK: - Artwork

  private func fetchArtwork(from url: URL, completion: @escaping (MPMediaItemArtwork?) -> Void) {
    URLSession.shared.dataTask(with: url) { data, _, error in
      guard let data = data, error == nil, let image = UIImage(data: data) else {
        DispatchQueue.main.async { completion(nil) }
        return
      }
      let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
      DispatchQueue.main.async { completion(artwork) }
    }.resume()
  }
}
