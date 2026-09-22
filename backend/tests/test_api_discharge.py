import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.main import app
from backend.database import get_db, Base, engine
from backend.models import Referral, Patient, ReferralStatus, ReferralEvent
from unittest import mock

client = TestClient(app)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        yield db
    finally:
        db.query(ReferralEvent).delete()
        db.query(Referral).delete()
        db.query(Patient).delete()
        db.commit()

def create_referral_in_status(db: Session, status: ReferralStatus, code: str):
    p = Patient(name=f"Patient {code}", phone="123")
    db.add(p)
    db.flush()
    r = Referral(
        referral_code=code,
        patient_id=p.id,
        referring_facility="Clinic",
        receiving_facility="Hospital",
        status=status
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

def test_discharge_admitted(db_session):
    r = create_referral_in_status(db_session, ReferralStatus.ADMITTED, "CB-ADMIT")
    response = client.post(f"/api/v1/referrals/{r.referral_code}/discharge", json={"note": "Test note"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "DISCHARGED"
    
    # Verify in DB
    db_session.refresh(r)
    assert r.status == ReferralStatus.DISCHARGED
    events = db_session.query(ReferralEvent).filter_by(referral_id=r.id).all()
    assert len(events) == 1
    assert events[0].event == "DISCHARGED"
    assert events[0].note == "Test note"

def test_invalid_transitions(db_session):
    statuses = [
        (ReferralStatus.SENT, "CB-SENT"),
        (ReferralStatus.RECEIVED, "CB-REC"),
        (ReferralStatus.UNDER_REVIEW, "CB-REV"),
        (ReferralStatus.DISCHARGED, "CB-DIS"),
        (ReferralStatus.COMPLETED, "CB-COM")
    ]
    for status, code in statuses:
        r = create_referral_in_status(db_session, status, code)
        resp = client.post(f"/api/v1/referrals/{r.referral_code}/discharge", json={"note": "Note"})
        assert resp.status_code == 400
        assert "Invalid transition" in resp.json()["detail"]
        db_session.refresh(r)
        assert r.status == status # Should not change
        events = db_session.query(ReferralEvent).filter_by(referral_id=r.id).all()
        assert len(events) == 0

def test_nonexistent_referral():
    resp = client.post("/api/v1/referrals/BOGUS/discharge", json={"note": "Note"})
    assert resp.status_code == 404

def test_empty_note(db_session):
    r = create_referral_in_status(db_session, ReferralStatus.ADMITTED, "CB-ADMIT2")
    resp = client.post(f"/api/v1/referrals/{r.referral_code}/discharge", json={"note": ""})
    assert resp.status_code == 400
    
    resp = client.post(f"/api/v1/referrals/{r.referral_code}/discharge", json={"note": "   "})
    assert resp.status_code == 400
    
    db_session.refresh(r)
    assert r.status == ReferralStatus.ADMITTED

def test_transaction_atomicity(db_session, monkeypatch):
    r = create_referral_in_status(db_session, ReferralStatus.ADMITTED, "CB-ATOMIC")
    
    # We will mock db.commit to raise an exception inside the endpoint
    # to simulate a failure after status has been changed in memory and event added to session
    original_commit = Session.commit
    
    def mock_commit(self):
        if len(self.new) > 0 and isinstance(list(self.new)[0], ReferralEvent):
            # Only fail when we are trying to commit the ReferralEvent
            raise Exception("Simulated DB failure")
        return original_commit(self)
        
    monkeypatch.setattr("sqlalchemy.orm.Session.commit", mock_commit)
    
    resp = client.post(f"/api/v1/referrals/{r.referral_code}/discharge", json={"note": "Atomic test"})
    assert resp.status_code == 500
    
    # Reload from fresh session to ensure nothing was persisted
    db_session.expire_all()
    r_check = db_session.query(Referral).filter_by(referral_code="CB-ATOMIC").first()
    assert r_check.status == ReferralStatus.ADMITTED
    events = db_session.query(ReferralEvent).filter_by(referral_id=r_check.id).all()
    assert len(events) == 0

def test_existing_patch_behavior(db_session):
    # Verify that generic PATCH still allows UNDER_REVIEW -> DISCHARGED as per VALID_TRANSITIONS
    r = create_referral_in_status(db_session, ReferralStatus.UNDER_REVIEW, "CB-PATCH")
    resp = client.patch(f"/api/v1/referrals/{r.referral_code}", json={"status": "DISCHARGED"})
    assert resp.status_code == 200
    
    db_session.refresh(r)
    assert r.status == ReferralStatus.DISCHARGED

def test_existing_event_endpoint(db_session):
    r = create_referral_in_status(db_session, ReferralStatus.ADMITTED, "CB-EVENT")
    resp = client.post(f"/api/v1/referrals/{r.referral_code}/events", json={"event": "CHECKUP", "note": "Checked"})
    assert resp.status_code == 200
    
    events = db_session.query(ReferralEvent).filter_by(referral_id=r.id).all()
    assert len(events) == 1
    assert events[0].event == "CHECKUP"
