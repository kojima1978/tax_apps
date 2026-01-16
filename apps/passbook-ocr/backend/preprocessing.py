"""
Advanced Image Preprocessing Pipeline
Optimized for Japanese bank passbook recognition
"""
import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """
    High-quality preprocessing pipeline for passbook images
    Handles seal removal, noise reduction, deskewing, and optimization
    """

    def __init__(self, max_dimension: int = 2000):
        self.max_dimension = max_dimension

    def process(self, image: np.ndarray) -> Tuple[np.ndarray, dict]:
        """
        Main preprocessing pipeline

        Returns:
            Tuple[np.ndarray, dict]: Processed image and metadata
        """
        metadata = {
            "original_shape": image.shape,
            "steps_applied": []
        }

        try:
            # Step 1: Remove red seals/stamps
            image, seal_removed = self._remove_red_seal(image)
            if seal_removed:
                metadata["steps_applied"].append("seal_removal")

            # Step 2: Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                metadata["steps_applied"].append("grayscale")
            else:
                gray = image

            # Step 3: Noise reduction
            denoised = self._reduce_noise(gray)
            metadata["steps_applied"].append("denoise")

            # Step 4: Enhance dot-matrix printing
            enhanced = self._enhance_dot_matrix(denoised)
            metadata["steps_applied"].append("dot_enhancement")

            # Step 5: Deskew (straighten rotated images)
            deskewed, angle = self._deskew(enhanced)
            if abs(angle) > 0.5:
                metadata["steps_applied"].append(f"deskew_{angle:.2f}deg")

            # Step 6: Binarization with adaptive thresholding
            binary = self._adaptive_threshold(deskewed)
            metadata["steps_applied"].append("binarization")

            # Step 7: Resize to optimal dimension
            resized = self._resize_optimal(binary)
            metadata["final_shape"] = resized.shape
            metadata["steps_applied"].append("resize")

            return resized, metadata

        except Exception as e:
            logger.error(f"Preprocessing error: {str(e)}")
            # Return original image on error
            return image, {"error": str(e)}

    def _remove_red_seal(self, image: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        Remove red seals/stamps using HSV color space filtering

        Returns:
            Tuple[np.ndarray, bool]: Processed image and whether seal was detected
        """
        if len(image.shape) != 3:
            return image, False

        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Define red color range in HSV (two ranges for red hue wrap-around)
        lower_red1 = np.array([0, 70, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 70, 50])
        upper_red2 = np.array([180, 255, 255])

        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = cv2.bitwise_or(mask1, mask2)

        # Dilate to cover entire seal area
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        red_mask = cv2.dilate(red_mask, kernel, iterations=2)

        # Replace red areas with white
        result = image.copy()
        result[red_mask > 0] = [255, 255, 255]

        seal_detected = np.sum(red_mask > 0) > 100  # At least 100 red pixels

        return result, seal_detected

    def _reduce_noise(self, gray: np.ndarray) -> np.ndarray:
        """Remove noise using median blur"""
        return cv2.medianBlur(gray, 3)

    def _enhance_dot_matrix(self, gray: np.ndarray) -> np.ndarray:
        """
        Enhance dot-matrix printing using morphological operations
        Closes gaps in characters printed with dots
        """
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        closed = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel, iterations=1)
        return closed

    def _deskew(self, gray: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Detect and correct image rotation using Hough line transform

        Returns:
            Tuple[np.ndarray, float]: Deskewed image and rotation angle
        """
        # Edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Detect lines using Hough transform
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=100,
            minLineLength=100,
            maxLineGap=10
        )

        if lines is None or len(lines) < 3:
            return gray, 0.0

        # Calculate angles of detected lines
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 - x1 == 0:
                continue
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            # Normalize to [-45, 45] range
            if angle < -45:
                angle += 90
            elif angle > 45:
                angle -= 90
            angles.append(angle)

        if not angles:
            return gray, 0.0

        # Use median angle for robustness
        median_angle = np.median(angles)

        # Only rotate if angle is significant
        if abs(median_angle) < 0.5:
            return gray, 0.0

        # Rotate image
        h, w = gray.shape
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(
            gray, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=255
        )

        return rotated, median_angle

    def _adaptive_threshold(self, gray: np.ndarray) -> np.ndarray:
        """
        Apply adaptive thresholding for binarization
        Works better than global threshold for uneven lighting
        """
        binary = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=15,
            C=10
        )
        return binary

    def _resize_optimal(self, image: np.ndarray) -> np.ndarray:
        """
        Resize image to optimal dimensions for OCR
        Maintains aspect ratio, scales down if too large
        """
        h, w = image.shape[:2]
        max_dim = max(h, w)

        if max_dim <= self.max_dimension:
            return image

        scale = self.max_dimension / max_dim
        new_w = int(w * scale)
        new_h = int(h * scale)

        resized = cv2.resize(
            image,
            (new_w, new_h),
            interpolation=cv2.INTER_AREA
        )

        return resized


def load_image(file_path: str) -> Optional[np.ndarray]:
    """Load image from file path"""
    try:
        image = cv2.imread(file_path)
        if image is None:
            raise ValueError(f"Failed to load image: {file_path}")
        return image
    except Exception as e:
        logger.error(f"Error loading image: {str(e)}")
        return None


def save_image(image: np.ndarray, file_path: str, quality: int = 95) -> bool:
    """Save image to file path"""
    try:
        if len(image.shape) == 2:  # Grayscale
            pil_image = Image.fromarray(image, mode='L')
        else:  # Color
            pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

        pil_image.save(file_path, quality=quality, optimize=True)
        return True
    except Exception as e:
        logger.error(f"Error saving image: {str(e)}")
        return False
