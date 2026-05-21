import type { FastifyInstance } from "fastify";
import { getInfo } from "../services/ytdlp.js";
import { validateTrackId } from "../services/validate.js";
import { logger } from "../logger.js";

export async function trackRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/tracks/:id", async (req, reply) => {
    const { id } = req.params;

    const validation = validateTrackId(id);
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.reason });
    }

    logger.info({ id }, "Track info request");
    const info = await getInfo(id);
    return reply.send({
      id: info.id,
      title: info.title,
      artist: info.artist,
      duration: info.duration,
      thumbnail: info.thumbnail,
      webpageUrl: info.webpageUrl,
      formats: info.formats.map((f) => ({
        ext: f.ext,
        format: f.format,
        bitrate: f.bitrate,
      })),
    });
  });
}
