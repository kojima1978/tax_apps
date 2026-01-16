"""
Database models and connection management
SQLite-based storage for sessions, results, and learning patterns
"""
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
)
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
from config import settings

Base = declarative_base()


class PassbookSession(Base):
    """Processing session management"""
    __tablename__ = "passbook_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), unique=True, index=True)
    bank_name = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String(20), default="processing")  # processing, completed, error
    total_pages = Column(Integer, default=0)

    pages = relationship("PassbookPage", back_populates="session", cascade="all, delete-orphan")


class PassbookPage(Base):
    """OCR results and corrections for each page"""
    __tablename__ = "passbook_pages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("passbook_sessions.session_id"))
    page_number = Column(Integer)
    image_path = Column(String(500))

    # OCR Results
    raw_ocr_result = Column(JSON)  # Original PaddleOCR output
    processed_data = Column(JSON)  # Structured transaction data
    corrected_data = Column(JSON)  # User-corrected data

    # Metadata
    processing_time = Column(Float)  # seconds
    confidence_score = Column(Float)
    resolution = Column(String(20))  # e.g., "1200x800"

    # Validation Status
    validation_status = Column(String(20), default="pending")  # pending, valid, invalid
    validation_errors = Column(JSON)  # List of error objects

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("PassbookSession", back_populates="pages")
    audit_logs = relationship("AuditLog", back_populates="page", cascade="all, delete-orphan")


class CorrectionPattern(Base):
    """Learning system: bank-specific layout patterns"""
    __tablename__ = "correction_patterns"

    id = Column(Integer, primary_key=True, index=True)
    bank_name = Column(String(100), index=True)
    resolution_range = Column(String(50))  # e.g., "1000-1500"

    # Layout Configuration
    column_boundaries = Column(JSON)  # List of x-coordinates for column splits
    row_height_avg = Column(Float)
    has_seal = Column(Boolean, default=True)  # Whether seal removal is needed

    # Recognition Patterns
    date_format = Column(String(50))  # e.g., "YYYY/MM/DD", "MM.DD"
    amount_position = Column(String(20))  # "left", "right", "center"

    # Statistics
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    last_used = Column(DateTime, default=datetime.utcnow)

    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    """Manual correction history"""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("passbook_pages.id"))

    row_index = Column(Integer)
    column_name = Column(String(50))
    old_value = Column(String(500))
    new_value = Column(String(500))
    correction_type = Column(String(50))  # manual, suggestion_accepted, auto_split, etc.

    timestamp = Column(DateTime, default=datetime.utcnow)

    page = relationship("PassbookPage", back_populates="audit_logs")


# Database engine and session
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency for FastAPI routes"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
