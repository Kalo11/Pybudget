"""
Unit tests for budget_app.py
Tests for data loading, parsing, validation, and calculations
"""
import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from budget_app import (
    default_data,
    load_data,
    parse_amount,
    calculate_summary,
    normalize_category_name,
    safe_month_key,
    format_currency,
    _amount_or_zero,
    _sanitize_transaction,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
)


class TestDefaultData:
    """Tests for default_data function"""
    
    def test_default_data_structure(self):
        data = default_data()
        assert isinstance(data, dict)
        assert "monthly_budget" in data
        assert "transactions" in data
        assert data["monthly_budget"] == 0.0
        assert data["transactions"] == []


class TestParseAmount:
    """Tests for parse_amount function"""
    
    def test_valid_amount_float(self):
        assert parse_amount(24.99) == 24.99
        assert parse_amount("24.99") == 24.99
        assert parse_amount(0) == 0.0
        assert parse_amount("0") == 0.0
    
    def test_valid_amount_integer(self):
        assert parse_amount(100) == 100.0
        assert parse_amount("100") == 100.0
    
    def test_invalid_negative_amount(self):
        with pytest.raises(ValueError):
            parse_amount(-1)
    
    def test_invalid_infinite_amount(self):
        with pytest.raises(ValueError):
            parse_amount(float('inf'))
    
    def test_invalid_nan_amount(self):
        with pytest.raises(ValueError):
            parse_amount(float('nan'))
    
    def test_invalid_non_numeric(self):
        with pytest.raises(ValueError):
            parse_amount("abc")


class TestAmountOrZero:
    """Tests for _amount_or_zero helper function"""
    
    def test_valid_amounts(self):
        assert _amount_or_zero(24.99) == 24.99
        assert _amount_or_zero("50.00") == 50.0
    
    def test_invalid_returns_zero(self):
        assert _amount_or_zero("invalid") == 0.0
        assert _amount_or_zero(None) == 0.0
        assert _amount_or_zero(float('inf')) == 0.0


class TestNormalizeCategoryName:
    """Tests for normalize_category_name function"""
    
    def test_expense_categories(self):
        assert normalize_category_name("expense", "Groceries") == "Groceries"
        assert normalize_category_name("expense", "groceries") == "Groceries"
        assert normalize_category_name("expense", "GROCERIES") == "Groceries"
    
    def test_income_categories(self):
        assert normalize_category_name("income", "Salary") == "Salary"
        assert normalize_category_name("income", "salary") == "Salary"
        assert normalize_category_name("income", "SALARY") == "Salary"
    
    def test_legacy_expense_category_renames(self):
        assert normalize_category_name("expense", "rent") == "Mortgage/Rent"
        assert normalize_category_name("expense", "utilities") == "Electric"
        assert normalize_category_name("expense", "insurance") == "Car Insurance"
    
    def test_empty_category(self):
        assert normalize_category_name("expense", "") == ""
        assert normalize_category_name("expense", None) == ""
    
    def test_unknown_category_passthrough(self):
        # Unknown categories are passed through
        unknown = "CustomCategory"
        assert normalize_category_name("expense", unknown) == unknown


class TestSafeMonthKey:
    """Tests for safe_month_key function"""
    
    def test_valid_iso_date(self):
        assert safe_month_key("2026-02-10") == "2026-02"
        assert safe_month_key("2026-02-10T15:30:45") == "2026-02"
    
    def test_invalid_date_returns_text(self):
        assert safe_month_key("2026-02-invalid") == "2026-02"
        assert safe_month_key("invalid") == "invali"
    
    def test_none_returns_unknown(self):
        assert safe_month_key(None) == "unknown"
        assert safe_month_key("") == "unknown"


class TestFormatCurrency:
    """Tests for format_currency function"""
    
    def test_format_simple_amount(self):
        assert format_currency(100.0) == "$100.00"
        assert format_currency(24.99) == "$24.99"
    
    def test_format_thousands_separator(self):
        assert format_currency(1000.0) == "$1,000.00"
        assert format_currency(1000000.0) == "$1,000,000.00"
    
    def test_format_zero(self):
        assert format_currency(0.0) == "$0.00"


class TestCalculateSummary:
    """Tests for calculate_summary function"""
    
    def test_empty_data(self):
        data = default_data()
        summary = calculate_summary(data)
        assert summary["income"] == 0.0
        assert summary["expense"] == 0.0
        assert summary["balance"] == 0.0
        assert summary["budget"] == 0.0
        assert summary["remaining"] == 0.0
    
    def test_with_transactions(self):
        data = {
            "monthly_budget": 2000.0,
            "transactions": [
                {
                    "id": 1,
                    "type": "income",
                    "category": "Salary",
                    "amount": 3000.0,
                    "note": "Paycheck",
                    "created_at": "2026-02-01"
                },
                {
                    "id": 2,
                    "type": "expense",
                    "category": "Groceries",
                    "amount": 150.0,
                    "note": "Weekly groceries",
                    "created_at": "2026-02-02"
                }
            ]
        }
        summary = calculate_summary(data)
        assert summary["income"] == 3000.0
        assert summary["expense"] == 150.0
        assert summary["balance"] == 2850.0
        assert summary["budget"] == 2000.0
        assert summary["remaining"] == 1850.0
    
    def test_budget_exceeded(self):
        data = {
            "monthly_budget": 100.0,
            "transactions": [
                {
                    "id": 1,
                    "type": "expense",
                    "category": "Groceries",
                    "amount": 150.0,
                    "note": "Over budget",
                    "created_at": "2026-02-01"
                }
            ]
        }
        summary = calculate_summary(data)
        assert summary["remaining"] == -50.0


class TestSanitizeTransaction:
    """Tests for _sanitize_transaction function"""
    
    def test_valid_transaction(self):
        tx = {
            "type": "expense",
            "category": "Groceries",
            "amount": 50.0,
            "note": "Test",
            "created_at": "2026-02-01T00:00:00"
        }
        sanitized = _sanitize_transaction(tx, fallback_id=1)
        assert sanitized is not None
        assert sanitized["type"] == "expense"
        assert sanitized["category"] == "Groceries"
        assert sanitized["amount"] == 50.0
    
    def test_invalid_type(self):
        tx = {
            "type": "invalid",
            "category": "Groceries",
            "amount": 50.0
        }
        result = _sanitize_transaction(tx, fallback_id=1)
        assert result is None
    
    def test_missing_category(self):
        tx = {
            "type": "expense",
            "category": "",
            "amount": 50.0
        }
        result = _sanitize_transaction(tx, fallback_id=1)
        assert result is None
    
    def test_invalid_amount(self):
        tx = {
            "type": "expense",
            "category": "Groceries",
            "amount": "invalid"
        }
        sanitized = _sanitize_transaction(tx, fallback_id=1)
        assert sanitized is None
    
    def test_non_dict_input(self):
        result = _sanitize_transaction("not a dict", fallback_id=1)
        assert result is None
    
    def test_missing_created_at_uses_now(self):
        tx = {
            "type": "expense",
            "category": "Groceries",
            "amount": 50.0
        }
        sanitized = _sanitize_transaction(tx, fallback_id=1)
        assert sanitized is not None
        assert sanitized["created_at"] is not None


class TestLoadData:
    """Tests for load_data function"""
    
    @patch('budget_app.DATA_FILE')
    def test_load_missing_file(self, mock_file):
        mock_file.exists.return_value = False
        data = load_data()
        assert data == default_data()
    
    @patch('budget_app.DATA_FILE')
    def test_load_invalid_json(self, mock_file):
        mock_file.exists.return_value = True
        mock_file.open.return_value.__enter__.return_value.read.return_value = "invalid json"
        with patch('budget_app.json.load', side_effect=json.JSONDecodeError("msg", "doc", 0)):
            data = load_data()
            assert data == default_data()
    
    @patch('budget_app.DATA_FILE')
    def test_load_valid_data(self, mock_file):
        valid_data = {
            "monthly_budget": 2000.0,
            "transactions": [
                {
                    "type": "expense",
                    "category": "Groceries",
                    "amount": 50.0,
                    "note": "Test",
                    "created_at": "2026-02-01"
                }
            ]
        }
        mock_file.exists.return_value = True
        with patch('budget_app.json.load', return_value=valid_data):
            data = load_data()
            assert data["monthly_budget"] == 2000.0
            assert len(data["transactions"]) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
