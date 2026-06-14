package expo.music.controls

import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.Rating
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.*
import java.net.URL

class ExpoMusicControlsModule : Module {
  private var mediaSession: MediaSessionCompat? = null
  private var serviceConnection: ServiceConnection? = null
  private var isForeground = false

  private var currentTitle: String = ""
  private var currentArtist: String = ""
  private var currentAlbum: String? = null
  private var currentArtworkUrl: String? = null
  private var currentDuration: Long = 0
  private var currentPosition: Long = 0
  private var isCurrentlyPlaying: Boolean = false
  private var isCurrentlyLiked: Boolean = false
  private var cachedArtwork: Bitmap? = null

  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  override fun definition() = ModuleDefinition {
    Name("ExpoMusicControls")

    Events("onLikePressed", "onPlay", "onPause", "onNext", "onPrevious", "onSeek")

    OnCreate {
      createMediaSession()
    }

    OnDestroy {
      scope.cancel()
      disconnectService()
      mediaSession?.release()
    }

    Function("setLikeState") { (videoId: String, isLiked: Boolean) ->
      isCurrentlyLiked = isLiked
      updatePlaybackState()
    }

    Function("emitLikePressed") {
      sendEvent("onLikePressed", emptyMap<String, Any>())
    }

    Function("setMetadata") { (title: String, artist: String, album: String?, artworkUrl: String?, duration: Double) ->
      currentTitle = title
      currentArtist = artist
      currentAlbum = album
      currentDuration = (duration * 1000).toLong()

      if (artworkUrl != currentArtworkUrl) {
        currentArtworkUrl = artworkUrl
        cachedArtwork = null
        if (artworkUrl != null) {
          scope.launch { fetchArtwork(artworkUrl) }
        }
      }

      updateMediaMetadata()
      updatePlaybackState()
      updateNotification()
    }

    Function("setPlayback") { (isPlaying: Boolean, position: Double, duration: Double, isLiked: Boolean) ->
      isCurrentlyPlaying = isPlaying
      currentPosition = (position * 1000).toLong()
      currentDuration = (duration * 1000).toLong()
      isCurrentlyLiked = isLiked

      if (isPlaying) {
        mediaSession?.isActive = true
      }

      updateMediaMetadata()
      updatePlaybackState()
      updateNotification()
    }

    Function("setProgress") { (position: Double, duration: Double) ->
      currentPosition = (position * 1000).toLong()
      currentDuration = (duration * 1000).toLong()
      updatePlaybackState()
    }

    Function("enableControls") {
      connectService()
    }

    Function("disableControls") {
      disconnectService()
      mediaSession?.isActive = false
    }
  }

  // -- Media Session --

  private fun createMediaSession() {
    val context = appContext?.reactContext ?: return
    val intent = context.packageManager?.getLaunchIntentForPackage(context.packageName)
    val pendingIntent = PendingIntent.getActivity(
      context, 0, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    mediaSession = MediaSessionCompat(context, "ExpoMusicControls", null, pendingIntent).also { session ->
      session.setCallback(MediaSessionCallback())
      session.isActive = true
    }
  }

  private fun updateMediaMetadata() {
    val metadata = MediaMetadataCompat.Builder()
      .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
      .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
      .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
      .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDuration)

    cachedArtwork?.let { bitmap ->
      metadata.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, bitmap)
    }

    mediaSession?.setMetadata(metadata.build())
  }

  private fun updatePlaybackState() {
    val state = if (isCurrentlyPlaying) {
      PlaybackStateCompat.STATE_PLAYING
    } else {
      PlaybackStateCompat.STATE_PAUSED
    }

    val actions = PlaybackStateCompat.ACTION_PLAY or
      PlaybackStateCompat.ACTION_PAUSE or
      PlaybackStateCompat.ACTION_PLAY_PAUSE or
      PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
      PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
      PlaybackStateCompat.ACTION_SEEK_TO or
      PlaybackStateCompat.ACTION_SET_RATING

    val playbackState = PlaybackStateCompat.Builder()
      .setState(state, currentPosition, if (isCurrentlyPlaying) 1.0f else 0.0f)
      .setActions(actions)
      .setRating(Rating.newHeartRating(isCurrentlyLiked))
      .build()

    mediaSession?.setPlaybackState(playbackState)
  }

  // -- Foreground Service --

  private fun connectService() {
    if (isForeground) return
    val context = appContext?.reactContext ?: return

    val intent = Intent(context, ExpoMusicNotificationService::class.java)
    context.startForegroundService(intent)

    serviceConnection = object : ServiceConnection {
      override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
        isForeground = true
        val binder = service as ExpoMusicNotificationService.LocalBinder
        binder.getService().setMediaSession(mediaSession)
      }

      override fun onServiceDisconnected(name: ComponentName?) {
        isForeground = false
      }
    }

    context.bindService(intent, serviceConnection!!, Context.BIND_AUTO_CREATE)
  }

  private fun disconnectService() {
    if (!isForeground) return
    val context = appContext?.reactContext ?: return
    serviceConnection?.let { context.unbindService(it) }
    serviceConnection = null
    context.stopService(Intent(context, ExpoMusicNotificationService::class.java))
    isForeground = false
  }

  private fun updateNotification() {
    if (!isForeground) return
    val context = appContext?.reactContext ?: return
    val intent = Intent(context, ExpoMusicNotificationService::class.java).apply {
      putExtra("title", currentTitle)
      putExtra("artist", currentArtist)
      putExtra("isPlaying", isCurrentlyPlaying)
    }
    context.startService(intent)
  }

  // -- Artwork --

  private suspend fun fetchArtwork(urlString: String) {
    try {
      val url = URL(urlString)
      val bitmap = withContext(Dispatchers.IO) {
        BitmapFactory.decodeStream(url.openConnection().getInputStream())
      }
      cachedArtwork = bitmap
      updateMediaMetadata()
      updateNotification()
    } catch (e: Exception) {
      android.util.Log.w(TAG, "Failed to fetch artwork: ${e.message}")
    }
  }

  // -- MediaSession callback --

  private inner class MediaSessionCallback : MediaSessionCompat.Callback() {
    override fun onPlay() {
      sendEvent("onPlay", emptyMap())
    }

    override fun onPause() {
      sendEvent("onPause", emptyMap())
    }

    override fun onSkipToNext() {
      sendEvent("onNext", emptyMap())
    }

    override fun onSkipToPrevious() {
      sendEvent("onPrevious", emptyMap())
    }

    override fun onSeekTo(pos: Long) {
      sendEvent("onSeek", mapOf("position" to pos / 1000.0))
    }

    override fun onSetRating(rating: Rating) {
      if (rating.isRated) {
        sendEvent("onLikePressed", emptyMap())
      }
    }
  }

  companion object {
    private const val TAG = "ExpoMusicControls"
  }
}
