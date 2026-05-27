package expo.youtube.audio.stream

import okhttp3.Dns
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.dnsoverhttps.DnsOverHttps
import java.net.InetAddress
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

object DnsResolver {
  fun build(): Dns {
    val bootstrapClient = OkHttpClient.Builder()
      .connectTimeout(15, TimeUnit.SECONDS)
      .readTimeout(15, TimeUnit.SECONDS)
      .build()
    val doh = DnsOverHttps.Builder()
      .client(bootstrapClient)
      .url("https://cloudflare-dns.com/dns-query".toHttpUrl())
      .bootstrapDnsHosts(
        InetAddress.getByName("1.1.1.1"),
        InetAddress.getByName("1.0.0.1"),
      )
      .build()
    return FallbackDns(doh)
  }
}

private class FallbackDns(private val doh: DnsOverHttps) : Dns {
  override fun lookup(hostname: String): List<InetAddress> {
    return try {
      Dns.SYSTEM.lookup(hostname)
    } catch (e: UnknownHostException) {
      doh.lookup(hostname)
    }
  }
}
