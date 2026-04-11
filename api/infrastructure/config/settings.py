from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://myfinance:myfinance@db:5432/myfinance"
    environment: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
