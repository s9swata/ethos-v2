package expo.youtube.audio.stream

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking

private const val TAG = "YT-AudioStream"

class ExpoYoutubeAudioStreamModule : Module() {
  private val proxyServer = YoutubeAudioProxyServer()
  private var initialized = false

  private fun ensureInitialized(): Boolean {
    if (initialized) return true
    try {
      val context = appContext.reactContext
      if (context == null) {
        Log.w(TAG, "ensureInitialized: reactContext is null")
        return false
      }
      org.schabi.newpipe.extractor.NewPipe.init(OkHttpDownloader())
      proxyServer.start(context)
      initialized = true
      Log.d(TAG, "Initialized OK on port ${proxyServer.getPort()}")
      return true
    } catch (e: Throwable) {
      Log.e(TAG, "Initialization failed", e)
      throw e
    }
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoYoutubeAudioStream")

    Function("ping") { "pong" }

    AsyncFunction("getAudioStreams") { videoId: String ->
      Log.d(TAG, "getAudioStreams($videoId)")
      try {
        val ok = ensureInitialized()
        if (!ok) return@AsyncFunction emptyList<Map<String, Any?>>()
        val result = runBlocking(Dispatchers.IO) {
          proxyServer.getStreams(videoId)
        }
        Log.d(TAG, "getAudioStreams -> ${result.size} streams")
        result
      } catch (e: Throwable) {
        Log.e(TAG, "getAudioStreams failed", e)
        throw e
      }
    }

    AsyncFunction("prefetchStream") { videoId: String ->
      Log.d(TAG, "prefetchStream($videoId)")
      try {
        val ok = ensureInitialized()
        if (!ok) return@AsyncFunction
        runBlocking(Dispatchers.IO) {
          proxyServer.prefetch(videoId)
        }
      } catch (e: Throwable) {
        Log.e(TAG, "prefetchStream failed", e)
        // Swallow — prefetch is best-effort
      }
    }

    AsyncFunction("prefetchStreams") { videoIds: List<String> ->
      Log.d(TAG, "prefetchStreams(${videoIds.size} ids)")
      try {
        val ok = ensureInitialized()
        if (!ok) return@AsyncFunction
        runBlocking(Dispatchers.IO) {
          videoIds.forEach { id -> proxyServer.prefetch(id) }
        }
      } catch (e: Throwable) {
        Log.e(TAG, "prefetchStreams failed", e)
      }
    }

    AsyncFunction("stop") {
      Log.d(TAG, "stop")
      proxyServer.stop()
      initialized = false
    }

    OnDestroy {
      proxyServer.stop()
    }
  }
}
