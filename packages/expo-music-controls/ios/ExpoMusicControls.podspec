Pod::Spec.new do |s|
  s.name           = 'ExpoMusicControls'
  s.version        = '0.1.0'
  s.summary        = 'Expo module for like/unlike button on lock screen and notification'
  s.homepage       = 'https://github.com/your-org/expo-music-controls'
  s.license        = 'MIT'
  s.author         = 'your-org'
  s.source         = { git: '' }
  s.static_framework = true

  s.platform       = :ios, '13.0'
  s.swift_version  = '5.4'

  s.source_files   = 'Sources/**/*.{swift}'

  s.dependency 'ExpoModulesCore'
end
