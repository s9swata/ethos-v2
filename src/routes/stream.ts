import type { FastifyInstance } from "fastify";
import { stat, createReadStream } from "node:fs";
import { promisify } from "node:util";
import { getStreamUrl, getDesktopStreamUrl, getInfo, downloadAudio } from "../services/ytdlp.js";
import { validateTrackId } from "../services/validate.js";
import { logger } from "../logger.js";

const statAsync = promisify(stat);

export async function streamRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string }; Querystring: { proxy?: string; download?: string } }>(
    "/api/stream/:id",
    async (req, reply) => {
      const { id } = req.params;

      const validation = validateTrackId(id);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.reason });
      }

      const useProxy = req.query.proxy === "true";
      const doDownload = req.query.download === "true";

      logger.info({ id, proxy: useProxy, download: doDownload }, "Stream request");

      if (doDownload) {
        const filePath = await downloadAudio(id);
        const st = await statAsync(filePath);
        reply.header("Content-Type", "audio/mpeg");
        reply.header("Content-Length", String(st.size));
        reply.header("Content-Disposition", `attachment; filename="${id}.mp3"`);
        return reply.send(createReadStream(filePath));
      }

      const url = await getStreamUrl(id);
      return reply.redirect(url);
    },
  );

  /* Returns an HLS m3u8 manifest — ideal for desktop browsers and web players
   * that natively support HLS streaming. Uses player_skip=webpage,configs
   * internally to reduce YouTube fingerprinting. */
  app.get<{ Params: { id: string } }>(
    "/api/stream/:id/desktop",
    async (req, reply) => {
      const { id } = req.params;
      const validation = validateTrackId(id);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.reason });
      }
      logger.info({ id }, "Desktop stream request");
      const url = await getDesktopStreamUrl(id);
      return reply.redirect(url);
    },
  );
}
