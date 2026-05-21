import type { FastifyInstance } from "fastify";
import { search } from "../services/ytdlp.js";
import { validateQuery } from "../services/validate.js";
import { logger } from "../logger.js";

interface SearchQuery {
  q: string;
  limit?: string;
}

export async function searchRoutes(app: FastifyInstance) {
  app.get<{ Querystring: SearchQuery }>("/api/search", async (req, reply) => {
    const { q, limit } = req.query;

    const validation = validateQuery(q);
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.reason });
    }

    const l = Math.min(Math.max(Number(limit) || 10, 1), 50);
    logger.info({ query: q, limit: l }, "Search request");
    const results = await search(q, l);
    return reply.send({ results, count: results.length, query: q });
  });
}
