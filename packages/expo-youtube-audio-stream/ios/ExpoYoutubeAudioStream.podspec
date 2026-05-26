Pod::Spec.new do |s|
  s.name           = 'ExpoYoutubeAudioStream'
  s.version        = '0.1.0'
  s.summary        = 'Expo module for extracting and proxying YouTube audio streams'
  s.homepage       = 'https://github.com/your-org/expo-youtube-audio-stream'
  s.license        = 'MIT'
  s.author         = 'your-org'
  s.source         = { git: '' }
  s.static_framework = true

  s.platform       = :ios, '13.0'
  s.swift_version  = '5.4'

  s.source_files   = 'Sources/**/*.{swift}'

  s.dependency 'ExpoModulesCore'
  s.dependency 'GCDWebServer', '~> 3.0'
end
