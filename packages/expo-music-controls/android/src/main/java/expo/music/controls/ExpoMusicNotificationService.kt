package expo.music.controls

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.app.NotificationCompat.MediaStyle
import androidx.core.app.NotificationCompat

class ExpoMusicNotificationService : Service() {
  inner class LocalBinder : Binder() {
    fun getService(): ExpoMusicNotificationService = this@ExpoMusicNotificationService
  }

  private val binder = LocalBinder()
  private var mediaSession: MediaSessionCompat? = null

  private val notificationManager by lazy {
    getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager
  }

  override fun onBind(intent: Intent?): IBinder = binder

  fun setMediaSession(session: MediaSessionCompat?) {
    mediaSession = session
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra("title") ?: ""
    val artist = intent?.getStringExtra("artist") ?: ""
    val isPlaying = intent?.getBooleanExtra("isPlaying", false) ?: false

    startForeground(NOTIFICATION_ID, buildNotification(title, artist, isPlaying))
    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    stopForeground(STOP_FOREGROUND_REMOVE)
  }

  private fun createNotificationChannel() {
    val channel = android.app.NotificationChannel(
      CHANNEL_ID,
      "Media Playback",
      android.app.NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Music playback controls"
      setShowBadge(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    notificationManager.createNotificationChannel(channel)
  }

  private fun buildNotification(title: String, artist: String, isPlaying: Boolean): Notification {
    val launchIntent = packageManager?.getLaunchIntentForPackage(packageName)
    val contentIntent = PendingIntent.getActivity(
      this, 0, launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(if (isPlaying) android.R.drawable.ic_media_play else android.R.drawable.ic_media_pause)
      .setContentTitle(title)
      .setContentText(artist)
      .setContentIntent(contentIntent)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(isPlaying)
      .setShowWhen(false)

    mediaSession?.sessionToken?.let { token ->
      builder.setStyle(
        MediaStyle()
          .setMediaSession(token)
          .setShowActionsInCompactView(0, 1, 2)
          .setShowCancelButton(true)
      )
    }

    return builder.build()
  }

  companion object {
    const val NOTIFICATION_ID = 1001
    const val CHANNEL_ID = "expo_music_controls"
  }
}
