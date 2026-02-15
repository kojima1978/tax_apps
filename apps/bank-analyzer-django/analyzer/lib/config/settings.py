"""
設定管理

ユーザー設定の読み込み・保存およびキャッシュ管理を行う。
"""
import os
import json
import logging
import tempfile
from pathlib import Path

from django.conf import settings as django_settings

from .defaults import DEFAULT_PATTERNS, DEFAULT_GIFT_THRESHOLD, DEFAULT_FUZZY_CONFIG

logger = logging.getLogger(__name__)

# Django settings から BASE_DIR を取得
BASE_DIR = getattr(django_settings, 'BASE_DIR', Path(__file__).resolve().parent.parent.parent.parent)
DATA_DIR = BASE_DIR / "data"
CONFIG_FILE = DATA_DIR / "user_settings.json"

# --- mtime ベースキャッシュ ---
_settings_cache: dict | None = None
_settings_mtime: float | None = None


def ensure_data_dir():
    """データディレクトリを作成"""
    os.makedirs(DATA_DIR, exist_ok=True)


def load_user_settings() -> dict:
    """ユーザー設定をJSONファイルから読み込む（mtime変更時のみディスク読み込み）"""
    global _settings_cache, _settings_mtime

    if not CONFIG_FILE.exists():
        _settings_cache = {}
        _settings_mtime = None
        return {}

    try:
        current_mtime = CONFIG_FILE.stat().st_mtime
    except OSError:
        return _settings_cache if _settings_cache is not None else {}

    if _settings_cache is not None and _settings_mtime == current_mtime:
        return _settings_cache

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        _settings_cache = data
        _settings_mtime = current_mtime
        return data
    except json.JSONDecodeError as e:
        logger.warning(f"設定ファイルのパースに失敗: {e}")
        return {}
    except OSError as e:
        logger.warning(f"設定ファイルの読み込みに失敗: {e}")
        return {}


def save_user_settings(new_settings: dict):
    """ユーザー設定をJSONファイルにアトミック保存"""
    global _settings_cache, _settings_mtime

    ensure_data_dir()
    try:
        fd, tmp_path = tempfile.mkstemp(dir=DATA_DIR, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(new_settings, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, CONFIG_FILE)
        except BaseException:
            # 書き込み失敗時は一時ファイルを削除
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise

        # 保存成功後キャッシュ更新
        _settings_cache = new_settings
        try:
            _settings_mtime = CONFIG_FILE.stat().st_mtime
        except OSError:
            _settings_mtime = None
    except OSError as e:
        logger.error(f"設定ファイルの保存に失敗: {e}")
        raise


def get_fuzzy_config() -> dict:
    """ファジーマッチング設定を取得"""
    user_settings = load_user_settings()
    default_config = DEFAULT_FUZZY_CONFIG.copy()
    user_fuzzy = user_settings.get("FUZZY_MATCHING", {})
    default_config.update(user_fuzzy)
    return default_config


def get_classification_patterns() -> dict:
    """分類パターンを取得（ユーザー設定優先、なければデフォルト）"""
    user_settings = load_user_settings()
    return user_settings.get("CLASSIFICATION_PATTERNS", DEFAULT_PATTERNS)


def get_gift_threshold() -> int:
    """贈与判定の閾値を取得"""
    user_settings = load_user_settings()
    return int(user_settings.get("GIFT_THRESHOLD", DEFAULT_GIFT_THRESHOLD))
