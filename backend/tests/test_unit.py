import pytest
from fastapi import HTTPException

from main import classify_expense_with_rules, validate_category, next_month_name


# ---- classify_expense_with_rules ----

def test_classify_matches_keyword(db):
    assert classify_expense_with_rules("Uber a casa", db) == "transporte"


def test_classify_case_insensitive(db):
    assert classify_expense_with_rules("PLAZA VEA compras", db) == "supermercado"


def test_classify_empty_description_falls_back_to_otros(db):
    assert classify_expense_with_rules("", db) == "otros"
    assert classify_expense_with_rules(None, db) == "otros"


def test_classify_no_match_falls_back_to_otros(db):
    assert classify_expense_with_rules("xyzxyz sin sentido", db) == "otros"


# ---- validate_category ----

def test_validate_category_normalizes(db):
    assert validate_category("  Transporte  ", db) == "transporte"


def test_validate_category_unknown_falls_back_to_otros(db):
    assert validate_category("no-existe", db) == "otros"


def test_validate_category_empty_falls_back_to_otros(db):
    assert validate_category("", db) == "otros"
    assert validate_category(None, db) == "otros"


# ---- next_month_name ----

def test_next_month_name_basic():
    assert next_month_name("Agosto 2026 (pareja)") == "Setiembre 2026 (pareja)"


def test_next_month_name_preserves_suffix_verbatim():
    assert next_month_name("Junio 2026 (Pareja)") == "Julio 2026 (Pareja)"


def test_next_month_name_year_rollover():
    assert next_month_name("Diciembre 2026") == "Enero 2027"


def test_next_month_name_accepts_septiembre_alias_as_input():
    # La entrada puede decir "Septiembre", pero la app siempre nombra el mes 9 "Setiembre"
    assert next_month_name("Septiembre 2026") == "Octubre 2026"


def test_next_month_name_no_suffix():
    assert next_month_name("Marzo 2026") == "Abril 2026"


def test_next_month_name_invalid_format_raises_400():
    with pytest.raises(HTTPException) as exc_info:
        next_month_name("Argentina")
    assert exc_info.value.status_code == 400


def test_next_month_name_unrecognized_month_raises_400():
    with pytest.raises(HTTPException) as exc_info:
        next_month_name("Foobar 2026")
    assert exc_info.value.status_code == 400
