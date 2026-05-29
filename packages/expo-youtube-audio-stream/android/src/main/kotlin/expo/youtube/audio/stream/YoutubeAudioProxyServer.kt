package expo.youtube.audio.stream

import android.content.Context
import android.util.Log
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request as OkRequest
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.stream.AudioStream
import org.schabi.newpipe.extractor.stream.StreamExtractor
import org.schabi.newpipe.extractor.stream.StreamType
import java.net.ServerSocket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

data class StreamEntry(
  val url: String,
  val mimeType: String,
  val bitrate: Int,
  val codec: String,
  val container: String,
  val isHls: Boolean,
)

internal class YoutubeAudioProxyServer {
  private var server: ProxyServer? = null
  private val streamCache = ConcurrentHashMap<String, List<StreamEntry>>()
  private val tag = "YT-AudioStream"

  internal var okClient = newOkHttpClient()
    private set

  private fun newOkHttpClient() = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .followRedirects(true)
    .dns(DnsResolver.build())
    .build()

  fun start(context: Context) {
    if (server != null) return
    val port = findAvailablePort()
    server = ProxyServer(port, okClient, streamCache)
    server!!.start()
  }

  fun stop() {
    server?.stop()
    server = null
    streamCache.clear()
    okClient.dispatcher.cancelAll()
    okClient.connectionPool.evictAll()
    okClient = newOkHttpClient()
  }

  fun getPort(): Int = server?.getListeningPort() ?: -1

  suspend fun getStreams(videoId: String): List<Map<String, Any?>> {
    val cached = streamCache[videoId]
    if (cached != null) return cached.map { it.toMap(videoId, getPort()) }

    val streams = withContext(Dispatchers.IO) {
      extractStreams(videoId)
    }
    if (streams.isEmpty()) {
      throw Exception("extractStreams returned 0 streams for video $videoId")
    }
    streamCache[videoId] = streams
    return streams.map { it.toMap(videoId, getPort()) }
  }

  suspend fun prefetch(videoId: String) {
    if (streamCache.containsKey(videoId)) return
    withContext(Dispatchers.IO) {
      try {
        val streams = extractStreams(videoId)
        streamCache[videoId] = streams
        val bestUrl = streams.firstOrNull()?.url ?: return@withContext
        val req = OkRequest.Builder().url(bestUrl).build()
        val resp = okClient.newCall(req).execute()
        resp.close()
      } catch (_: Exception) {}
    }
  }

  private suspend fun extractStreams(videoId: String): List<StreamEntry> {
    return withContext(Dispatchers.IO) {
      try {
        val linkHandler = ServiceList.YouTube.streamLHFactory.fromId(videoId)
        val extractor = ServiceList.YouTube.getStreamExtractor(linkHandler)
        extractor.fetchPage()

        Log.d(tag, "streamType=${extractor.streamType} name=${extractor.name}")
        Log.d(tag, "videoStreams=${extractor.videoStreams?.size} audioStreams=${extractor.audioStreams?.size} videoOnlyStreams=${extractor.videoOnlyStreams?.size}")

        if (extractor.streamType == StreamType.LIVE_STREAM) {
          val hlsUrl = extractor.hlsUrl
          Log.d(tag, "hlsUrl=$hlsUrl")
          if (hlsUrl != null) {
            return@withContext listOf(
              StreamEntry(
                url = hlsUrl,
                mimeType = "application/vnd.apple.mpegurl",
                bitrate = 0,
                codec = "hls",
                container = "m3u8",
                isHls = true,
              )
            )
          }
        }

        val audioStreams = extractor.audioStreams
        Log.d(tag, "raw audioStreams count=${audioStreams?.size}")

        val result = (audioStreams ?: emptyList()).mapNotNull { stream ->
          val url = stream.content
          Log.d(tag, "audio stream: url=$url bitrate=${stream.bitrate} codec=${stream.codec} format=${stream.format}")
          if (url == null) return@mapNotNull null
          StreamEntry(
            url = url,
            mimeType = stream.format?.mimeType ?: "audio/mp4",
            bitrate = stream.bitrate,
            codec = stream.codec ?: "",
            container = stream.format?.suffix ?: "m4a",
            isHls = false,
          )
        }.ifEmpty {
          // Fallback to muxed video streams (which contain audio) when no audio-only streams
          Log.d(tag, "No audio-only streams, falling back to muxed videoStreams")
          (extractor.videoStreams ?: emptyList()).mapNotNull { stream ->
            val url = stream.content
            Log.d(tag, "muxed stream: url=$url bitrate=${stream.bitrate} codec=${stream.codec}")
            if (url == null) return@mapNotNull null
            StreamEntry(
              url = url,
              mimeType = stream.format?.mimeType ?: "audio/mp4",
              bitrate = stream.bitrate,
              codec = stream.codec ?: "",
              container = stream.format?.suffix ?: "mp4",
              isHls = false,
            )
          }
        }.sortedByDescending { it.bitrate }

        Log.d(tag, "final stream count=${result.size}")
        result
      } catch (e: Exception) {
        Log.e(tag, "extractStreams failed for $videoId", e)
        throw e
      }
    }
  }

  private fun findAvailablePort(): Int {
    for (port in 17000..17999) {
      try {
        ServerSocket(port).use { it.close(); return port }
      } catch (_: Exception) {}
    }
    return 17000
  }
}

private class ProxyServer(
  port: Int,
  private val okClient: OkHttpClient,
  private val streamCache: ConcurrentHashMap<String, List<StreamEntry>>,
) : NanoHTTPD(port) {

  override fun serve(session: IHTTPSession): Response {
    val uri = session.uri
    val segments = uri.removePrefix("/").split("/")
    if (segments.size < 2 || segments[0] != "stream") {
      return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found")
    }

    val videoId = segments[1].removeSuffix(".m3u8")
    val isM3u8Request = segments[1].endsWith(".m3u8")

    val streams = streamCache[videoId]
    if (streams == null) {
      return newFixedLengthResponse(
        Response.Status.PRECONDITION_FAILED, "text/plain",
        "Stream not extracted yet",
      )
    }

    val entry = streams.firstOrNull() ?: return newFixedLengthResponse(
      Response.Status.NOT_FOUND, "text/plain", "No stream available",
    )

    if (isM3u8Request || entry.isHls) {
      val resp = newFixedLengthResponse(Response.Status.REDIRECT, "text/plain", "")
      resp.addHeader("Location", entry.url)
      return resp
    }

    return proxyStream(entry.url, session)
  }

  private fun proxyStream(youtubeUrl: String, session: IHTTPSession): Response {
    try {
      val requestBuilder = OkRequest.Builder().url(youtubeUrl)

      val rangeHeader = session.headers["range"]
      if (rangeHeader != null) {
        requestBuilder.addHeader("Range", rangeHeader)
      }
      requestBuilder.addHeader("User-Agent", USER_AGENT)

      val response = okClient.newCall(requestBuilder.build()).execute()
      val body = response.body ?: return newFixedLengthResponse(
        Response.Status.INTERNAL_ERROR, "text/plain", "No response body",
      )

      val contentType = response.header("Content-Type") ?: "audio/mp4"
      val contentLength = body.contentLength()
      val contentRange = response.header("Content-Range")

      val status = when (response.code) {
        206 -> Response.Status.PARTIAL_CONTENT
        200 -> Response.Status.OK
        else -> return newFixedLengthResponse(
          Response.Status.lookup(response.code), "text/plain", "Upstream error",
        )
      }

      return newChunkedResponse(status, contentType, body.byteStream()).also {
        it.addHeader("Accept-Ranges", "bytes")
        if (contentLength >= 0) {
          it.addHeader("Content-Length", contentLength.toString())
        }
        if (contentRange != null) {
          it.addHeader("Content-Range", contentRange)
        }
      }
    } catch (e: Exception) {
      return newFixedLengthResponse(
        Response.Status.INTERNAL_ERROR, "text/plain",
        "Proxy error: ${e.message}",
      )
    }
  }

  companion object {
    private const val USER_AGENT =
      "Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0"
  }
}

private fun StreamEntry.toMap(videoId: String, port: Int): Map<String, Any?> {
  val localUrl = if (isHls) {
    "http://127.0.0.1:$port/stream/$videoId.m3u8"
  } else {
    "http://127.0.0.1:$port/stream/$videoId"
  }
  return mapOf(
    "url" to localUrl,
    "mimeType" to mimeType,
      "bitrate" to bitrate,
    "codec" to codec,
    "contentLength" to 0,
    "container" to container,
    "isHLS" to isHls,
  )
}
