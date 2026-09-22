import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db, Base, engine
from backend.models import Patient, Referral, ReferralStatus, ReferralEvent
from uuid import uuid4

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
    patient = Patient(name="Outcome Test Patient", phone="555-1234", gender="F")
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

def test_get_outcome_not_found():
    resp = client.get("/api/v1/referrals/INVALID_CODE/outcome")
    assert resp.status_code == 404

def test_get_outcome_pending(db_session):
    patient = generate_patient(db_session)
    ref_code = f"CB-{uuid4().hex[:6].upper()}"
    referral = Referral(
        referral_code=ref_code,
        patient_id=patient.id,
        referring_facility="Clinic",
        receiving_facility="Hospital",
        status=ReferralStatus.SENT,
    )
    db_session.add(referral)
    db_session.commit()

    resp = client.get(f"/api/v1/referrals/{ref_code}/outcome")
    assert resp.status_code == 200
    data = resp.json()
    assert data["referral_code"] == ref_code
    assert data["status"] == "SENT"
    assert data["outcome_note"] is None

def test_get_outcome_completed(db_session):
    patient = generate_patient(db_session)
    ref_code = f"CB-{uuid4().hex[:6].upper()}"
    referral = Referral(
        referral_code=ref_code,
        patient_id=patient.id,
        referring_facility="Clinic",
        receiving_facility="Hospital",
        status=ReferralStatus.DISCHARGED,
    )
    db_session.add(referral)
    db_session.commit()
    db_session.refresh(referral)

    event = ReferralEvent(
        referral_id=referral.id,
        event="DISCHARGED",
        note="Patient recovered."
    )
    db_session.add(event)
    db_session.commit()

    resp = client.get(f"/api/v1/referrals/{ref_code}/outcome")
    assert resp.status_code == 200
    data = resp.json()
    assert data["referral_code"] == ref_code
    assert data["status"] == "DISCHARGED"
    assert data["outcome_note"] == "Patient recovered."
