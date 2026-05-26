import ExpoModulesCore
import GCDWebServer

public class ExpoYoutubeAudioStreamModule: Module {
  private let proxyServer = YoutubeAudioProxyServer()
  private var initialized = false

  public func definition() -> ModuleDefinition {
    Name("ExpoYoutubeAudioStream")

    AsyncFunction("getAudioStreams") { (videoId: String) -> [[String: Any]] in
      ensureInitialized()
      return try await proxyServer.getStreams(videoId: videoId)
    }

    AsyncFunction("prefetchStream") { (videoId: String) in
      ensureInitialized()
      Task {
        try? await proxyServer.prefetch(videoId: videoId)
      }
    }

    AsyncFunction("prefetchStreams") { (videoIds: [String]) in
      ensureInitialized()
      Task {
        for id in videoIds {
          try? await proxyServer.prefetch(videoId: id)
        }
      }
    }

    AsyncFunction("stop") {
      proxyServer.stop()
      initialized = false
    }

    OnDestroy {
      proxyServer.stop()
    }
  }

  private func ensureInitialized() {
    if initialized { return }
    proxyServer.start()
    initialized = true
  }
}
