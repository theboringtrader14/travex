from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_port: int = 8004
    database_url: str = "postgresql+asyncpg://staax:staax_password@127.0.0.1:5432/travex_db"
    allowed_origins: list[str] = ["http://localhost:3004", "https://travex.lifexos.co.in"]
    google_ai_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
