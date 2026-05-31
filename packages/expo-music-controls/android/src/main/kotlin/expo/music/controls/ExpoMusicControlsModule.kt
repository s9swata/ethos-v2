package expo.music.controls

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.session.MediaSessionManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.media.session.MediaControllerCompat
import androidx.media.session.MediaSessionCompat
import androidx.media.session.PlaybackStateCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "MusicControls"
private const val CUSTOM_ACTION_LIKE = "expo.music.controls.LIKE"
private const val LIKE_BROADCAST_ACTION = "expo.music.controls.LIKE_TAPPED"
private const val PLAYBACK_SERVICE_CLASS = "com.doublesymmetry.trackplayer.TrackPlayerPlaybackService"

class ExpoMusicControlsModule : Module() {
  private var receiverRegistered = false
  private var isUpdatingInternally = false
  private var currentLikedId: String? = null
  private var currentIsLiked = false
  private var controller: MediaControllerCompat? = null
  private var callbackRegistered = false

  private val likeReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (LIKE_BROADCAST_ACTION == intent.action) {
        Log.d(TAG, "Like broadcast received")
        sendEvent("onLikePressed", Bundle.EMPTY)
      }
    }
  }

  private val controllerCallback = object : MediaControllerCompat.Callback() {
    override fun onPlaybackStateChanged(state: PlaybackStateCompat?) {
      if (isUpdatingInternally) return
      if (currentLikedId != null) {
        applyCustomAction()
      }
    }
  }

  private fun getSessionCompat(): MediaSessionCompat? {
    val context = appContext.reactContext ?: return null
    val manager = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager ?: return null
    val componentName = ComponentName(context, PLAYBACK_SERVICE_CLASS)
    val tokens = manager.getActiveSessions(componentName)
    if (tokens.isEmpty()) {
      Log.w(TAG, "No active media sessions found")
      return null
    }
    return MediaSessionCompat.fromToken(context, tokens[0])
  }

  private fun connectController() {
    if (callbackRegistered) return
    val session = getSessionCompat() ?: return
    val context = appContext.reactContext ?: return
    try {
      controller = MediaControllerCompat(context, session.sessionCompatToken)
      controller?.registerCallback(controllerCallback)
      callbackRegistered = true
      Log.d(TAG, "MediaController callback registered")
    } catch (e: Throwable) {
      Log.e(TAG, "Failed to connect MediaController", e)
    }
  }

  private fun applyCustomAction() {
    try {
      val session = getSessionCompat() ?: return
      val iconRes = if (currentIsLiked) R.drawable.ic_heart_filled else R.drawable.ic_heart_unfilled
      val customAction = PlaybackStateCompat.CustomAction.Builder(
        CUSTOM_ACTION_LIKE,
        if (currentIsLiked) "Unlike" else "Like",
        iconRes
      ).build()
      val currentState = session.controller.playbackStateCompat
      @Suppress("DEPRECATION")
      val builder = PlaybackStateCompat.Builder(currentState)
      builder.addCustomAction(customAction)
      isUpdatingInternally = true
      session.setPlaybackState(builder.build())
      isUpdatingInternally = false
      Log.d(TAG, "Custom action applied (liked=$currentIsLiked)")
    } catch (e: Throwable) {
      isUpdatingInternally = false
      Log.e(TAG, "applyCustomAction failed", e)
    }
  }

  private fun registerReceiver() {
    if (receiverRegistered) return
    val context = appContext.reactContext ?: return
    val filter = IntentFilter(LIKE_BROADCAST_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(likeReceiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      context.registerReceiver(likeReceiver, filter)
    }
    receiverRegistered = true
    Log.d(TAG, "Like broadcast receiver registered")
  }

  private fun unregisterReceiver() {
    if (!receiverRegistered) return
    val context = appContext.reactContext ?: return
    context.unregisterReceiver(likeReceiver)
    receiverRegistered = false
    Log.d(TAG, "Like broadcast receiver unregistered")
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoMusicControls")

    Events("onLikePressed")

    Function("setLikeState") { videoId: String, isLiked: Boolean ->
      Log.d(TAG, "setLikeState($videoId, $isLiked)")
      currentLikedId = videoId
      currentIsLiked = isLiked
      connectController()
      applyCustomAction()
    }

    Function("emitLikePressed") {
      Log.d(TAG, "emitLikePressed")
      sendEvent("onLikePressed", Bundle.EMPTY)
    }

    OnStartObserving {
      Log.d(TAG, "OnStartObserving")
      registerReceiver()
      connectController()
    }

    OnStopObserving {
      Log.d(TAG, "OnStopObserving")
      unregisterReceiver()
    }

    OnDestroy {
      Log.d(TAG, "OnDestroy")
      unregisterReceiver()
      controller?.unregisterCallback(controllerCallback)
      controller = null
      callbackRegistered = false
    }
  }
}
