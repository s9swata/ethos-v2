const fs = require("fs");
const path = require("path");

const PLAYER_PATH = path.join(__dirname, "..", "node_modules", "@rntp", "player");

const FILES = {
  PlayerCommandKt:
    "android/src/main/java/com/doublesymmetry/trackplayer/models/PlayerCommand.kt",
  EmitEventTypeKt:
    "android/src/main/java/com/doublesymmetry/trackplayer/models/EmitEventType.kt",
  RemoteControlEventKt:
    "android/src/main/java/com/doublesymmetry/trackplayer/models/RemoteControlEvent.kt",
  PlayerConfigKt:
    "android/src/main/java/com/doublesymmetry/trackplayer/models/PlayerConfig.kt",
  ServiceKt:
    "android/src/main/java/com/doublesymmetry/trackplayer/TrackPlayerPlaybackService.kt",
  PlayerCommandTs: "src/interfaces/PlayerCommand.ts",
  RemoteControlTs: "src/events/RemoteControl.ts",
  EventsIndexTs: "src/events/index.ts",
};

function read(file) {
  return fs.readFileSync(path.join(PLAYER_PATH, file), "utf8");
}
function write(file, content) {
  fs.writeFileSync(path.join(PLAYER_PATH, file), content);
}

function safeReplace(file, oldStr, newStr) {
  const f = FILES[file] || file;
  const content = read(f);
  if (content.includes(newStr)) return;
  const updated = content.replace(oldStr, newStr);
  if (updated === content) {
    console.warn(`[withLikeNotification] NO MATCH in ${f}`);
    return;
  }
  write(f, updated);
}

function withLikeNotification(config) {
  // ── Kotlin: PlayerCommand.kt ──
  safeReplace(
    "PlayerCommandKt",
    `  SKIP_BACKWARD("skipBackward"),
}`,
    `  SKIP_BACKWARD("skipBackward"),
  LIKE("like"),
}`
  );

  // ── Kotlin: EmitEventType.kt ──
  safeReplace(
    "EmitEventTypeKt",
    `  SLEEP_TIMER_TRIGGERED("event.sleep-timer-triggered"),
}`,
    `  SLEEP_TIMER_TRIGGERED("event.sleep-timer-triggered"),
  REMOTE_LIKE("event.remote-like"),
}`
  );

  // ── Kotlin: RemoteControlEvent.kt ──
  safeReplace(
    "RemoteControlEventKt",
    `data class RemoteSkipBackwardEvent(
  val interval: Double, // seconds
) : EmitEvent {`,
    `class RemoteLikeEvent : EmitEvent {
  override val type = EmitEventType.REMOTE_LIKE
  override fun pairs(): Array<Pair<String, Any>> = arrayOf()
}

data class RemoteSkipBackwardEvent(
  val interval: Double, // seconds
) : EmitEvent {`
  );

  // ── Kotlin: PlayerConfig.kt — handle "like" in withCommands ──
  safeReplace(
    "PlayerConfigKt",
    `            "skipBackward" -> PlayerCommand.SKIP_BACKWARD
            else -> null`,
    `            "skipBackward" -> PlayerCommand.SKIP_BACKWARD
            "like" -> PlayerCommand.LIKE
            else -> null`
  );

  // ── Kotlin: TrackPlayerPlaybackService.kt ──

  // a) Add RemoteLikeEvent import
  safeReplace(
    "ServiceKt",
    `import com.doublesymmetry.trackplayer.models.RemoteSkipBackwardEvent
import com.doublesymmetry.trackplayer.models.WakeMode`,
    `import com.doublesymmetry.trackplayer.models.RemoteSkipBackwardEvent
import com.doublesymmetry.trackplayer.models.RemoteLikeEvent
import com.doublesymmetry.trackplayer.models.WakeMode`
  );

  // b) Add CommandButton + ImmutableList import
  safeReplace(
    "ServiceKt",
    `import androidx.media3.session.DefaultMediaNotificationProvider`,
    `import androidx.media3.session.CommandButton
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.DefaultMediaNotificationProvider.NotificationIdProvider
import com.google.common.collect.ImmutableList`
  );

  // c) Remove the separate ImmutableList import if it was added
  // (it's combined with the CommandButton import above)

  // d) Add COMMAND_LIKE constant
  safeReplace(
    "ServiceKt",
    `    const val COMMAND_CANCEL_PRELOAD = "trackplayer.cancel_preload"`,
    `    const val COMMAND_CANCEL_PRELOAD = "trackplayer.cancel_preload"
    const val COMMAND_LIKE = "trackplayer.like"`
  );

  // e) Handle COMMAND_LIKE in onCustomCommand
  safeReplace(
    "ServiceKt",
    `      COMMAND_CANCEL_PRELOAD -> {
        val uri = args.getString("uri") ?: return Futures.immediateFuture(SessionResult(SessionResult.RESULT_ERROR_UNKNOWN))
        cancelPreloadUri(uri)
        return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
      }
    }`,
    `      COMMAND_CANCEL_PRELOAD -> {
        val uri = args.getString("uri") ?: return Futures.immediateFuture(SessionResult(SessionResult.RESULT_ERROR_UNKNOWN))
        cancelPreloadUri(uri)
        return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
      }
      COMMAND_LIKE -> {
        this@TrackPlayerPlaybackService.emitEvent(RemoteLikeEvent())
        return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
      }
    }`
  );

  // f) Replace setupNotificationProvider to use custom provider when LIKE is enabled
  safeReplace(
    "ServiceKt",
    `  @OptIn(UnstableApi::class)
  private fun setupNotificationProvider(config: PlayerConfig) {
    val channelId = config.notificationChannelId ?: return
    val channelName = config.notificationChannelName ?: channelId

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
      val nm = getSystemService(NotificationManager::class.java)
      nm.createNotificationChannel(channel)
    }

    val provider = DefaultMediaNotificationProvider.Builder(this)
      .setChannelId(channelId)
      .build()

    config.notificationSmallIcon?.let { iconName ->
      val iconRes = resources.getIdentifier(iconName, "drawable", packageName)
      if (iconRes != 0) {
        provider.setSmallIcon(iconRes)
      }
    }

    setMediaNotificationProvider(provider)
  }`,
    `  @OptIn(UnstableApi::class)
  private fun setupNotificationProvider(config: PlayerConfig) {
    val channelId = config.notificationChannelId ?: return
    val channelName = config.notificationChannelName ?: channelId

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
      val nm = getSystemService(NotificationManager::class.java)
      nm.createNotificationChannel(channel)
    }

    val likeEnabled = config.availableCommands.contains(PlayerCommand.LIKE)
    val provider = if (likeEnabled) {
      CustomNotificationProvider(this, channelId, true)
    } else {
      DefaultMediaNotificationProvider.Builder(this)
        .setChannelId(channelId)
        .build()
    }

    config.notificationSmallIcon?.let { iconName ->
      val iconRes = resources.getIdentifier(iconName, "drawable", packageName)
      if (iconRes != 0) {
        provider.setSmallIcon(iconRes)
      }
    }

    setMediaNotificationProvider(provider)
  }`
  );

  // ── Create CustomNotificationProvider.kt ──
  const customProviderPath = path.join(
    PLAYER_PATH,
    "android/src/main/java/com/doublesymmetry/trackplayer/CustomNotificationProvider.kt"
  );
  if (!fs.existsSync(customProviderPath)) {
    fs.mkdirSync(path.dirname(customProviderPath), { recursive: true });
    fs.writeFileSync(customProviderPath, `package com.doublesymmetry.trackplayer

import android.os.Bundle
import androidx.media3.common.Player
import androidx.media3.session.CommandButton
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.DefaultMediaNotificationProvider.NotificationIdProvider
import androidx.media3.session.MediaSession
import androidx.media3.session.SessionCommand
import com.google.common.collect.ImmutableList

class CustomNotificationProvider(
    context: android.content.Context,
    channelId: String,
    private val likeEnabled: Boolean,
) : DefaultMediaNotificationProvider(
    context,
    NotificationIdProvider { DEFAULT_NOTIFICATION_ID },
    channelId,
    R.string.ethos_music_channel,
) {
    override fun getMediaButtons(
        session: MediaSession,
        availableCommands: Player.Commands,
        customLayoutButtons: ImmutableList<CommandButton>,
        isPlaying: Boolean,
    ): ImmutableList<CommandButton> {
        val builder = ImmutableList.builder<CommandButton>()

        if (availableCommands.contains(Player.COMMAND_SEEK_TO_PREVIOUS)) {
            builder.add(
                CommandButton.Builder()
                    .setPlayerCommand(Player.COMMAND_SEEK_TO_PREVIOUS)
                    .setDisplayName("Previous")
                    .setSlots(CommandButton.SLOT_BACK)
                    .build()
            )
        }

        builder.add(
            CommandButton.Builder()
                .setPlayerCommand(Player.COMMAND_PLAY_PAUSE)
                .setDisplayName(if (isPlaying) "Pause" else "Play")
                .setSlots(CommandButton.SLOT_CENTRAL)
                .build()
        )

        if (availableCommands.contains(Player.COMMAND_SEEK_TO_NEXT)) {
            builder.add(
                CommandButton.Builder()
                    .setPlayerCommand(Player.COMMAND_SEEK_TO_NEXT)
                    .setDisplayName("Next")
                    .setSlots(CommandButton.SLOT_FORWARD)
                    .build()
            )
        }

        if (likeEnabled) {
            builder.add(
                CommandButton.Builder(CommandButton.ICON_HEART_UNFILLED)
                    .setSessionCommand(SessionCommand(TrackPlayerPlaybackService.COMMAND_LIKE, Bundle.EMPTY))
                    .setDisplayName("Like")
                    .build()
            )
        }

        return builder.build()
    }
}
`);
  }

  // ── Create string resources for @rntp/player ──
  const stringsPath = path.join(
    PLAYER_PATH,
    "android/src/main/res/values/strings.xml"
  );
  if (!fs.existsSync(stringsPath)) {
    fs.mkdirSync(path.dirname(stringsPath), { recursive: true });
    fs.writeFileSync(
      stringsPath,
      `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="ethos_music_channel">Ethos Music</string>
</resources>
`
    );
  }

  // ── Create heart icon drawable for app android project ──
  const heartPath = path.join(
    __dirname,
    "..",
    "android/app/src/main/res/drawable/ic_heart_unfilled.xml"
  );
  const heartDir = path.dirname(heartPath);
  if (!fs.existsSync(heartDir)) {
    // No native android project yet (prebuild hasn't run), skip
    // The CustomNotificationProvider uses Media3's built-in heart icon anyway
  } else if (!fs.existsSync(heartPath)) {
    fs.writeFileSync(
      heartPath,
      `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="#FFFFFF">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,21.35l-1.45,-1.32C5.4,15.36 2,12.28 2,8.5 2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3 19.58,3 22,5.42 22,8.5c0,3.78 -3.4,6.86 -8.55,11.54L12,21.35z"/>
</vector>
`
    );
  }

  // ── TypeScript: PlayerCommand.ts ──
  safeReplace(
    "PlayerCommandTs",
    `  SkipBackward = 'skipBackward',
}`,
    `  SkipBackward = 'skipBackward',
  Like = 'like',
}`
  );

  // g) Add LIKE branch to exhaustive when in buildPlayerCommands
  safeReplace(
    "ServiceKt",
    `        PlayerCommand.SKIP_BACKWARD -> builder.add(Player.COMMAND_SEEK_BACK)
      }`,
    `        PlayerCommand.SKIP_BACKWARD -> builder.add(Player.COMMAND_SEEK_BACK)
        PlayerCommand.LIKE -> {}
      }`
  );

  // ── TypeScript: RemoteControl.ts ──
  safeReplace(
    "RemoteControlTs",
    `export interface RemoteSkipBackwardEvent {
  interval: number; // seconds
}`,
    `export interface RemoteLikeEvent {}

export interface RemoteSkipBackwardEvent {
  interval: number; // seconds
}`
  );

  // ── TypeScript: events/index.ts ──
  safeReplace(
    "EventsIndexTs",
    `import type {
  RemotePlayEvent,
  RemotePauseEvent,
  RemoteNextEvent,
  RemotePreviousEvent,
  RemoteStopEvent,
  RemoteSeekEvent,
  RemoteSkipForwardEvent,
  RemoteSkipBackwardEvent,
} from './RemoteControl';`,
    `import type {
  RemotePlayEvent,
  RemotePauseEvent,
  RemoteNextEvent,
  RemotePreviousEvent,
  RemoteStopEvent,
  RemoteSeekEvent,
  RemoteSkipForwardEvent,
  RemoteSkipBackwardEvent,
  RemoteLikeEvent,
} from './RemoteControl';`
  );

  safeReplace(
    "EventsIndexTs",
    `  RemoteSkipBackward = 'event.remote-skip-backward',
  SleepTimerTriggered = 'event.sleep-timer-triggered',`,
    `  RemoteSkipBackward = 'event.remote-skip-backward',
  RemoteLike = 'event.remote-like',
  SleepTimerTriggered = 'event.sleep-timer-triggered',`
  );

  safeReplace(
    "EventsIndexTs",
    `  [Event.RemoteSkipBackward]: RemoteSkipBackwardEvent;
  [Event.SleepTimerTriggered]: SleepTimerTriggeredEvent;`,
    `  [Event.RemoteSkipBackward]: RemoteSkipBackwardEvent;
  [Event.RemoteLike]: RemoteLikeEvent;
  [Event.SleepTimerTriggered]: SleepTimerTriggeredEvent;`
  );

  return config;
}

module.exports = withLikeNotification;
