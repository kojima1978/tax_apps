"""
FastAPI Main Application
REST API for Passbook OCR Processing
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import os
import shutil
from pathlib import Path
from typing import List, Optional
import logging

from config import settings
from database import init_db, get_db, PassbookSession, PassbookPage, CorrectionPattern, AuditLog
# Select OCR engine based on environment variable
if os.environ.get('OCR_ENGINE') == 'easyocr':
    from ocr_engine_cpu import get_ocr_engine
else:
    from ocr_engine import get_ocr_engine
from validators import TransactionValidator, SmartSuggester
from pydantic import BaseModel

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Localhost-only passbook OCR system with PaddleOCR 3.3.x (PP-OCRv5)"
)

# CORS middleware (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
validator = TransactionValidator(tolerance=settings.BALANCE_TOLERANCE)
suggester = SmartSuggester()

# Upload directory
UPLOAD_DIR = Path("./data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# Pydantic models for API
class SessionCreate(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None


class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    withdrawal: Optional[str] = None
    deposit: Optional[str] = None
    balance: Optional[str] = None


class CorrectionRequest(BaseModel):
    page_id: int
    row_index: int
    column_name: str
    old_value: str
    new_value: str


@app.on_event("startup")
async def startup_event():
    """Initialize database and OCR engine on startup"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"GPU: {'Enabled' if settings.OCR_USE_GPU else 'Disabled'}")

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    # Warm up OCR engine
    try:
        get_ocr_engine()
        logger.info("OCR engine initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize OCR engine: {str(e)}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "gpu_enabled": settings.OCR_USE_GPU
    }


@app.post("/api/sessions")
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new processing session"""
    session_id = str(uuid.uuid4())

    db_session = PassbookSession(
        session_id=session_id,
        bank_name=session_data.bank_name,
        account_number=session_data.account_number,
        status="processing"
    )

    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)

    return {
        "session_id": session_id,
        "status": "created"
    }


@app.post("/api/sessions/{session_id}/upload")
async def upload_page(
    session_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and process a passbook page image

    Returns OCR results, validation status, and suggestions
    """
    # Validate session exists
    result = await db.execute(
        select(PassbookSession).where(PassbookSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    try:
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{session_id}_{file_id}{file_ext}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process with OCR
        ocr_engine = get_ocr_engine()
        ocr_result = ocr_engine.process_image(str(file_path))

        if not ocr_result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=f"OCR processing failed: {ocr_result.get('error')}"
            )

        # Validate transactions
        transactions = ocr_result["structured_data"]
        validation_result = validator.validate_transactions(transactions)

        # Save to database
        page_number = session.total_pages + 1
        db_page = PassbookPage(
            session_id=session_id,
            page_number=page_number,
            image_path=str(file_path),
            raw_ocr_result=ocr_result["raw_ocr_result"],
            processed_data=transactions,
            corrected_data=None,
            processing_time=ocr_result["metadata"]["processing_time"],
            confidence_score=ocr_result["metadata"]["confidence_avg"],
            resolution=f"{file.size}",
            validation_status="valid" if validation_result["is_valid"] else "invalid",
            validation_errors=validation_result["errors"] + validation_result["warnings"]
        )

        db.add(db_page)
        session.total_pages = page_number
        await db.commit()
        await db.refresh(db_page)

        return {
            "page_id": db_page.id,
            "page_number": page_number,
            "ocr_result": ocr_result,
            "validation": validation_result,
            "processing_time": ocr_result["metadata"]["processing_time"]
        }

    except Exception as e:
        logger.error(f"Upload/processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sessions/{session_id}/pages")
async def get_session_pages(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all pages for a session"""
    result = await db.execute(
        select(PassbookPage)
        .where(PassbookPage.session_id == session_id)
        .order_by(PassbookPage.page_number)
    )
    pages = result.scalars().all()

    return {
        "session_id": session_id,
        "total_pages": len(pages),
        "pages": [
            {
                "page_id": page.id,
                "page_number": page.page_number,
                "validation_status": page.validation_status,
                "error_count": len([e for e in page.validation_errors if e.get("severity") == "error"]) if page.validation_errors else 0,
                "warning_count": len([e for e in page.validation_errors if e.get("severity") == "warning"]) if page.validation_errors else 0
            }
            for page in pages
        ]
    }


@app.get("/api/pages/{page_id}")
async def get_page_details(
    page_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information for a specific page"""
    result = await db.execute(
        select(PassbookPage).where(PassbookPage.id == page_id)
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    return {
        "page_id": page.id,
        "page_number": page.page_number,
        "image_path": page.image_path,
        "transactions": page.corrected_data or page.processed_data,
        "validation_status": page.validation_status,
        "validation_errors": page.validation_errors,
        "confidence_score": page.confidence_score,
        "processing_time": page.processing_time
    }


@app.post("/api/pages/{page_id}/correct")
async def save_correction(
    page_id: int,
    correction: CorrectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Save a manual correction and learn from it

    Updates the corrected_data field and logs the correction
    """
    result = await db.execute(
        select(PassbookPage).where(PassbookPage.id == page_id)
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Get current data
    current_data = page.corrected_data or page.processed_data

    if correction.row_index >= len(current_data):
        raise HTTPException(status_code=400, detail="Invalid row index")

    # Update the specific field
    current_data[correction.row_index][correction.column_name] = correction.new_value

    # Save corrected data
    page.corrected_data = current_data

    # Log the correction
    audit_log = AuditLog(
        page_id=page_id,
        row_index=correction.row_index,
        column_name=correction.column_name,
        old_value=correction.old_value,
        new_value=correction.new_value,
        correction_type="manual"
    )
    db.add(audit_log)

    # Learn from the correction
    result = await db.execute(
        select(PassbookSession).where(PassbookSession.session_id == page.session_id)
    )
    session = result.scalar_one_or_none()

    if session and session.bank_name:
        suggester.learn_correction(
            correction.old_value,
            correction.new_value,
            {
                "bank_name": session.bank_name,
                "field": correction.column_name
            }
        )

    # Re-validate after correction
    validation_result = validator.validate_transactions(current_data)
    page.validation_status = "valid" if validation_result["is_valid"] else "invalid"
    page.validation_errors = validation_result["errors"] + validation_result["warnings"]

    await db.commit()

    return {
        "success": True,
        "validation": validation_result
    }


@app.get("/api/pages/{page_id}/image")
async def get_page_image(page_id: int, db: AsyncSession = Depends(get_db)):
    """Serve the processed image for a page"""
    result = await db.execute(
        select(PassbookPage).where(PassbookPage.id == page_id)
    )
    page = result.scalar_one_or_none()

    if not page or not os.path.exists(page.image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(page.image_path)


@app.get("/api/pages/{page_id}/suggestions")
async def get_suggestions(
    page_id: int,
    row_index: int,
    field: str,
    db: AsyncSession = Depends(get_db)
):
    """Get smart suggestions for a field"""
    result = await db.execute(
        select(PassbookPage).where(PassbookPage.id == page_id)
    )
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    current_data = page.corrected_data or page.processed_data

    if row_index >= len(current_data):
        raise HTTPException(status_code=400, detail="Invalid row index")

    original_text = current_data[row_index].get(field, "")

    # Get session for context
    result = await db.execute(
        select(PassbookSession).where(PassbookSession.session_id == page.session_id)
    )
    session = result.scalar_one_or_none()

    suggestion = suggester.get_suggestion(
        original_text,
        {
            "bank_name": session.bank_name if session else "",
            "field": field
        }
    )

    return {
        "has_suggestion": suggestion is not None,
        "suggestion": suggestion
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
