import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str
    GROQ_MODEL: str = "qwen/qwen3.6-27b"
    AI_SERVICE_PORT: int = 8000
    TESSERACT_CMD: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    POPPLER_PATH: str = r"C:\poppler-26.02.0\Library\bin"

    class Config:
        env_file = ".env"

settings = Settings()
