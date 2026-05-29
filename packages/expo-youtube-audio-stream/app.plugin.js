const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const HEADER = '# expo-youtube-audio-stream'

const PROGUARD_RULES = [
  '',
  '# --- expo-youtube-audio-stream: BEGIN ---',
  '# NewPipe Extractor uses Mozilla Rhino for YouTube cipher decryption.',
  '# Keep only the Rhino classes NewPipe actually needs — avoid keeping all',
  '# because JavaToJSONConverters and engine.* reference java.beans and',
  '# javax.script which don\'t exist on Android.',
  '-keep class org.mozilla.javascript.Context { *; }',
  '-keep class org.mozilla.javascript.Scriptable { *; }',
  '-keep class org.mozilla.javascript.ScriptableObject { *; }',
  '-keep class org.mozilla.javascript.Function { *; }',
  '-keep class org.mozilla.javascript.NativeArray { *; }',
  '-keep class org.mozilla.javascript.Undefined { *; }',
  '-keep class org.mozilla.javascript.RhinoException { *; }',
  '-keep class org.mozilla.javascript.PolicySecurityController { *; }',
  '-keep class org.mozilla.javascript.SecurityController { *; }',
  '-keep class org.mozilla.classfile.ClassFileWriter { *; }',
  '-keep class org.schabi.newpipe.** { *; }',
  '-keep class fi.iki.elonen.** { *; }',
  '-keep class org.nanohttpd.** { *; }',
  '-dontwarn java.beans.**',
  '-dontwarn javax.script.**',
  '-dontwarn org.mozilla.javascript.engine.**',
  '-dontwarn org.mozilla.javascript.tools.**',
  '-dontwarn org.mozilla.javascript.JavaToJSONConverters',
  '-ignorewarnings',
  '# --- expo-youtube-audio-stream: END ---',
  '',
].join('\n')

function withYoutubeAudioStream(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const proguardPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro',
      )

      const block = PROGUARD_RULES

      if (!fs.existsSync(proguardPath)) {
        fs.writeFileSync(proguardPath, block)
        return config
      }

      const existing = fs.readFileSync(proguardPath, 'utf8')
      const beginMarker = '# --- expo-youtube-audio-stream: BEGIN ---'
      const endMarker   = '# --- expo-youtube-audio-stream: END ---'
      const beginIdx = existing.indexOf(beginMarker)
      const endIdx   = existing.indexOf(endMarker)

      if (beginIdx !== -1 && endIdx !== -1) {
        // Replace existing block (include the begin/end lines)
        const before = existing.slice(0, beginIdx)
        const after  = existing.slice(endIdx + endMarker.length)
        fs.writeFileSync(proguardPath, before + block + after)
      } else if (!existing.includes(HEADER)) {
        // Append at end
        fs.appendFileSync(proguardPath, block)
      }
      // else: marker exists but is malformed — leave it; user must fix manually.

      return config
    },
  ])
}

module.exports = withYoutubeAudioStream
