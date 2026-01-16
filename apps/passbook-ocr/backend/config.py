"""
Configuration for Passbook OCR Backend
Optimized for NVIDIA RTX 3060 (12GB VRAM)
"""
from pydantic_settings import BaseSettings
from typing import Literal, Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Passbook OCR Pro"
    VERSION: str = "3.1.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/passbook.db"

    # OCR Settings - PP-OCRv5 Configuration
    OCR_USE_GPU: bool = True
    OCR_GPU_MEM: int = 8000  # 8GB for PaddleOCR (out of 12GB total)
    OCR_LANG: str = "ch"  # PP-OCRv5 unified model (Chinese-Japanese-English)
    OCR_DET_MODEL_DIR: Optional[str] = None  # Use default PP-OCRv5 detection model
    OCR_REC_MODEL_DIR: Optional[str] = None  # Use default PP-OCRv5 recognition model
    OCR_CLS_MODEL_DIR: Optional[str] = None  # Use default classifier

    # Performance Optimization for RTX 3060
    OCR_REC_BATCH_NUM: int = 6  # Optimal batch size for RTX 3060
    OCR_USE_ANGLE_CLS: bool = True
    OCR_USE_SPACE_CHAR: bool = True
    OCR_DROP_SCORE: float = 0.3  # Confidence threshold
    OCR_USE_MP: bool = True  # Multi-processing
    OCR_TOTAL_PROCESS_NUM: int = 2

    # Mixed Precision (FP16) for faster inference
    OCR_PRECISION: Literal["fp32", "fp16", "int8"] = "fp16"

    # Image Preprocessing
    MAX_IMAGE_DIMENSION: int = 2000  # Resize longer edge to this
    PREPROCESSING_QUALITY: int = 95  # JPEG quality for internal processing

    # Advanced Layout Analysis (Phase 2)
    USE_LAYOUT_ANALYSIS: bool = False  # Enable for complex passbooks
    LAYOUT_ENGINE: Literal["yomitoku", "paddleocr_vl"] = "paddleocr_vl"

    # Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".bmp", ".tiff"}

    # Validation
    ENABLE_BALANCE_VALIDATION: bool = True
    BALANCE_TOLERANCE: float = 1.0  # Allow ±1 yen difference

    # Learning System
    ENABLE_PATTERN_LEARNING: bool = True
    MIN_CORRECTION_CONFIDENCE: float = 0.7

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
