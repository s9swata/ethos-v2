from __future__ import annotations

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
    yt_dlp_max_concurrent: int = 3
    queue_timeout_ms: int = 15000

    max_query_length: int = 200

    yt_dlp_clients: str = "android,ios,tv,web"
    yt_dlp_cookies_file: str = ""

    @property
    def yt_dlp_clients_list(self) -> list[str]:
        return [c.strip() for c in self.yt_dlp_clients.split(",") if c.strip()]

    model_config = {"env_prefix": ""}


settings = Settings()
