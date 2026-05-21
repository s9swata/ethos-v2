import type { FastifyInstance } from "fastify";
import { getPlaylist, getArtistUploads } from "../services/ytdlp.js";
import { logger } from "../logger.js";

interface UrlQuery {
  url: string;
  limit?: string;
}

export async function playlistRoutes(app: FastifyInstance) {
  app.get<{ Querystring: UrlQuery }>("/api/playlist", async (req, reply) => {
    const { url, limit } = req.query;
    if (!url) {
      return reply.status(400).send({ error: "Query parameter 'url' is required" });
    }
    const l = Math.min(Math.max(Number(limit) || 100, 1), 200);
    logger.info({ url, limit: l }, "Playlist request");
    const result = await getPlaylist(url);
    return reply.send({
      title: result.title,
      tracks: result.tracks.slice(0, l),
      count: Math.min(result.tracks.length, l),
    });
  });

  app.get<{ Querystring: UrlQuery }>("/api/artist", async (req, reply) => {
    const { url, limit } = req.query;
    if (!url) {
      return reply.status(400).send({ error: "Query parameter 'url' is required" });
    }
    const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
    logger.info({ url, limit: l }, "Artist/Channel request");
    const result = await getArtistUploads(url, l);
    return reply.send({
      name: result.name,
      tracks: result.tracks,
      count: result.tracks.length,
    });
  });
}
