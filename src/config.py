import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 3000
    host: str = "0.0.0.0"
    node_env: str = "development"

    yt_dlp_path: str = "yt-dlp"
    cache_dir: str = "./cache"

    rate_limit_max: int = 60
    rate_limit_window_ms: int = 60000

    yt_dlp_timeout_ms: int = 30000
    # Single proxy (legacy) — overridden by yt_dlp_proxy_list when set
    yt_dlp_proxy: str = ""
    # Comma-separated list of proxies in ip:port:user:pass format
    yt_dlp_proxy_list: str = ""
    # Path to Netscape cookies file (set via Render Secret File or baked into image)
    yt_dlp_cookies_path: str = (
        "/app/cookies.txt" if os.path.exists("/app/cookies.txt")
        else "./cookies.txt" if os.path.exists("./cookies.txt")
        else ""
    )

    max_query_length: int = 200

    model_config = {"env_prefix": ""}


settings = Settings()

