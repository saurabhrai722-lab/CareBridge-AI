import pytest
from datetime import datetime
from backend.models import Patient
from backend.matching import calculate_match_score, normalize_phone, normalize_text

def test_normalize_text():
    assert normalize_text("Ramesh Kumar") == "ramesh kumar"
    assert normalize_text("Ramesh  Kumar ") == "ramesh kumar"
    assert normalize_text("RAMESH, KUMAR.") == "ramesh kumar"
    assert normalize_text(None) == ""

def test_normalize_phone():
    assert normalize_phone("+91 98765-43210") == "919876543210"
    assert normalize_phone("(022) 1234 5678") == "02212345678"
    assert normalize_phone(None) == ""

def create_mock_patient(**kwargs):
    p = Patient(**kwargs)
    p.id = kwargs.get("id", 1)
    p.created_at = datetime.now()
    p.updated_at = datetime.now()
    return p

def test_exact_match():
    p1 = create_mock_patient(id=1, name="Ramesh Kumar", phone="9876543210", date_of_birth="1980-01-01", village="Rampur", gender="Male")
    p2 = create_mock_patient(id=2, name="Ramesh Kumar", phone="9876543210", date_of_birth="1980-01-01", village="Rampur", gender="Male")
    
    result = calculate_match_score(p1, p2)
    assert result.overall_score == 1.0
    assert result.classification == "LIKELY_MATCH"
    assert result.component_scores.name == 1.0
    assert result.component_scores.phone == 1.0
    assert result.component_scores.age_dob == 1.0

def test_missing_fields_do_not_penalize():
    p1 = create_mock_patient(id=1, name="Ramesh Kumar", phone="9876543210")
    p2 = create_mock_patient(id=2, name="Ramesh Kumar", phone="9876543210")
    
    result = calculate_match_score(p1, p2)
    assert result.overall_score == 1.0
    assert result.classification == "LIKELY_MATCH"
    assert "date_of_birth" in result.unavailable_fields
    assert "village" in result.unavailable_fields

def test_strong_conflict_penalizes():
    p1 = create_mock_patient(id=1, name="Ramesh Kumar", phone="9876543210", date_of_birth="1980-01-01")
    p2 = create_mock_patient(id=2, name="Ramesh Kumar", phone="9876543299", date_of_birth="1960-05-05")
    
    result = calculate_match_score(p1, p2)
    assert "phone" in result.conflicting_fields
    assert "date_of_birth" in result.conflicting_fields
    assert result.overall_score < 0.65
    assert result.classification == "NO_MATCH"

def test_name_only_is_not_likely_match():
    p1 = create_mock_patient(id=1, name="John Smith")
    p2 = create_mock_patient(id=2, name="John Smith")
    
    result = calculate_match_score(p1, p2)
    assert result.classification == "REVIEW_REQUIRED"

def test_minor_typo_with_same_phone():
    p1 = create_mock_patient(id=1, name="Ramesh Kumar", phone="9876543210")
    p2 = create_mock_patient(id=2, name="Ramesh Kumer", phone="9876543210")
    
    result = calculate_match_score(p1, p2)
    assert result.classification == "LIKELY_MATCH"
    assert result.component_scores.name > 0.8
    assert result.component_scores.name < 1.0
    assert result.component_scores.phone == 1.0
