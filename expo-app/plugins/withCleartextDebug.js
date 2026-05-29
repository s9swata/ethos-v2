const { withAndroidManifest } = require("expo/config-plugins");

function withCleartextDebug(config) {
  return withAndroidManifest(config, (nativeConfig) => {
    const app = nativeConfig.modResults.manifest.application?.[0];
    if (app) app.$["android:usesCleartextTraffic"] = "true";
    return nativeConfig;
  });
}

module.exports = withCleartextDebug;
