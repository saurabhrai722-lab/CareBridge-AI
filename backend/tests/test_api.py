import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import engine, Base

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_sync_referral():
    payload = {
        "patient": {
            "name": "John Doe",
            "phone": "555-1234",
            "village": "Test Village"
        },
        "referral": {
            "referral_code": "CB-ABC123",
            "referring_facility": "Clinic A",
            "receiving_facility": "Hospital B",
            "referral_reason": "General Checkup"
        }
    }
    
    # 1. Create referral
    response = client.post("/api/v1/referrals", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["referral_code"] == "CB-ABC123"
    assert "id" in data
    
    # 2. Idempotency Check (Should return 200 with same data)
    response2 = client.post("/api/v1/referrals", json=payload)
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["id"] == data["id"]
    
    # 3. Get Referral
    response3 = client.get("/api/v1/referrals/CB-ABC123")
    assert response3.status_code == 200
    assert response3.json()["referral_code"] == "CB-ABC123"

def test_get_missing_referral():
    response = client.get("/api/v1/referrals/CB-UNKNOWN")
    assert response.status_code == 404

def test_sync_conflict():
    payload1 = {
        "patient": {"name": "Alice"},
        "referral": {
            "referral_code": "CB-CONFLICT",
            "referring_facility": "A",
            "receiving_facility": "B"
        }
    }
    client.post("/api/v1/referrals", json=payload1)

    payload2 = {
        "patient": {"name": "Bob"},
        "referral": {
            "referral_code": "CB-CONFLICT",
            "referring_facility": "A",
            "receiving_facility": "C"
        }
    }
    response = client.post("/api/v1/referrals", json=payload2)
    assert response.status_code == 409

def test_list_referrals():
    payload = {
        "patient": {"name": "Charlie"},
        "referral": {
            "referral_code": "CB-LIST123",
            "referring_facility": "A",
            "receiving_facility": "B"
        }
    }
    client.post("/api/v1/referrals", json=payload)
    
    response = client.get("/api/v1/referrals")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["referral_code"] == "CB-LIST123"
    assert "patient" in data[0]
    assert data[0]["patient"]["name"] == "Charlie"

def test_update_referral_status():
    payload = {
        "patient": {"name": "Dana"},
        "referral": {
            "referral_code": "CB-STATUS123",
            "referring_facility": "A",
            "receiving_facility": "B"
        }
    }
    client.post("/api/v1/referrals", json=payload)
    
    # Valid transition
    response = client.patch("/api/v1/referrals/CB-STATUS123", json={"status": "RECEIVED"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "RECEIVED"
    assert len(data["events"]) == 1
    assert data["events"][0]["event"] == "Status changed to RECEIVED"

    # Invalid transition (RECEIVED -> CREATED)
    response2 = client.patch("/api/v1/referrals/CB-STATUS123", json={"status": "CREATED"})
    assert response2.status_code == 400
    
    # Invalid value
    response3 = client.patch("/api/v1/referrals/CB-STATUS123", json={"status": "NONEXISTENT"})
    assert response3.status_code == 400

def test_reconciliation_workflow():
    # 1. Create Patient A (Source)
    client.post("/api/v1/referrals", json={
        "patient": {"name": "Ramesh Kumar", "phone": "9876543210"},
        "referral": {"referral_code": "CB-REC1", "referring_facility": "A", "receiving_facility": "B"}
    })
    
    # 2. Create Patient B (Candidate - Typo)
    client.post("/api/v1/referrals", json={
        "patient": {"name": "Ramesh Kumer", "phone": "9876543210"},
        "referral": {"referral_code": "CB-REC2", "referring_facility": "C", "receiving_facility": "D"}
    })
    
    # 3. Create Patient C (Not a match)
    client.post("/api/v1/referrals", json={
        "patient": {"name": "John Doe", "phone": "1111111111"},
        "referral": {"referral_code": "CB-REC3", "referring_facility": "E", "receiving_facility": "F"}
    })

    # Fetch candidates for CB-REC1
    res = client.get("/api/v1/referrals/CB-REC1/candidates")
    assert res.status_code == 200
    candidates = res.json()
    
    # John Doe should not be in the list, only Ramesh Kumer should be there
    assert len(candidates) == 1
    assert candidates[0]["candidate_patient"]["name"] == "Ramesh Kumer"
    assert candidates[0]["classification"] == "LIKELY_MATCH"
    
    candidate_id = candidates[0]["candidate_patient"]["id"]
    
    # Confirm match
    rec_res = client.post("/api/v1/referrals/CB-REC1/reconcile", json={
        "candidate_patient_id": candidate_id,
        "action": "CONFIRM"
    })
    assert rec_res.status_code == 200
    assert rec_res.json()["status"] == "success"
    
    # Fetch candidates again, the list should be empty since we already reconciled
    res_after = client.get("/api/v1/referrals/CB-REC1/candidates")
    assert res_after.status_code == 200
    assert len(res_after.json()) == 0
