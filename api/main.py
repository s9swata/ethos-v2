import os
import sys
import signal
import logging
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes.downloader import router as downloader_router
from routes.music import router as music_router

LOG_DIR = os.path.expanduser("~/Library/Logs/ethos")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "sidecar.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("sidecar")

log.info("--- sidecar starting ---")
log.info("log file: %s", LOG_FILE)

app = FastAPI(docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(downloader_router, prefix="/download")
app.include_router(music_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = datetime.now()
    response = await call_next(request)
    elapsed = (datetime.now() - start).total_seconds()
    log.info("%s %s → %s (%.2fs)", request.method, request.url.path, response.status_code, elapsed)
    return response


def shutdown(sig, frame):
    log.info("shutting down (signal %s)", sig)
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    log.info("listening on 127.0.0.1:%s", port)
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
