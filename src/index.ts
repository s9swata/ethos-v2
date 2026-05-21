import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { searchRoutes } from "./routes/search.js";
import { trackRoutes } from "./routes/tracks.js";
import { streamRoutes } from "./routes/stream.js";
import { playlistRoutes } from "./routes/playlist.js";

const app = Fastify({ logger: false });

app.setErrorHandler(errorHandler);

await app.register(cors, { origin: true });

await app.register(rateLimit, {
  max: config.rateLimit.max,
  timeWindow: config.rateLimit.timeWindow,
});

app.get("/api/health", async () => ({ status: "ok", timestamp: Date.now() }));

await app.register(searchRoutes);
await app.register(trackRoutes);
await app.register(streamRoutes);
await app.register(playlistRoutes);

try {
  await app.listen({ port: config.port, host: config.host });
  logger.info({ port: config.port, host: config.host }, "Server started");
} catch (err) {
  logger.fatal(err, "Failed to start server");
  process.exit(1);
}
