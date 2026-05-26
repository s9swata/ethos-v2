import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Ethos",
    identifier: "com.ethos.player",
    version: "0.1.0",
  },

  runtime: {
    exitOnLastWindowClosed: true,
  },

  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
      sourcemap: "none",
      minify: false,
    },

    views: {},

    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
    },

    useAsar: false,

    mac: {
      codesign: true,
      notarize: true,
      bundleCEF: false,
      defaultRenderer: "native",
      icons: "icon.iconset",
    },

    linux: {
      bundleCEF: true,
      defaultRenderer: "cef",
    },

    win: {
      bundleCEF: false,
      defaultRenderer: "native",
    },
  },

  release: {
    baseUrl: "https://releases.ethos.app",
  },
} satisfies ElectrobunConfig;
