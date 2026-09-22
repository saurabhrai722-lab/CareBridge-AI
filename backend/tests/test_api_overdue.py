import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from backend.main import app, OVERDUE_THRESHOLD_HOURS
from backend.database import get_db, Base, engine
from backend.models import Patient, Referral, ReferralStatus, ReferralEvent

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

def generate_patient(db):
    patient = Patient(name="Overdue Test Patient", phone="555-0000", gender="M")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

def create_referral_with_time(db, status, offset_hours):
    patient = generate_patient(db)
    ref_code = f"CB-{uuid4().hex[:6].upper()}"
    referral = Referral(
        referral_code=ref_code,
        patient_id=patient.id,
        referring_facility="Clinic A",
        receiving_facility="Hospital B",
        referral_reason="Test Overdue",
        status=status,
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)
    
    # Manually override created_at
    referral.created_at = datetime.now(timezone.utc) - timedelta(hours=offset_hours)
    db.commit()
    
    return referral

def test_overdue_sent_older_than_48_hours(db_session):
    ref = create_referral_with_time(db_session, ReferralStatus.SENT, OVERDUE_THRESHOLD_HOURS + 1)
    
    resp = client.get("/api/v1/referrals/overdue")
    assert resp.status_code == 200
    codes = [r["referral_code"] for r in resp.json()]
    assert ref.referral_code in codes

def test_overdue_sent_younger_than_48_hours(db_session):
    ref = create_referral_with_time(db_session, ReferralStatus.SENT, OVERDUE_THRESHOLD_HOURS - 1)
    
    resp = client.get("/api/v1/referrals/overdue")
    assert resp.status_code == 200
    codes = [r["referral_code"] for r in resp.json()]
    assert ref.referral_code not in codes

def test_overdue_exactly_at_threshold(db_session, monkeypatch):
    import backend.main as main
    
    # Use a fixed "now"
    fixed_now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    class MockDatetime:
        @classmethod
        def now(cls, tz=None):
            return fixed_now

    monkeypatch.setattr(main, "datetime", MockDatetime)
    
    # Create the referral manually so we can set created_at exactly to threshold
    patient = generate_patient(db_session)
    ref_code = f"CB-{uuid4().hex[:6].upper()}"
    referral = Referral(
        referral_code=ref_code,
        patient_id=patient.id,
        referring_facility="Clinic A",
        receiving_facility="Hospital B",
        status=ReferralStatus.SENT,
    )
    db_session.add(referral)
    db_session.commit()
    db_session.refresh(referral)
    
    referral.created_at = fixed_now - timedelta(hours=OVERDUE_THRESHOLD_HOURS)
    db_session.commit()
    
    resp = client.get("/api/v1/referrals/overdue")
    assert resp.status_code == 200
    codes = [r["referral_code"] for r in resp.json()]
    assert ref_code not in codes

def test_overdue_excludes_other_statuses(db_session):
    ref_recv = create_referral_with_time(db_session, ReferralStatus.RECEIVED, OVERDUE_THRESHOLD_HOURS + 2)
    ref_rev = create_referral_with_time(db_session, ReferralStatus.UNDER_REVIEW, OVERDUE_THRESHOLD_HOURS + 2)
    ref_adm = create_referral_with_time(db_session, ReferralStatus.ADMITTED, OVERDUE_THRESHOLD_HOURS + 2)
    ref_dis = create_referral_with_time(db_session, ReferralStatus.DISCHARGED, OVERDUE_THRESHOLD_HOURS + 2)
    ref_comp = create_referral_with_time(db_session, ReferralStatus.COMPLETED, OVERDUE_THRESHOLD_HOURS + 2)
    
    resp = client.get("/api/v1/referrals/overdue")
    assert resp.status_code == 200
    codes = [r["referral_code"] for r in resp.json()]
    
    assert ref_recv.referral_code not in codes
    assert ref_rev.referral_code not in codes
    assert ref_adm.referral_code not in codes
    assert ref_dis.referral_code not in codes
    assert ref_comp.referral_code not in codes

def test_overdue_multiple_referrals(db_session):
    ref1 = create_referral_with_time(db_session, ReferralStatus.SENT, 50)
    ref2 = create_referral_with_time(db_session, ReferralStatus.SENT, 20)
    ref3 = create_referral_with_time(db_session, ReferralStatus.RECEIVED, 60)
    
    resp = client.get("/api/v1/referrals/overdue")
    assert resp.status_code == 200
    codes = [r["referral_code"] for r in resp.json()]
    
    assert ref1.referral_code in codes
    assert ref2.referral_code not in codes
    assert ref3.referral_code not in codes

def test_create_follow_up_event(db_session):
    ref = create_referral_with_time(db_session, ReferralStatus.SENT, 50)
    
    payload = {
        "event": "FOLLOW_UP_ATTEMPTED",
        "note": "Called patient, no answer."
    }
    resp = client.post(f"/api/v1/referrals/{ref.referral_code}/events", json=payload)
    assert resp.status_code == 200
    
    data = resp.json()
    assert data["event"] == "FOLLOW_UP_ATTEMPTED"
    assert data["note"] == "Called patient, no answer."
    assert data["referral_id"] == ref.id
    
    # Check it didn't change status
    db_session.refresh(ref)
    assert ref.status == ReferralStatus.SENT

def test_create_event_invalid_code():
    payload = {
        "event": "FOLLOW_UP_ATTEMPTED",
        "note": "Called patient, no answer."
    }
    resp = client.post(f"/api/v1/referrals/INVALID-CODE/events", json=payload)
    assert resp.status_code == 404

def test_create_event_empty_body(db_session):
    ref = create_referral_with_time(db_session, ReferralStatus.SENT, 50)
    payload = {
        "event": "",
        "note": ""
    }
    resp = client.post(f"/api/v1/referrals/{ref.referral_code}/events", json=payload)
    assert resp.status_code == 400

def test_event_appears_in_timeline(db_session):
    ref = create_referral_with_time(db_session, ReferralStatus.SENT, 50)
    payload = {
        "event": "TEST_EVENT",
        "note": "Test Note"
    }
    client.post(f"/api/v1/referrals/{ref.referral_code}/events", json=payload)
    
    resp = client.get(f"/api/v1/referrals/{ref.referral_code}")
    assert resp.status_code == 200
    events = resp.json()["events"]
    assert any(e["event"] == "TEST_EVENT" and e["note"] == "Test Note" for e in events)

def test_timezone_aware(db_session):
    # Testing that it uses UTC correctly
    ref = create_referral_with_time(db_session, ReferralStatus.SENT, 50)
    resp = client.get("/api/v1/referrals/overdue")
    codes = [r["referral_code"] for r in resp.json()]
    assert ref.referral_code in codes

def test_integration_overdue_flow(db_session):
    # 1. Sync referral (Phase 4)
    ref_code = f"CB-{uuid4().hex[:6].upper()}"
    sync_payload = {
        "patient": {
            "name": "Integration Patient",
            "phone": "123456"
        },
        "referral": {
            "referral_code": ref_code,
            "referring_facility": "Clinic",
            "receiving_facility": "Hospital",
            "referral_reason": "Pain"
        }
    }
    resp = client.post("/api/v1/referrals", json=sync_payload)
    assert resp.status_code == 200
    
    # 2. Change status to SENT
    client.patch(f"/api/v1/referrals/{ref_code}", json={"status": "SENT"})
    
    # 3. Modify created_at to be old
    ref = db_session.query(Referral).filter_by(referral_code=ref_code).first()
    ref.created_at = datetime.now(timezone.utc) - timedelta(hours=50)
    db_session.commit()
    
    # 4. Call overdue endpoint
    resp = client.get("/api/v1/referrals/overdue")
    assert ref_code in [r["referral_code"] for r in resp.json()]
    
    # 5. Create follow-up event
    client.post(f"/api/v1/referrals/{ref_code}/events", json={
        "event": "FOLLOW_UP_ATTEMPTED", "note": "Patient called"
    })
    
    # 6. Verify event exists
    resp = client.get(f"/api/v1/referrals/{ref_code}")
    assert "FOLLOW_UP_ATTEMPTED" in [e["event"] for e in resp.json()["events"]]
    
    # 7. Change status to RECEIVED
    client.patch(f"/api/v1/referrals/{ref_code}", json={"status": "RECEIVED"})
    
    # 8. Call overdue endpoint again, verify it's gone
    resp = client.get("/api/v1/referrals/overdue")
    assert ref_code not in [r["referral_code"] for r in resp.json()]
