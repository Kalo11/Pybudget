
#!/usr/bin/env python3
import argparse
import base64
import hashlib
import json
import mimetypes
import secrets
import sqlite3
import threading
import uuid
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_WEB_ROOT = BASE_DIR / "webapp"
DEFAULT_DB_PATH = BASE_DIR / ".budgetbeacon_api" / "budgetbeacon.sqlite3"

SESSION_COOKIE_NAME = "budgetbeacon_session"
SESSION_TTL_DAYS = 7
PASSWORD_PBKDF2_ROUNDS = 210_000
MAX_BODY_BYTES = 2 * 1024 * 1024

DEFAULT_EXPENSE_CATEGORIES = [
    "Groceries",
    "Mortgage/Rent",
    "Water",
    "Gas",
    "Electric",
    "Transportation",
    "Dining",
    "Entertainment",
    "Healthcare",
    "Car Insurance",
    "Credit Cards",
    "Loans",
    "Student Loans",
    "Childcare",
    "Education",
    "Internet",
    "Cellphone",
    "Shopping",
    "Personal Care",
    "Travel",
    "Gifts",
    "Taxes",
    "Other",
]
DEFAULT_INCOME_CATEGORIES = [
    "Salary",
    "Freelance",
    "Business",
    "Interest",
    "Dividends",
    "Rental Income",
    "Refund",
    "Gift",
    "Other Income",
]
EXPENSE_CATEGORY_COLORS = [
    "#246aaf",
    "#ad4e3b",
    "#2e8f6b",
    "#7557a8",
    "#b07723",
    "#1f7e91",
    "#5b5d90",
    "#97754e",
]
INCOME_CATEGORY_COLORS = [
    "#2a8f6d",
    "#4f7fc2",
    "#7b64bf",
    "#3f9c96",
    "#a67d2a",
    "#6a8d3b",
]
SORT_OPTIONS = {"date_desc", "date_asc", "amount_desc", "amount_asc"}
RECURRING_FREQUENCIES = {"weekly", "bi-weekly", "semi-monthly", "monthly"}
LEGACY_EXPENSE_CATEGORY_RENAMES = {
    "rent": "Mortgage/Rent",
    "utilities": "Electric",
    "insurance": "Car Insurance",
    "debt payment": "Loans",
    "phone/internet": "Internet",
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def parse_iso(value: object) -> Optional[datetime]:
    try:
        parsed = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def normalize_email(value: object) -> str:
    return str(value or "").strip().lower()


def is_valid_email(value: str) -> bool:
    return "@" in value and "." in value.split("@")[-1]


def hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_PBKDF2_ROUNDS)


def create_password_record(password: str) -> tuple[str, str]:
    salt = secrets.token_bytes(16)
    digest = hash_password(password, salt)
    return (
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, salt_b64: str, digest_b64: str) -> bool:
    try:
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected = base64.b64decode(digest_b64.encode("ascii"))
    except (ValueError, TypeError):
        return False
    actual = hash_password(password, salt)
    return secrets.compare_digest(actual, expected)


def normalize_color(value: object) -> str:
    text = str(value or "").strip().lower()
    if len(text) == 7 and text.startswith("#") and all(ch in "0123456789abcdef" for ch in text[1:]):
        return text
    return "#2f7db5"


def category_fallback_color(entry_type: str, seed: object) -> str:
    palette = INCOME_CATEGORY_COLORS if entry_type == "income" else EXPENSE_CATEGORY_COLORS
    total = sum(ord(ch) for ch in str(seed or "x"))
    return palette[total % len(palette)]


def build_default_category_catalog() -> dict:
    expense = []
    income = []
    for index, name in enumerate(DEFAULT_EXPENSE_CATEGORIES, start=1):
        expense.append(
            {
                "id": f"expense_{index}",
                "name": name,
                "color": EXPENSE_CATEGORY_COLORS[(index - 1) % len(EXPENSE_CATEGORY_COLORS)],
            }
        )
    for index, name in enumerate(DEFAULT_INCOME_CATEGORIES, start=1):
        income.append(
            {
                "id": f"income_{index}",
                "name": name,
                "color": INCOME_CATEGORY_COLORS[(index - 1) % len(INCOME_CATEGORY_COLORS)],
            }
        )
    return {"expense": expense, "income": income}


def create_default_state() -> dict:
    return {
        "budget": 0.0,
        "entries": [],
        "recurringRules": [],
        "settings": {
            "defaultType": "expense",
            "dataScope": "month",
            "monthStartDay": 1,
            "sortOrder": "date_desc",
        },
        "categoryCatalog": build_default_category_catalog(),
    }


def as_non_negative_number(value: object, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    if parsed < 0:
        return default
    return parsed


def clamp_month_start_day(value: object) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return 1
    return max(1, min(28, parsed))


def normalize_recurring_frequency(value: object) -> str:
    frequency = str(value or "").strip().lower()
    return frequency if frequency in RECURRING_FREQUENCIES else "monthly"


def normalize_expense_category(value: object) -> str:
    category = str(value or "").strip()
    if not category:
        return ""
    return LEGACY_EXPENSE_CATEGORY_RENAMES.get(category.lower(), category)


def sanitize_settings(raw: object) -> dict:
    source = raw if isinstance(raw, dict) else {}
    default_type = "income" if source.get("defaultType") == "income" else "expense"
    data_scope = "all" if source.get("dataScope") == "all" else "month"
    sort_order = source.get("sortOrder")
    return {
        "defaultType": default_type,
        "dataScope": data_scope,
        "monthStartDay": clamp_month_start_day(source.get("monthStartDay")),
        "sortOrder": sort_order if sort_order in SORT_OPTIONS else "date_desc",
    }


def sanitize_entry(raw: object) -> Optional[dict]:
    if not isinstance(raw, dict):
        return None
    entry_type = "income" if raw.get("type") == "income" else "expense"
    category = str(raw.get("category", "")).strip()
    if entry_type == "expense":
        category = normalize_expense_category(category)
    amount = as_non_negative_number(raw.get("amount"), -1.0)
    if not category or amount < 0:
        return None
    created_at = str(raw.get("createdAt") or now_iso()).strip() or now_iso()
    entry = {
        "id": str(raw.get("id") or f"id_{uuid.uuid4().hex}"),
        "type": entry_type,
        "category": category,
        "amount": amount,
        "note": str(raw.get("note") or ""),
        "createdAt": created_at,
    }
    meta = raw.get("meta")
    if isinstance(meta, dict):
        entry["meta"] = meta
    return entry


def sanitize_recurring_rule(raw: object) -> Optional[dict]:
    if not isinstance(raw, dict):
        return None
    rule_type = "income" if raw.get("type") == "income" else "expense"
    category = str(raw.get("category", "")).strip()
    if rule_type == "expense":
        category = normalize_expense_category(category)
    amount = as_non_negative_number(raw.get("amount"), -1.0)
    if not category or amount < 0:
        return None
    return {
        "id": str(raw.get("id") or f"rule_{uuid.uuid4().hex}"),
        "type": rule_type,
        "category": category,
        "amount": amount,
        "note": str(raw.get("note") or ""),
        "frequency": normalize_recurring_frequency(raw.get("frequency")),
        "nextDue": str(raw.get("nextDue") or now_iso()[:10]),
        "active": raw.get("active") is not False,
    }


def ensure_category_exists(catalog: dict, entry_type: str, name: str, preferred_color: str = "") -> None:
    normalized_type = "income" if entry_type == "income" else "expense"
    value = str(name or "").strip()
    if not value:
        return
    candidates = catalog.get(normalized_type) or []
    for category in candidates:
        if str(category.get("name", "")).strip().lower() == value.lower():
            return
    candidates.append(
        {
            "id": f"{normalized_type}_{uuid.uuid4().hex[:10]}",
            "name": value,
            "color": normalize_color(preferred_color or category_fallback_color(normalized_type, value)),
        }
    )
    candidates.sort(key=lambda item: str(item.get("name", "")).lower())
    catalog[normalized_type] = candidates
