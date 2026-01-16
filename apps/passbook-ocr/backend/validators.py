"""
Validation System: Balance checking and data integrity
Real-time validation with learning capabilities
"""
from typing import List, Dict, Any, Optional, Tuple
import re
from datetime import datetime
from dateutil import parser as date_parser
import logging

logger = logging.getLogger(__name__)


class TransactionValidator:
    """
    Validates passbook transactions for data integrity
    Performs balance calculations and error detection
    """

    def __init__(self, tolerance: float = 1.0):
        """
        Args:
            tolerance: Acceptable difference in balance calculations (yen)
        """
        self.tolerance = tolerance

    def validate_transactions(
        self,
        transactions: List[Dict[str, Any]],
        initial_balance: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Validate a list of transactions

        Args:
            transactions: List of transaction dicts
            initial_balance: Starting balance (if known)

        Returns:
            Dict containing validation results and errors
        """
        errors = []
        warnings = []
        running_balance = initial_balance

        for idx, txn in enumerate(transactions):
            txn_errors = self._validate_single_transaction(
                txn, idx, running_balance
            )

            if txn_errors:
                errors.extend(txn_errors)

            # Update running balance if calculation is possible
            try:
                withdrawal = self._parse_amount(txn.get("withdrawal", ""))
                deposit = self._parse_amount(txn.get("deposit", ""))
                stated_balance = self._parse_amount(txn.get("balance", ""))

                if running_balance is not None and (withdrawal or deposit):
                    calculated_balance = running_balance - (withdrawal or 0) + (deposit or 0)

                    if stated_balance is not None:
                        diff = abs(calculated_balance - stated_balance)
                        if diff > self.tolerance:
                            errors.append({
                                "row": idx,
                                "type": "balance_mismatch",
                                "severity": "error",
                                "message": f"Balance mismatch: calculated {calculated_balance:,.0f}, stated {stated_balance:,.0f}",
                                "difference": diff,
                                "field": "balance"
                            })
                        elif diff > 0:
                            warnings.append({
                                "row": idx,
                                "type": "minor_balance_diff",
                                "severity": "warning",
                                "message": f"Minor balance difference: {diff} yen",
                                "field": "balance"
                            })

                        running_balance = stated_balance
                    else:
                        running_balance = calculated_balance

            except Exception as e:
                logger.debug(f"Balance calculation error at row {idx}: {str(e)}")

        # Check for low confidence scores
        for idx, txn in enumerate(transactions):
            avg_confidence = txn.get("confidence_avg", 1.0)
            if avg_confidence < 0.7:
                warnings.append({
                    "row": idx,
                    "type": "low_confidence",
                    "severity": "warning",
                    "message": f"Low OCR confidence: {avg_confidence:.2%}",
                    "confidence": avg_confidence
                })

        return {
            "is_valid": len(errors) == 0,
            "total_errors": len(errors),
            "total_warnings": len(warnings),
            "errors": errors,
            "warnings": warnings
        }

    def _validate_single_transaction(
        self,
        txn: Dict[str, Any],
        row_idx: int,
        previous_balance: Optional[float]
    ) -> List[Dict[str, Any]]:
        """Validate a single transaction record"""
        errors = []

        # Validate date format
        date_str = txn.get("date", "").strip()
        if date_str:
            if not self._is_valid_date(date_str):
                errors.append({
                    "row": row_idx,
                    "type": "invalid_date",
                    "severity": "error",
                    "message": f"Invalid date format: {date_str}",
                    "field": "date"
                })

        # Validate that at least one amount field is present
        has_withdrawal = bool(txn.get("withdrawal", "").strip())
        has_deposit = bool(txn.get("deposit", "").strip())
        has_balance = bool(txn.get("balance", "").strip())

        if not (has_withdrawal or has_deposit or has_balance):
            errors.append({
                "row": row_idx,
                "type": "missing_amounts",
                "severity": "error",
                "message": "No amount fields detected",
                "field": "amounts"
            })

        # Validate numeric formats
        for field in ["withdrawal", "deposit", "balance"]:
            value = txn.get(field, "").strip()
            if value and not self._is_valid_amount(value):
                errors.append({
                    "row": row_idx,
                    "type": "invalid_amount_format",
                    "severity": "error",
                    "message": f"Invalid {field} format: {value}",
                    "field": field
                })

        return errors

    def _is_valid_date(self, date_str: str) -> bool:
        """Check if string represents a valid date"""
        if not date_str:
            return False

        # Common Japanese date formats
        patterns = [
            r"^\d{4}[/-年]\d{1,2}[/-月]\d{1,2}日?$",  # 2024/01/15 or 2024年1月15日
            r"^\d{1,2}[/-]\d{1,2}$",  # 01/15 or 1-15
            r"^[RSHM]\d{1,2}\.\d{1,2}\.\d{1,2}$",  # R06.01.15 (Reiwa era)
        ]

        for pattern in patterns:
            if re.match(pattern, date_str):
                return True

        # Try parsing with dateutil
        try:
            date_parser.parse(date_str, fuzzy=False)
            return True
        except:
            return False

    def _is_valid_amount(self, amount_str: str) -> bool:
        """Check if string represents a valid monetary amount"""
        if not amount_str:
            return False

        # Remove common formatting characters
        cleaned = amount_str.replace(",", "").replace("円", "").replace(" ", "")

        # Check if it's a valid number
        try:
            float(cleaned)
            return True
        except ValueError:
            return False

    def _parse_amount(self, amount_str: str) -> Optional[float]:
        """Parse amount string to float"""
        if not amount_str:
            return None

        try:
            cleaned = amount_str.replace(",", "").replace("円", "").replace(" ", "")
            return float(cleaned)
        except ValueError:
            return None


class SmartSuggester:
    """
    Intelligent suggestion system based on historical corrections
    Learns common OCR errors and suggests fixes
    """

    def __init__(self):
        self.correction_map: Dict[str, Dict[str, int]] = {}
        # Common OCR misrecognitions (pre-loaded patterns)
        self.common_fixes = {
            "キユウヨ": "給与",
            "キュウヨ": "給与",
            "デンキ": "電気",
            "ガス": "ガス",
            "スイドウ": "水道",
            "ヤチン": "家賃",
            "テスウリョウ": "手数料",
            "フリコミ": "振込",
            "インカ": "引出",
            "アズカリ": "預入",
        }

    def get_suggestion(self, text: str, context: Dict[str, Any]) -> Optional[str]:
        """
        Get correction suggestion for OCR text

        Args:
            text: Original OCR text
            context: Additional context (bank_name, field_name, etc.)

        Returns:
            Suggested correction or None
        """
        # Check common fixes first
        if text in self.common_fixes:
            return self.common_fixes[text]

        # Check learned corrections
        bank_name = context.get("bank_name", "")
        field_name = context.get("field", "")
        key = f"{bank_name}:{field_name}:{text}"

        if key in self.correction_map:
            # Return most frequent correction
            corrections = self.correction_map[key]
            if corrections:
                return max(corrections, key=corrections.get)

        return None

    def learn_correction(
        self,
        original: str,
        correction: str,
        context: Dict[str, Any]
    ):
        """
        Learn from a user correction

        Args:
            original: Original OCR text
            correction: User's correction
            context: Context information
        """
        bank_name = context.get("bank_name", "")
        field_name = context.get("field", "")
        key = f"{bank_name}:{field_name}:{original}"

        if key not in self.correction_map:
            self.correction_map[key] = {}

        if correction not in self.correction_map[key]:
            self.correction_map[key][correction] = 0

        self.correction_map[key][correction] += 1

        logger.info(f"Learned correction: '{original}' -> '{correction}' (context: {field_name})")


class BalanceReconciler:
    """
    Advanced balance reconciliation system
    Suggests fixes for balance mismatches
    """

    def __init__(self):
        pass

    def suggest_fixes(
        self,
        transactions: List[Dict[str, Any]],
        error_row: int,
        difference: float
    ) -> List[Dict[str, Any]]:
        """
        Suggest possible fixes for balance mismatch

        Args:
            transactions: List of all transactions
            error_row: Row index with the error
            difference: Amount of mismatch

        Returns:
            List of suggested fixes
        """
        suggestions = []

        if error_row >= len(transactions):
            return suggestions

        error_txn = transactions[error_row]

        # Suggestion 1: Difference could be a missing withdrawal
        suggestions.append({
            "type": "add_withdrawal",
            "description": f"Add withdrawal of {difference:,.0f} yen",
            "action": {
                "row": error_row,
                "field": "withdrawal",
                "value": f"{difference:,.0f}"
            }
        })

        # Suggestion 2: Difference could be a missing deposit
        suggestions.append({
            "type": "add_deposit",
            "description": f"Add deposit of {difference:,.0f} yen",
            "action": {
                "row": error_row,
                "field": "deposit",
                "value": f"{difference:,.0f}"
            }
        })

        # Suggestion 3: OCR might have misread a digit
        for field in ["withdrawal", "deposit", "balance"]:
            value = error_txn.get(field, "")
            if value:
                suggested_value = self._suggest_digit_fix(value, difference)
                if suggested_value and suggested_value != value:
                    suggestions.append({
                        "type": "fix_digit",
                        "description": f"Change {field} from {value} to {suggested_value}",
                        "action": {
                            "row": error_row,
                            "field": field,
                            "value": suggested_value
                        }
                    })

        return suggestions[:3]  # Return top 3 suggestions

    def _suggest_digit_fix(self, original: str, difference: float) -> Optional[str]:
        """Suggest a digit-level fix for OCR error"""
        try:
            original_num = float(original.replace(",", ""))
            # Try adding/subtracting the difference
            candidates = [
                original_num + difference,
                original_num - difference,
            ]

            # Return the most plausible candidate
            for candidate in candidates:
                if candidate >= 0:
                    return f"{candidate:,.0f}"

        except ValueError:
            pass

        return None
