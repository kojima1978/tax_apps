import os
import json
import logging
from pathlib import Path
from django.conf import settings as django_settings

logger = logging.getLogger(__name__)

# Django settings から BASE_DIR を取得
BASE_DIR = getattr(django_settings, 'BASE_DIR', Path(__file__).resolve().parent.parent.parent)
DATA_DIR = BASE_DIR / "data"
CONFIG_FILE = DATA_DIR / "user_settings.json"


def ensure_data_dir():
    """データディレクトリを作成"""
    os.makedirs(DATA_DIR, exist_ok=True)


def load_user_settings() -> dict:
    """ユーザー設定をJSONファイルから読み込む"""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.warning(f"設定ファイルのパースに失敗: {e}")
            return {}
        except OSError as e:
            logger.warning(f"設定ファイルの読み込みに失敗: {e}")
            return {}
    return {}


def save_user_settings(new_settings: dict):
    """ユーザー設定をJSONファイルに保存"""
    ensure_data_dir()
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(new_settings, f, ensure_ascii=False, indent=2)
    except OSError as e:
        logger.error(f"設定ファイルの保存に失敗: {e}")
        raise


def get_setting(key: str, default=None):
    """特定の設定値を取得"""
    user_settings = load_user_settings()
    return user_settings.get(key, default)


# デフォルト分類パターン
DEFAULT_PATTERNS = {
    "生活費": [
        "イオン", "セブン", "ローソン", "ファミマ", "スーパー", "マート",
        "電気", "ガス", "水道", "東京電力", "東電", "関西電力", "関電",
        "NTT", "ドコモ", "DOCOMO", "ソフトバンク", "au", "通信", "電話",
        "NHK", "薬局", "ドラッグ", "病院", "医院", "クリニック", "介護",
        "ガソリン", "ENEOS", "出光", "昭和シェル",
        "マクドナルド", "スターバックス", "スタバ", "コンビニ"
    ],
    "給与": ["給与", "給料", "賞与", "ボーナス", "報酬", "振込給与"],
    "贈与": ["フリコミ", "振込", "送金"],
    "関連会社": ["商事", "物産", "興業", "実業", "有限会社", "株式会社"],
    "銀行": ["定期預金", "定期", "積立"],
    "証券・株式": [
        "証券", "野村", "大和", "SMBC", "みずほ証券", "楽天証券", "SBI",
        "投資信託", "株式", "債券", "ファンド", "配当"
    ],
    "保険会社": [
        "生命保険", "損保", "保険", "共済", "かんぽ", "日本生命", "第一生命"
    ],
    "通帳間移動": [
        "振替", "口座振替", "資金移動", "自己口座", "本人口座", "自分宛", "同一名義"
    ],
    "その他": ["手数料", "利息", "ATM", "時間外", "引出", "預入"]
}


def get_classification_patterns() -> dict:
    """分類パターンを取得（ユーザー設定優先、なければデフォルト）"""
    user_settings = load_user_settings()
    return user_settings.get("CLASSIFICATION_PATTERNS", DEFAULT_PATTERNS)
