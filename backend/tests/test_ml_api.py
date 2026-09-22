import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_readmission_risk_success():
    """Test successful prediction with all features provided"""
    payload = {
        "age": 75,
        "gender": "Female",
        "referral_reason_category": "CARDIAC",
        "prior_admissions_count": 2,
        "comorbidity_count": 3
    }
    
    response = client.post("/api/v1/predictions/readmission-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "SUCCESS"
    assert "risk_score" in data
    assert 0 <= data["risk_score"] <= 1
    assert data["risk_category"] in ["LOW", "MEDIUM", "HIGH"]
    assert "base_value" in data
    assert "shap_values" in data
    
    # Check SHAP format
    shap_vals = data["shap_values"]
    assert len(shap_vals) > 0
    assert "feature" in shap_vals[0]
    assert "contribution" in shap_vals[0]
    assert "description" in shap_vals[0]
    
    # Verify description wording
    for s in shap_vals:
        assert s["description"] in [
            "increased the model's estimated risk",
            "decreased the model's estimated risk"
        ]

def test_readmission_risk_insufficient_features():
    """Test API response when required features are missing"""
    payload = {
        "age": 75,
        "gender": "Female",
        "referral_reason_category": "CARDIAC"
        # Missing prior_admissions_count and comorbidity_count
    }
    
    response = client.post("/api/v1/predictions/readmission-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "INSUFFICIENT_FEATURES"
    assert "prior_admissions_count" in data["missing_features"]
    assert "comorbidity_count" in data["missing_features"]
    assert "Cannot perform prediction" in data["detail"]
    assert data.get("risk_score") is None
