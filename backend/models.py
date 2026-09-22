import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Text, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database import Base

class ReferralStatus(str, enum.Enum):
    CREATED = "CREATED"
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ADMITTED = "ADMITTED"
    DISCHARGED = "DISCHARGED"
    COMPLETED = "COMPLETED"

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    village = Column(String, nullable=True)
    guardian_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    referrals = relationship("Referral", back_populates="patient", cascade="all, delete-orphan")

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    referral_code = Column(String, unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    referring_facility = Column(String, nullable=False)
    receiving_facility = Column(String, nullable=False)
    referral_reason = Column(Text, nullable=True)
    status = Column(Enum(ReferralStatus), default=ReferralStatus.CREATED, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="referrals")
    events = relationship("ReferralEvent", back_populates="referral", cascade="all, delete-orphan")

class ReferralEvent(Base):
    __tablename__ = "referral_events"

    id = Column(Integer, primary_key=True, index=True)
    referral_id = Column(Integer, ForeignKey("referrals.id", ondelete="CASCADE"), nullable=False, index=True)
    event = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    referral = relationship("Referral", back_populates="events")

class IdentityReconciliationStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    CONFIRMED_MATCH = "CONFIRMED_MATCH"
    REJECTED_MATCH = "REJECTED_MATCH"

class IdentityReconciliation(Base):
    __tablename__ = "identity_reconciliations"

    id = Column(Integer, primary_key=True, index=True)
    source_patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(IdentityReconciliationStatus), default=IdentityReconciliationStatus.PENDING_REVIEW, nullable=False)
    match_score = Column(Float, nullable=False)
    components_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    source_patient = relationship("Patient", foreign_keys=[source_patient_id])
    candidate_patient = relationship("Patient", foreign_keys=[candidate_patient_id])

    __table_args__ = (
        UniqueConstraint(
            'source_patient_id', 
            'candidate_patient_id', 
            name='uq_identity_reconciliation_source_candidate'
        ),
    )
