import ExpoModulesCore
import MediaPlayer

public class ExpoMusicControlsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoMusicControls")

    Events("onLikePressed")

    Function("setLikeState") { (videoId: String, isLiked: Bool) in
      let center = MPRemoteCommandCenter.shared()
      center.likeCommand.isActive = isLiked
      center.likeCommand.localizedTitle = isLiked ? "Unlike" : "Like"
    }

    Function("emitLikePressed") {
      sendEvent("onLikePressed", [:])
    }

    OnCreate {
      let center = MPRemoteCommandCenter.shared()
      center.likeCommand.isEnabled = true

      center.likeCommand.addTarget { _ in
        self.sendEvent("onLikePressed", [:])
        return .success
      }
    }
  }
}
