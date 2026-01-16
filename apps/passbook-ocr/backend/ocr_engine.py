"""
PaddleOCR 3.3.x / PP-OCRv5 Integration
Optimized for NVIDIA RTX 3060 with GPU acceleration
"""
from paddleocr import PaddleOCR
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
from config import settings
from preprocessing import ImagePreprocessor
import time

logger = logging.getLogger(__name__)


class PassbookOCREngine:
    """
    High-performance OCR engine for Japanese bank passbooks
    Uses PP-OCRv5 with RTX 3060 optimizations
    """

    def __init__(self):
        """Initialize PaddleOCR with optimized settings"""
        self.preprocessor = ImagePreprocessor(
            max_dimension=settings.MAX_IMAGE_DIMENSION
        )

        # Initialize PP-OCRv5 with GPU support
        try:
            self.ocr = PaddleOCR(
                use_angle_cls=settings.OCR_USE_ANGLE_CLS,
                lang=settings.OCR_LANG,  # 'ch' for PP-OCRv5 unified model
                use_gpu=settings.OCR_USE_GPU,
                gpu_mem=settings.OCR_GPU_MEM,
                rec_batch_num=settings.OCR_REC_BATCH_NUM,
                drop_score=settings.OCR_DROP_SCORE,
                use_space_char=settings.OCR_USE_SPACE_CHAR,
                use_mp=settings.OCR_USE_MP,
                total_process_num=settings.OCR_TOTAL_PROCESS_NUM,
                det_model_dir=settings.OCR_DET_MODEL_DIR,
                rec_model_dir=settings.OCR_REC_MODEL_DIR,
                cls_model_dir=settings.OCR_CLS_MODEL_DIR,
                show_log=settings.DEBUG,
            )
            logger.info("PaddleOCR initialized successfully with PP-OCRv5")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {str(e)}")
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
            ocr_result = self.ocr.ocr(processed_image, cls=settings.OCR_USE_ANGLE_CLS)

            # Extract and structure results
            raw_boxes = []
            if ocr_result and ocr_result[0]:
                for line in ocr_result[0]:
                    box = line[0]  # Coordinates
                    text_info = line[1]  # (text, confidence)
                    raw_boxes.append({
                        "box": box,
                        "text": text_info[0],
                        "confidence": float(text_info[1])
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

        Args:
            boxes: List of OCR detection boxes with text and coordinates

        Returns:
            List of structured transaction rows
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
        """
        Group boxes into rows based on Y-coordinate proximity

        Args:
            boxes: Sorted list of boxes
            y_threshold: Maximum Y-distance to consider boxes in the same row

        Returns:
            List of rows, where each row is a list of boxes
        """
        if not boxes:
            return []

        rows = []
        current_row = [boxes[0]]
        current_y = boxes[0]["box"][0][1]  # Y-coordinate of first point

        for box in boxes[1:]:
            box_y = box["box"][0][1]

            if abs(box_y - current_y) <= y_threshold:
                # Same row
                current_row.append(box)
            else:
                # New row
                rows.append(current_row)
                current_row = [box]
                current_y = box_y

        # Add last row
        if current_row:
            rows.append(current_row)

        return rows

    def _parse_row_to_transaction(self, row_boxes: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        Parse a row of boxes into a transaction record

        Expected structure: Date | Description | Withdrawal | Deposit | Balance

        Args:
            row_boxes: List of boxes in the same row (sorted left to right)

        Returns:
            Transaction dict or None if row is invalid
        """
        if not row_boxes:
            return None

        # Sort boxes left to right
        sorted_boxes = sorted(row_boxes, key=lambda b: b["box"][0][0])

        # Initialize transaction fields
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

        # Simple heuristic column assignment based on X-position
        # This is a basic implementation; real-world scenarios need learned patterns
        if len(sorted_boxes) >= 1:
            transaction["date"] = sorted_boxes[0]["text"]
        if len(sorted_boxes) >= 2:
            transaction["description"] = " ".join([b["text"] for b in sorted_boxes[1:-2]]) if len(sorted_boxes) > 3 else sorted_boxes[1]["text"]
        if len(sorted_boxes) >= 4:
            # Try to identify numeric fields (withdrawal, deposit, balance)
            numeric_boxes = [b for b in sorted_boxes[-3:] if self._is_numeric(b["text"])]
            if len(numeric_boxes) >= 2:
                transaction["balance"] = numeric_boxes[-1]["text"]
                # Second-to-last could be deposit or withdrawal
                if len(numeric_boxes) >= 3:
                    transaction["withdrawal"] = numeric_boxes[-3]["text"]
                    transaction["deposit"] = numeric_boxes[-2]["text"]
                else:
                    # Ambiguous - could be either
                    transaction["deposit"] = numeric_boxes[-2]["text"]

        return transaction

    def _is_numeric(self, text: str) -> bool:
        """Check if text represents a number (with possible commas/dots)"""
        cleaned = text.replace(",", "").replace(".", "").replace("円", "").strip()
        return cleaned.isdigit() or (cleaned.startswith("-") and cleaned[1:].isdigit())


class LayoutAnalyzer:
    """
    Advanced layout analysis for complex passbook structures
    Phase 2: Integration with YomiToku or PaddleOCR-VL
    """

    def __init__(self, engine: str = "paddleocr_vl"):
        self.engine = engine
        logger.info(f"LayoutAnalyzer initialized with engine: {engine}")

    def analyze_structure(self, image_path: str) -> Dict[str, Any]:
        """
        Analyze document structure and table layout

        Args:
            image_path: Path to the input image

        Returns:
            Dict containing structural information (columns, rows, cells)
        """
        # Placeholder for Phase 2 implementation
        # Will integrate with YomiToku or PaddleOCR-VL for complex layouts
        logger.warning("Layout analysis not yet implemented (Phase 2)")
        return {
            "detected_columns": [],
            "detected_rows": [],
            "table_structure": None
        }


# Singleton instance
_ocr_engine_instance: Optional[PassbookOCREngine] = None


def get_ocr_engine() -> PassbookOCREngine:
    """Get or create the OCR engine singleton"""
    global _ocr_engine_instance
    if _ocr_engine_instance is None:
        _ocr_engine_instance = PassbookOCREngine()
    return _ocr_engine_instance
