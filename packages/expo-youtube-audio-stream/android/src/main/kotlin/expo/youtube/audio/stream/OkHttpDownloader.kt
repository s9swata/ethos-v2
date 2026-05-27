package expo.youtube.audio.stream

import okhttp3.Headers
import okhttp3.OkHttpClient
import okhttp3.Request as OkRequest
import okhttp3.RequestBody
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import java.util.concurrent.TimeUnit

class OkHttpDownloader(
  private val client: OkHttpClient = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .followRedirects(true)
    .build()
) : Downloader() {

  override fun execute(request: Request): Response {
    val url = request.url()
    val reqBody = request.dataToSend()
    val okBody = if (reqBody != null) {
      okhttp3.RequestBody.create(null, reqBody)
    } else if (request.httpMethod().equals("POST", ignoreCase = true)) {
      okhttp3.RequestBody.create(null, ByteArray(0))
    } else {
      null
    }

    val builder = OkRequest.Builder()
      .url(url)
      .method(request.httpMethod(), okBody)

    val headers = request.headers()
    if (headers != null) {
      for (entry in headers) {
        for (value in entry.value) {
          builder.addHeader(entry.key, value)
        }
      }
    }

    val okResponse = client.newCall(builder.build()).execute()
    val body = okResponse.body?.string() ?: ""
    val responseHeaders = mutableMapOf<String, MutableList<String>>()
    for (i in 0 until okResponse.headers.size) {
      val name = okResponse.headers.name(i)
      val value = okResponse.headers.value(i)
      responseHeaders.getOrPut(name) { mutableListOf() }.add(value)
    }

    return Response(
      okResponse.code,
      okResponse.message,
      responseHeaders,
      body,
      request.url(),
    )
  }
}
