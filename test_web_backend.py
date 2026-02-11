"""
Unit tests for web_backend.py
Tests for validation, sanitization, and utility functions
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import patch
from web_backend import (
    now_utc,
    now_iso,
    parse_iso,
    normalize_email,
    is_valid_email,
    hash_password,
    create_password_record,
    verify_password,
    normalize_color,
    as_non_negative_number,
    clamp_month_start_day,
    normalize_recurring_frequency,
    normalize_expense_category,
    sanitize_settings,
    sanitize_entry,
    sanitize_recurring_rule,
    ensure_category_exists,
    build_default_category_catalog,
    create_default_state,
    RECURRING_FREQUENCIES,
    SORT_OPTIONS,
)


class TestTimeUtilities:
    """Tests for time-related utility functions"""
    
    def test_now_utc_returns_datetime(self):
        result = now_utc()
        assert isinstance(result, datetime)
        assert result.tzinfo is not None
    
    def test_now_iso_returns_string(self):
        result = now_iso()
        assert isinstance(result, str)
        assert "T" in result
    
    def test_parse_iso_valid(self):
        iso_string = "2026-02-10T15:30:45"
        result = parse_iso(iso_string)
        assert isinstance(result, datetime)
        assert result.tzinfo is not None
    
    def test_parse_iso_naive_timezone(self):
        iso_string = "2026-02-10T15:30:45"
        result = parse_iso(iso_string)
        # Should convert naive to UTC
        assert result.tzinfo == timezone.utc
    
    def test_parse_iso_invalid(self):
        result = parse_iso("invalid date")
        assert result is None
    
    def test_parse_iso_none(self):
        result = parse_iso(None)
        assert result is None


class TestEmailUtilities:
    """Tests for email normalization and validation"""
    
    def test_normalize_email(self):
        assert normalize_email("User@Example.COM") == "user@example.com"
        assert normalize_email("  test@test.com  ") == "test@test.com"
        assert normalize_email(None) == ""
    
    def test_is_valid_email_valid(self):
        assert is_valid_email("user@example.com") is True
        assert is_valid_email("test.user@sub.example.com") is True
    
    def test_is_valid_email_invalid(self):
        assert is_valid_email("noatsign.com") is False
        assert is_valid_email("user@nodomain") is False
        assert is_valid_email("") is False


class TestPasswordFunctions:
    """Tests for password hashing and verification"""
    
    def test_hash_password_returns_bytes(self):
        password = "testpassword123"
        salt = b"testsalt"
        result = hash_password(password, salt)
        assert isinstance(result, bytes)
    
    def test_create_password_record(self):
        password = "testpassword123"
        salt_b64, digest_b64 = create_password_record(password)
        assert isinstance(salt_b64, str)
        assert isinstance(digest_b64, str)
    
    def test_verify_password_correct(self):
        password = "testpassword123"
        salt_b64, digest_b64 = create_password_record(password)
        assert verify_password(password, salt_b64, digest_b64) is True
    
    def test_verify_password_incorrect(self):
        password = "testpassword123"
        salt_b64, digest_b64 = create_password_record(password)
        assert verify_password("wrongpassword", salt_b64, digest_b64) is False
    
    def test_verify_password_invalid_salt(self):
        assert verify_password("password", "invalid", "invalid") is False


class TestColorUtilities:
    """Tests for color normalization"""
    
    def test_normalize_color_valid_hex(self):
        assert normalize_color("#246aaf") == "#246aaf"
        assert normalize_color("#ABCDEF") == "#abcdef"
    
    def test_normalize_color_invalid(self):
        result = normalize_color("#invalid")
        assert result == "#2f7db5"  # Default color
    
    def test_normalize_color_non_hex(self):
        result = normalize_color("red")
        assert result == "#2f7db5"  # Default color


class TestNumberUtilities:
    """Tests for number parsing and clamping"""
    
    def test_as_non_negative_number_valid(self):
        assert as_non_negative_number(100.0) == 100.0
        assert as_non_negative_number("50.5") == 50.5
        assert as_non_negative_number(0) == 0.0
    
    def test_as_non_negative_number_negative(self):
        assert as_non_negative_number(-50) == 0.0
    
    def test_as_non_negative_number_invalid(self):
        assert as_non_negative_number("invalid") == 0.0
        assert as_non_negative_number(None) == 0.0
    
    def test_as_non_negative_number_custom_default(self):
        assert as_non_negative_number("invalid", 99.0) == 99.0
    
    def test_clamp_month_start_day(self):
        assert clamp_month_start_day(15) == 15
        assert clamp_month_start_day(1) == 1
        assert clamp_month_start_day(28) == 28
        assert clamp_month_start_day(31) == 28  # Clamped to 28
        assert clamp_month_start_day(0) == 1    # Minimum 1
        assert clamp_month_start_day(-5) == 1   # Minimum 1


class TestFrequencyAndCategoryNormalization:
    """Tests for frequency and category normalization"""
    
    def test_normalize_recurring_frequency_valid(self):
        assert normalize_recurring_frequency("weekly") == "weekly"
        assert normalize_recurring_frequency("MONTHLY") == "monthly"
        assert normalize_recurring_frequency("  bi-weekly  ") == "bi-weekly"
    
    def test_normalize_recurring_frequency_invalid(self):
        result = normalize_recurring_frequency("invalid")
        assert result == "monthly"  # Default
    
    def test_normalize_expense_category(self):
        assert normalize_expense_category("Groceries") == "Groceries"
        assert normalize_expense_category("rent") == "Mortgage/Rent"
        assert normalize_expense_category("utilities") == "Electric"
    
    def test_normalize_expense_category_empty(self):
        assert normalize_expense_category("") == ""
        assert normalize_expense_category(None) == ""


class TestSettingsSanitization:
    """Tests for settings sanitization"""
    
    def test_sanitize_settings_valid(self):
        raw = {
            "defaultType": "income",
            "dataScope": "all",
            "monthStartDay": 15,
            "sortOrder": "amount_desc"
        }
        result = sanitize_settings(raw)
        assert result["defaultType"] == "income"
        assert result["dataScope"] == "all"
        assert result["monthStartDay"] == 15
        assert result["sortOrder"] == "amount_desc"
    
    def test_sanitize_settings_defaults(self):
        result = sanitize_settings(None)
        assert result["defaultType"] == "expense"
        assert result["dataScope"] == "month"
        assert result["monthStartDay"] == 1
        assert result["sortOrder"] == "date_desc"
    
    def test_sanitize_settings_invalid_values(self):
        raw = {
            "defaultType": "invalid",
            "dataScope": "invalid",
            "monthStartDay": 50,
            "sortOrder": "invalid"
        }
        result = sanitize_settings(raw)
        assert result["defaultType"] == "expense"  # Defaults
        assert result["dataScope"] == "month"      # Defaults
        assert result["monthStartDay"] == 28       # Clamped
        assert result["sortOrder"] == "date_desc"  # Defaults


class TestEntrySanitization:
    """Tests for entry sanitization"""
    
    def test_sanitize_valid_entry(self):
        raw = {
            "type": "expense",
            "category": "Groceries",
            "amount": 50.0,
            "note": "Weekly shopping",
            "createdAt": "2026-02-10T12:00:00"
        }
        result = sanitize_entry(raw)
        assert result is not None
        assert result["type"] == "expense"
        assert result["category"] == "Groceries"
        assert result["amount"] == 50.0
    
    def test_sanitize_entry_invalid_type(self):
        raw = {
            "type": "invalid",
            "category": "Groceries",
            "amount": 50.0
        }
        result = sanitize_entry(raw)
        assert result is None
    
    def test_sanitize_entry_missing_category(self):
        raw = {
            "type": "expense",
            "category": "",
            "amount": 50.0
        }
        result = sanitize_entry(raw)
        assert result is None
    
    def test_sanitize_entry_invalid_amount(self):
        raw = {
            "type": "expense",
            "category": "Groceries",
            "amount": "invalid"
        }
        result = sanitize_entry(raw)
        assert result is None
    
    def test_sanitize_entry_generates_id(self):
        raw = {
            "type": "income",
            "category": "Salary",
            "amount": 3000.0
        }
        result = sanitize_entry(raw)
        assert result is not None
        assert "id" in result
        assert isinstance(result["id"], str)


class TestRecurringRuleSanitization:
    """Tests for recurring rule sanitization"""
    
    def test_sanitize_valid_rule(self):
        raw = {
            "type": "expense",
            "category": "Groceries",
            "amount": 100.0,
            "frequency": "weekly",
            "nextDue": "2026-02-17"
        }
        result = sanitize_recurring_rule(raw)
        assert result is not None
        assert result["type"] == "expense"
        assert result["frequency"] == "weekly"
        assert result["active"] is True
    
    def test_sanitize_rule_invalid_type(self):
        raw = {
            "type": "invalid",
            "category": "Groceries",
            "amount": 100.0,
            "frequency": "weekly"
        }
        result = sanitize_recurring_rule(raw)
        assert result is None
    
    def test_sanitize_rule_defaults(self):
        raw = {
            "type": "income",
            "category": "Salary",
            "amount": 3000.0
        }
        result = sanitize_recurring_rule(raw)
        assert result is not None
        assert result["frequency"] == "monthly"  # Default
        assert result["active"] is True


class TestCategoryManagement:
    """Tests for category management"""
    
    def test_ensure_category_exists_new(self):
        catalog = {"expense": [], "income": []}
        ensure_category_exists(catalog, "expense", "Coffee Shops", "#ff0000")
        assert len(catalog["expense"]) == 1
        assert catalog["expense"][0]["name"] == "Coffee Shops"
    
    def test_ensure_category_exists_duplicate(self):
        catalog = {
            "expense": [{"id": "1", "name": "Coffee Shops", "color": "#ff0000"}],
            "income": []
        }
        ensure_category_exists(catalog, "expense", "Coffee Shops")
        assert len(catalog["expense"]) == 1  # No duplicate
    
    def test_ensure_category_exists_empty_name(self):
        catalog = {"expense": [], "income": []}
        ensure_category_exists(catalog, "expense", "")
        assert len(catalog["expense"]) == 0


class TestDefaultState:
    """Tests for default state creation"""
    
    def test_build_default_category_catalog(self):
        catalog = build_default_category_catalog()
        assert "expense" in catalog
        assert "income" in catalog
        assert len(catalog["expense"]) > 0
        assert len(catalog["income"]) > 0
    
    def test_create_default_state(self):
        state = create_default_state()
        assert state["budget"] == 0.0
        assert state["entries"] == []
        assert state["recurringRules"] == []
        assert "settings" in state
        assert "categoryCatalog" in state


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
