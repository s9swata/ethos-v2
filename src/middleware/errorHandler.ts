import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { logger } from "../logger.js";

export function errorHandler(
  error: FastifyError & { name?: string },
  _req: FastifyRequest,
  reply: FastifyReply,
) {
  logger.error({ err: error.message, code: error.statusCode, name: error.name }, "Request error");

  if (error.validation) {
    return reply.status(400).send({ error: "Validation failed", details: error.validation });
  }

  if (error.name === "YtDlpTimeoutError") {
    return reply.status(504).send({ error: "Upstream timed out" });
  }

  if (error.name === "YtDlpError") {
    return reply.status(502).send({ error: "Upstream service error" });
  }

  const status = error.statusCode ?? 500;
  const message = status === 500 ? "Internal server error" : error.message;
  return reply.status(status).send({ error: message });
}
