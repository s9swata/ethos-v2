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
    yt_dlp_clients: str = "android,ios,tv,web"

    yt_dlp_proxy: str = ""
    yt_dlp_proxy_list: str = ""
    yt_dlp_cookies_path: str = ""

    max_query_length: int = 200

    model_config = {"env_prefix": ""}


settings = Settings()
