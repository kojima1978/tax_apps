"""
EasyOCR Integration - CPU-friendly alternative to PaddleOCR
For Docker environments without GPU support
"""
import easyocr
import numpy as np
from typing import List, Dict, Any, Optional
import logging
from config import settings
from preprocessing import ImagePreprocessor
import time

logger = logging.getLogger(__name__)


class PassbookOCREngine:
    """
    CPU-optimized OCR engine for Japanese bank passbooks
    Uses EasyOCR as a fallback when PaddleOCR is not available
    """

    def __init__(self):
        """Initialize EasyOCR with Japanese support"""
        self.preprocessor = ImagePreprocessor(
            max_dimension=settings.MAX_IMAGE_DIMENSION
        )

        try:
            # Initialize EasyOCR with Japanese and English support
            self.ocr = easyocr.Reader(
                ['ja', 'en'],
                gpu=False,
                verbose=settings.DEBUG
            )
            logger.info("EasyOCR initialized successfully (CPU mode)")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR: {str(e)}")
            raise

    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Process a single passbook page image

        Args:
            image_path: Path to the input image

        Returns:
            Dict containing OCR results, structured data, and metadata
        """
        start_time = time.time()

        try:
            # Load image
            from preprocessing import load_image
            image = load_image(image_path)
            if image is None:
                raise ValueError("Failed to load image")

            # Preprocess image
            processed_image, preprocess_metadata = self.preprocessor.process(image)

            # Run OCR
            ocr_result = self.ocr.readtext(processed_image)

            # Extract and structure results
            raw_boxes = []
            if ocr_result:
                for detection in ocr_result:
                    box = detection[0]  # Coordinates (4 points)
                    text = detection[1]  # Text
                    confidence = detection[2]  # Confidence score
                    raw_boxes.append({
                        "box": box,
                        "text": text,
                        "confidence": float(confidence)
                    })

            # Structure into passbook rows
            structured_data = self._structure_passbook_data(raw_boxes)

            processing_time = time.time() - start_time

            return {
                "success": True,
                "raw_ocr_result": raw_boxes,
                "structured_data": structured_data,
                "metadata": {
                    "processing_time": processing_time,
                    "preprocessing": preprocess_metadata,
                    "total_boxes": len(raw_boxes),
                    "confidence_avg": np.mean([b["confidence"] for b in raw_boxes]) if raw_boxes else 0.0
                }
            }

        except Exception as e:
            logger.error(f"OCR processing error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "processing_time": time.time() - start_time
            }

    def _structure_passbook_data(self, boxes: List[Dict]) -> List[Dict[str, Any]]:
        """
        Convert raw OCR boxes into structured passbook transaction rows

        Expected columns: Date | Description | Withdrawal | Deposit | Balance
        """
        if not boxes:
            return []

        # Sort boxes by Y-coordinate (top to bottom), then X-coordinate (left to right)
        sorted_boxes = sorted(boxes, key=lambda b: (b["box"][0][1], b["box"][0][0]))

        # Group boxes into rows based on Y-coordinate proximity
        rows = self._group_into_rows(sorted_boxes)

        # Parse each row into passbook columns
        transactions = []
        for row_boxes in rows:
            transaction = self._parse_row_to_transaction(row_boxes)
            if transaction:
                transactions.append(transaction)

        return transactions

    def _group_into_rows(self, boxes: List[Dict], y_threshold: int = 15) -> List[List[Dict]]:
        """Group boxes into rows based on Y-coordinate proximity"""
        if not boxes:
            return []

        rows = []
        current_row = [boxes[0]]
        current_y = boxes[0]["box"][0][1]

        for box in boxes[1:]:
            box_y = box["box"][0][1]

            if abs(box_y - current_y) <= y_threshold:
                current_row.append(box)
            else:
                rows.append(current_row)
                current_row = [box]
                current_y = box_y

        if current_row:
            rows.append(current_row)

        return rows

    def _parse_row_to_transaction(self, row_boxes: List[Dict]) -> Optional[Dict[str, Any]]:
        """Parse a row of boxes into a transaction record"""
        if not row_boxes:
            return None

        sorted_boxes = sorted(row_boxes, key=lambda b: b["box"][0][0])

        transaction = {
            "date": "",
            "description": "",
            "withdrawal": "",
            "deposit": "",
            "balance": "",
            "raw_texts": [b["text"] for b in sorted_boxes],
            "confidence_scores": [b["confidence"] for b in sorted_boxes],
            "confidence_avg": np.mean([b["confidence"] for b in sorted_boxes])
        }

        if len(sorted_boxes) >= 1:
            transaction["date"] = sorted_boxes[0]["text"]
        if len(sorted_boxes) >= 2:
            transaction["description"] = " ".join([b["text"] for b in sorted_boxes[1:-2]]) if len(sorted_boxes) > 3 else sorted_boxes[1]["text"]
        if len(sorted_boxes) >= 4:
            numeric_boxes = [b for b in sorted_boxes[-3:] if self._is_numeric(b["text"])]
            if len(numeric_boxes) >= 2:
                transaction["balance"] = numeric_boxes[-1]["text"]
                if len(numeric_boxes) >= 3:
                    transaction["withdrawal"] = numeric_boxes[-3]["text"]
                    transaction["deposit"] = numeric_boxes[-2]["text"]
                else:
                    transaction["deposit"] = numeric_boxes[-2]["text"]

        return transaction

    def _is_numeric(self, text: str) -> bool:
        """Check if text represents a number"""
        cleaned = text.replace(",", "").replace(".", "").replace("円", "").strip()
        return cleaned.isdigit() or (cleaned.startswith("-") and cleaned[1:].isdigit())


# Singleton instance
_ocr_engine_instance: Optional[PassbookOCREngine] = None


def get_ocr_engine() -> PassbookOCREngine:
    """Get or create the OCR engine singleton"""
    global _ocr_engine_instance
    if _ocr_engine_instance is None:
        _ocr_engine_instance = PassbookOCREngine()
    return _ocr_engine_instance
