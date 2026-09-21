import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine

from backend.database import Base
from backend.models import Patient, Referral, ReferralEvent, ReferralStatus

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_patient(db_session):
    patient = Patient(name="John Doe", phone="1234567890", gender="Male")
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    
    assert patient.id is not None
    assert patient.name == "John Doe"
    assert patient.created_at is not None

def test_create_referral(db_session):
    patient = Patient(name="Jane Doe")
    db_session.add(patient)
    db_session.commit()
    
    referral = Referral(
        referral_code="REF123",
        patient_id=patient.id,
        referring_facility="Clinic A",
        receiving_facility="Hospital B",
        status=ReferralStatus.CREATED
    )
    db_session.add(referral)
    db_session.commit()
    db_session.refresh(referral)
    
    assert referral.id is not None
    assert referral.patient_id == patient.id
    assert referral.patient.name == "Jane Doe"

def test_create_referral_event(db_session):
    patient = Patient(name="Alice")
    db_session.add(patient)
    db_session.commit()
    
    referral = Referral(
        referral_code="REF456",
        patient_id=patient.id,
        referring_facility="Clinic C",
        receiving_facility="Hospital D",
    )
    db_session.add(referral)
    db_session.commit()
    
    event = ReferralEvent(
        referral_id=referral.id,
        event="Referral Sent",
        note="Patient is critical"
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)
    
    assert event.id is not None
    assert event.referral.referral_code == "REF456"
    assert event.referral.patient.name == "Alice"

def test_referral_code_uniqueness(db_session):
    patient = Patient(name="Bob")
    db_session.add(patient)
    db_session.commit()
    
    ref1 = Referral(
        referral_code="DUP123",
        patient_id=patient.id,
        referring_facility="F1",
        receiving_facility="F2"
    )
    db_session.add(ref1)
    db_session.commit()
    
    ref2 = Referral(
        referral_code="DUP123",
        patient_id=patient.id,
        referring_facility="F1",
        receiving_facility="F2"
    )
    db_session.add(ref2)
    with pytest.raises(Exception):
        db_session.commit()
    db_session.rollback()

def test_foreign_key_enforcement(db_session):
    invalid_referral = Referral(
        referral_code="INV123",
        patient_id=999,
        referring_facility="F1",
        receiving_facility="F2"
    )
    db_session.add(invalid_referral)
    with pytest.raises(Exception) as exc:
        db_session.commit()
    
    assert "FOREIGN KEY constraint failed" in str(exc.value)
    db_session.rollback()
