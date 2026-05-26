import { BrowserWindow, BrowserView } from "electrobun/bun";
import type { DesktopRPC } from "../shared/types";

let db: Awaited<ReturnType<typeof import("./db").getDb>>;

async function init() {
  db = await import("./db").then((m) => m.getDb());
}

const rpc = BrowserView.defineRPC<DesktopRPC>({
  maxRequestTime: 30_000,
  handlers: {
    requests: {
      db: {
        isLiked: ({ id }) => db.isLiked(id),
        toggleLike: ({ id, track }) => db.toggleLike(id, track),
        getLikedSongs: () => db.getLikedSongs(),
        getPlaylists: () => db.getPlaylists(),
        createPlaylist: ({ name, description }) => db.createPlaylist(name, description),
        deletePlaylist: ({ id }) => db.deletePlaylist(id),
        renamePlaylist: ({ id, name }) => db.renamePlaylist(id, name),
        addTrack: ({ playlistId, track }) => db.addTrack(playlistId, track),
        removeTrack: ({ playlistId, trackId }) => db.removeTrack(playlistId, trackId),
        getPlaylistTracks: ({ id }) => db.getPlaylistTracks(id),
        reorderTrack: ({ playlistId, trackId, newIndex }) => db.reorderTrack(playlistId, trackId, newIndex),
      },
    },
    messages: {},
  },
});

await init();

const win = new BrowserWindow({
  title: "Ethos",
  url: "http://localhost:1420",
  frame: { width: 1200, height: 800 },
  titleBarStyle: "hiddenInset",
  rpc,
});