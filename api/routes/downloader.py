from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import yt_dlp

router = APIRouter()


class DownloadRequest(BaseModel):
    url: str
    output_dir: str
    format: str = "bestaudio/best"


class TrackRequest(BaseModel):
    url: str


@router.post("/")
def download(req: DownloadRequest):
    ydl_opts = {
        "format": req.format,
        "outtmpl": f"{req.output_dir}/%(title)s.%(ext)s",
        "quiet": True,
        "noplaylist": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=True)
            return {"title": info.get("title"), "status": "done"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/info")
def track_info(req: TrackRequest):
    ydl_opts = {
        "quiet": True,
        "no_download": True,
        "noplaylist": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
            best_url = info.get("url") or ""
            if not best_url:
                formats = info.get("formats") or []
                for f in reversed(formats):
                    if f.get("url") and ("audio only" in (f.get("format") or "") or f.get("vcodec") == "none"):
                        best_url = f["url"]
                        break
                if not best_url and formats:
                    best_url = formats[-1].get("url", "")
            return {
                "id": info.get("id"),
                "title": info.get("title", "Unknown"),
                "artist": info.get("uploader") or info.get("channel") or "Unknown",
                "duration": info.get("duration", 0),
                "url": best_url,
                "thumbnail": info.get("thumbnail") or "",
                "webpageUrl": info.get("webpage_url") or req.url,
                "directUrl": best_url,
                "formats": [
                    {"url": f.get("url"), "ext": f.get("ext"), "format": f.get("format"), "bitrate": f.get("tbr")}
                    for f in (info.get("formats") or [])[:50]
                ],
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
