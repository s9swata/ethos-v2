import Foundation
import GCDWebServer

// MARK: - Audio stream model

struct AudioStreamInfo: Codable {
  let url: String
  let mimeType: String
  let bitrate: Int
  let codec: String
  let contentLength: Int
  let container: String
  let isHLS: Bool
}

// MARK: - InnerTube API client

private struct InnerTubeResponse: Codable {
  let streamingData: StreamingData?
  let videoDetails: VideoDetails?
  let playabilityStatus: PlayabilityStatus?
}

private struct StreamingData: Codable {
  let expiresInSeconds: String?
  let formats: [Format]?
  let adaptiveFormats: [Format]?
  let hlsManifestUrl: String?
}

private struct Format: Codable {
  let itag: Int?
  let mimeType: String?
  let bitrate: Int?
  let audioChannels: Int?
  let audioSampleRate: String?
  let audioQuality: String?
  let codecs: String?
  let contentLength: String?
  let url: String?
  let signatureCipher: String?
  let cipher: String?
  let approxDurationMs: String?
}

private struct VideoDetails: Codable {
  let videoId: String?
}

private struct PlayabilityStatus: Codable {
  let status: String?
  let reason: String?
}

// MARK: - Proxy server

class YoutubeAudioProxyServer {
  private var webServer: GCDWebServer?
  private var streamCache: [String: [AudioStreamInfo]] = [:]
  private let lock = NSLock()

  private static let innerTubeApiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
  private static let innerTubeUrl = "https://www.youtube.com/youtubei/v1/player"

  func start() {
    if webServer != nil { return }

    let server = GCDWebServer()
    server.addDefaultHandler(forMethod: "GET", request: GCDWebServerRequest.self) { [weak self] request in
      self?.handleRequest(request) ?? GCDWebServerDataResponse(statusCode: 500)
    }
    server.addDefaultHandler(forMethod: "HEAD", request: GCDWebServerRequest.self) { [weak self] request in
      self?.handleHeadRequest(request) ?? GCDWebServerDataResponse(statusCode: 500)
    }

    let port: UInt = 17000
    server.start(withPort: port, bonjourName: nil)
    self.webServer = server
  }

  func stop() {
    webServer?.stop()
    webServer = nil
    lock.withLock { streamCache.removeAll() }
  }

  var port: UInt {
    webServer?.port ?? 0
  }

  // MARK: - Public API

  func getStreams(videoId: String) async throws -> [[String: Any]] {
    if let cached = lock.withLock({ streamCache[videoId] }) {
      return cached.map { $0.toMap(with: videoId, port: Int(port)) }
    }

    let streams = try await extractStreams(videoId: videoId)
    lock.withLock { streamCache[videoId] = streams }
    return streams.map { $0.toMap(with: videoId, port: Int(port)) }
  }

  func prefetch(videoId: String) async throws {
    if lock.withLock({ streamCache[videoId] != nil }) { return }
    let streams = try await extractStreams(videoId: videoId)
    lock.withLock { streamCache[videoId] = streams }
    _ = try? await URLSession.shared.data(from: URL(string: streams.first?.url ?? "")!)
  }

  // MARK: - Stream extraction via InnerTube API

  private func extractStreams(videoId: String) async throws -> [AudioStreamInfo] {
    guard let url = URL(string: Self.innerTubeUrl) else { return [] }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("com.google.ios.youtube/19.29.1", forHTTPHeaderField: "User-Agent")

    let body: [String: Any] = [
      "videoId": videoId,
      "context": [
        "client": [
          "clientName": "IOS",
          "clientVersion": "19.29.1",
          "deviceModel": "iPhone16,2",
          "osName": "iPhone",
          "osVersion": "17.4.0",
          "hl": "en",
        ]
      ],
      "contentCheckOk": true,
      "racyCheckOk": true,
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      return []
    }

    let decoder = JSONDecoder()
    guard let playerResponse = try? decoder.decode(InnerTubeResponse.self, from: data) else {
      return []
    }

    if playerResponse.playabilityStatus?.status != "OK" {
      return []
    }

    var result: [AudioStreamInfo] = []

    // Check for HLS livestream
    if let hlsUrl = playerResponse.streamingData?.hlsManifestUrl {
      result.append(AudioStreamInfo(
        url: hlsUrl,
        mimeType: "application/vnd.apple.mpegurl",
        bitrate: 0,
        codec: "hls",
        contentLength: 0,
        container: "m3u8",
        isHLS: true
      ))
      return result
    }

    // Process adaptive formats (audio-only streams)
    let formats = playerResponse.streamingData?.adaptiveFormats ?? []
    for format in formats {
      guard let mimeType = format.mimeType, mimeType.hasPrefix("audio/") else { continue }
      guard let streamUrl = resolveStreamUrl(format) else { continue }
      guard let codecs = format.codecs else { continue }
      guard let bitrate = format.bitrate else { continue }

      let contentLength = Int(format.contentLength ?? "0") ?? 0
      let container = parseContainer(from: mimeType)
      let audioQuality = format.audioQuality ?? ""

      // Filter out low-quality opus streams (below 48kbps) and low-quality audio
      if bitrate < 48000 { continue }

      result.append(AudioStreamInfo(
        url: streamUrl,
        mimeType: mimeType.components(separatedBy: ";").first?.trimmingCharacters(in: .whitespaces) ?? mimeType,
        bitrate: bitrate,
        codec: codecs,
        contentLength: contentLength,
        container: container,
        isHLS: false
      ))
    }

    // Also check regular formats for audio
    let regularFormats = playerResponse.streamingData?.formats ?? []
    for format in regularFormats {
      guard let mimeType = format.mimeType, mimeType.hasPrefix("audio/") else { continue }
      guard let streamUrl = resolveStreamUrl(format) else { continue }
      guard let codecs = format.codecs else { continue }
      guard let bitrate = format.bitrate else { continue }

      let alreadyExists = result.contains { $0.bitrate == bitrate && $0.codec == codecs }
      if alreadyExists { continue }

      result.append(AudioStreamInfo(
        url: streamUrl,
        mimeType: mimeType.components(separatedBy: ";").first?.trimmingCharacters(in: .whitespaces) ?? mimeType,
        bitrate: bitrate,
        codec: codecs,
        contentLength: Int(format.contentLength ?? "0") ?? 0,
        container: parseContainer(from: mimeType),
        isHLS: false
      ))
    }

    return result.sorted { $0.bitrate > $1.bitrate }
  }

  private func resolveStreamUrl(_ format: Format) -> String? {
    if let url = format.url { return url }

    let cipher = format.signatureCipher ?? format.cipher
    if let cipher = cipher {
      let params = parseQueryParams(cipher)
      if let url = params["url"], let s = params["s"] {
        let decodedUrl = url.removingPercentEncoding ?? url
        let signature = decryptSignature(s)
        let separator = decodedUrl.contains("?") ? "&" : "?"
        return "\(decodedUrl)\(separator)sig=\(signature)"
      }
    }
    return nil
  }

  private func decryptSignature(_ s: String) -> String {
    String(s.reversed())
  }

  private func parseQueryParams(_ query: String) -> [String: String] {
    var params: [String: String] = [:]
    let pairs = query.components(separatedBy: "&")
    for pair in pairs {
      let kv = pair.components(separatedBy: "=")
      if kv.count == 2 {
        params[kv[0]] = kv[1]
      }
    }
    return params
  }

  private func parseContainer(from mimeType: String) -> String {
    if mimeType.contains("mp4") { return "m4a" }
    if mimeType.contains("webm") { return "webm" }
    if mimeType.contains("3gpp") { return "3gpp" }
    return "unknown"
  }

  // MARK: - HTTP request handling

  private func handleRequest(_ request: GCDWebServerRequest) -> GCDWebServerResponse {
    guard let videoId = parseVideoId(from: request.path) else {
      return GCDWebServerDataResponse(statusCode: 404)
    }

    let isM3u8Request = request.path.hasSuffix(".m3u8")
    let streams = lock.withLock { streamCache[videoId] }

    guard let streams = streams, let stream = streams.first else {
      return GCDWebServerDataResponse(statusCode: 412)
    }

    if isM3u8Request || stream.isHLS {
      return GCDWebServerDataResponse(redirect: URL(string: stream.url)!)
    }

    return proxyStream(stream: stream, request: request)
  }

  private func handleHeadRequest(_ request: GCDWebServerRequest) -> GCDWebServerResponse {
    guard let videoId = parseVideoId(from: request.path) else {
      return GCDWebServerDataResponse(statusCode: 404)
    }

    let streams = lock.withLock { streamCache[videoId] }
    guard let streams = streams, let stream = streams.first else {
      return GCDWebServerDataResponse(statusCode: 412)
    }

    let response = GCDWebServerDataResponse(statusCode: 200)
    response?.setValue(stream.mimeType, forAdditionalHeader: "Content-Type")
    if stream.contentLength > 0 {
      response?.setValue(String(stream.contentLength), forAdditionalHeader: "Content-Length")
    }
    response?.setValue("bytes", forAdditionalHeader: "Accept-Ranges")
    return response ?? GCDWebServerDataResponse(statusCode: 500)
  }

  private func proxyStream(stream: AudioStreamInfo, request: GCDWebServerRequest) -> GCDWebServerResponse {
    guard let streamUrl = URL(string: stream.url) else {
      return GCDWebServerDataResponse(statusCode: 500)
    }

    let semaphore = DispatchSemaphore(value: 0)
    var result: GCDWebServerResponse = GCDWebServerDataResponse(statusCode: 502)

    var urlRequest = URLRequest(url: streamUrl)
    urlRequest.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15", forHTTPHeaderField: "User-Agent")

    if let range = request.headers["Range"] as? String {
      urlRequest.setValue(range, forHTTPHeaderField: "Range")
    }

    let task = URLSession.shared.dataTask(with: urlRequest) { data, response, error in
      defer { semaphore.signal() }

      guard let data = data, let httpResponse = response as? HTTPURLResponse, error == nil else {
        result = GCDWebServerDataResponse(statusCode: 502)
        return
      }

      let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") ?? stream.mimeType
      let responseData = GCDWebServerDataResponse(data: data, contentType: contentType)
      responseData?.statusCode = httpResponse.statusCode

      if let contentRange = httpResponse.value(forHTTPHeaderField: "Content-Range") {
        responseData?.setValue(contentRange, forAdditionalHeader: "Content-Range")
      }
      if let contentLength = httpResponse.value(forHTTPHeaderField: "Content-Length") {
        responseData?.setValue(contentLength, forAdditionalHeader: "Content-Length")
      }
      responseData?.setValue("bytes", forAdditionalHeader: "Accept-Ranges")

      if let resp = responseData {
        result = resp
      }
    }
    task.resume()
    _ = semaphore.wait(timeout: .now() + 60)
    return result
  }

  private func parseVideoId(from path: String) -> String? {
    let segments = path.split(separator: "/").map(String.init)
    guard segments.count >= 2, segments[0] == "stream" else { return nil }
    return segments[1].replacingOccurrences(of: ".m3u8", with: "")
  }
}

// MARK: - Model conversion

extension AudioStreamInfo {
  func toMap(with videoId: String, port: Int) -> [String: Any] {
    let localUrl: String
    if isHLS {
      localUrl = "http://127.0.0.1:\(port)/stream/\(videoId).m3u8"
    } else {
      localUrl = "http://127.0.0.1:\(port)/stream/\(videoId)"
    }
    return [
      "url": localUrl,
      "mimeType": mimeType,
      "bitrate": bitrate,
      "codec": codec,
      "contentLength": contentLength,
      "container": container,
      "isHLS": isHLS,
    ]
  }
}
