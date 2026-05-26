const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const PROGUARD_RULES = [
  '',
  '# expo-youtube-audio-stream: NewPipe Extractor uses Mozilla Rhino for',
  '# YouTube cipher signature decryption. ProGuard would strip these.',
  '-keep class org.mozilla.javascript.** { *; }',
  '-keep class org.mozilla.classfile.ClassFileWriter',
  '-dontwarn org.mozilla.javascript.tools.**',
  '-keep class org.schabi.newpipe.** { *; }',
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

      if (!fs.existsSync(proguardPath)) {
        fs.writeFileSync(proguardPath, PROGUARD_RULES)
        return config
      }

      const existing = fs.readFileSync(proguardPath, 'utf8')
      if (!existing.includes('expo-youtube-audio-stream')) {
        fs.appendFileSync(proguardPath, PROGUARD_RULES)
      }

      return config
    },
  ])
}

module.exports = withYoutubeAudioStream
