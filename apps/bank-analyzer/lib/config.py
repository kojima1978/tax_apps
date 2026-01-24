"""
設定管理モジュール

設定の優先順位: 環境変数 > ユーザー設定ファイル > デフォルト値
"""
import os
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# パス設定
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CONFIG_FILE = Path(DATA_DIR) / "user_settings.json"

os.makedirs(DATA_DIR, exist_ok=True)


def load_user_settings() -> dict:
    """ユーザー設定ファイルから設定を読み込む"""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.warning(f"設定ファイルの解析に失敗しました: {e}")
            return {}
        except OSError as e:
            logger.warning(f"設定ファイルの読み込みに失敗しました: {e}")
            return {}
    return {}


user_settings = load_user_settings()

# 閾値設定
LARGE_AMOUNT_THRESHOLD = int(os.getenv(
    "LARGE_AMOUNT_THRESHOLD",
    user_settings.get("LARGE_AMOUNT_THRESHOLD", 50_000)
))

TRANSFER_DAYS_WINDOW = int(os.getenv(
    "TRANSFER_DAYS_WINDOW",
    user_settings.get("TRANSFER_DAYS_WINDOW", 3)
))

TRANSFER_AMOUNT_TOLERANCE = int(os.getenv(
    "TRANSFER_AMOUNT_TOLERANCE",
    user_settings.get("TRANSFER_AMOUNT_TOLERANCE", 1_000)
))
