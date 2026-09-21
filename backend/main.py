import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from backend.database import get_db, engine, Base
from backend.models import Patient, Referral, ReferralStatus, ReferralEvent
from backend.schemas import (
    ReferralSyncPayload, 
    ReferralResponse, 
    ReferralDetailResponse, 
    ReferralStatusUpdate
)

app = FastAPI(title="CareBridge AI Backend")

# Configure CORS
# Allow origins configured by CORS_ORIGINS env, fallback to dashboard dev server
cors_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure tables are created for SQLite dev usage (Phase 4 & 5 testing)
Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "carebridge-backend"}

@app.get("/api/v1/referrals", response_model=List[ReferralDetailResponse])
def list_referrals(db: Session = Depends(get_db)):
    referrals = db.query(Referral).order_by(Referral.created_at.desc()).limit(50).all()
    return referrals

@app.post("/api/v1/referrals", response_model=ReferralResponse)
def sync_referral(payload: ReferralSyncPayload, db: Session = Depends(get_db)):
    # Helper to check conflict
    def check_conflict(existing: Referral) -> bool:
        if not existing:
            return False
        ep = existing.patient
        if (existing.referring_facility != payload.referral.referring_facility or
            existing.receiving_facility != payload.referral.receiving_facility or
            ep.name != payload.patient.name):
            return True
        return False

    # 1. Idempotency Check
    existing_referral = db.query(Referral).filter(Referral.referral_code == payload.referral.referral_code).first()
    if existing_referral:
        if check_conflict(existing_referral):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Referral code exists with conflicting data")
        return existing_referral

    # 2. Create Patient and Referral
    patient = Patient(
        name=payload.patient.name,
        phone=payload.patient.phone,
        date_of_birth=payload.patient.date_of_birth,
        gender=payload.patient.gender,
        village=payload.patient.village,
        guardian_name=payload.patient.guardian_name
    )
    db.add(patient)
    db.flush() # To get patient.id

    referral = Referral(
        referral_code=payload.referral.referral_code,
        patient_id=patient.id,
        referring_facility=payload.referral.referring_facility,
        receiving_facility=payload.referral.receiving_facility,
        referral_reason=payload.referral.referral_reason,
        status=ReferralStatus.CREATED
    )
    db.add(referral)
    
    try:
        db.commit()
        db.refresh(referral)
        return referral
    except IntegrityError:
        db.rollback()
        # In case of concurrent request creating the exact same referral_code
        existing = db.query(Referral).filter(Referral.referral_code == payload.referral.referral_code).first()
        if existing:
            if check_conflict(existing):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Referral code exists with conflicting data")
            return existing
        raise HTTPException(status_code=400, detail="Database integrity error")

@app.get("/api/v1/referrals/{referral_code}", response_model=ReferralDetailResponse)
def get_referral(referral_code: str, db: Session = Depends(get_db)):
    referral = db.query(Referral).filter(Referral.referral_code == referral_code).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return referral

# Define valid transitions dictionary
VALID_TRANSITIONS = {
    ReferralStatus.CREATED: [ReferralStatus.SENT, ReferralStatus.RECEIVED, ReferralStatus.COMPLETED],
    ReferralStatus.SENT: [ReferralStatus.RECEIVED, ReferralStatus.COMPLETED],
    ReferralStatus.RECEIVED: [ReferralStatus.UNDER_REVIEW, ReferralStatus.ADMITTED, ReferralStatus.DISCHARGED, ReferralStatus.COMPLETED],
    ReferralStatus.UNDER_REVIEW: [ReferralStatus.ADMITTED, ReferralStatus.DISCHARGED, ReferralStatus.COMPLETED],
    ReferralStatus.ADMITTED: [ReferralStatus.DISCHARGED, ReferralStatus.COMPLETED],
    ReferralStatus.DISCHARGED: [ReferralStatus.COMPLETED],
    ReferralStatus.COMPLETED: []
}

@app.patch("/api/v1/referrals/{referral_code}", response_model=ReferralDetailResponse)
def update_referral_status(referral_code: str, update: ReferralStatusUpdate, db: Session = Depends(get_db)):
    referral = db.query(Referral).filter(Referral.referral_code == referral_code).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    try:
        new_status = ReferralStatus(update.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")

    current_status = referral.status
    if current_status == new_status:
        return referral # No change
        
    allowed_next_states = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed_next_states:
        raise HTTPException(status_code=400, detail=f"Invalid transition from {current_status.value} to {new_status.value}")

    referral.status = new_status
    
    event = ReferralEvent(
        referral_id=referral.id,
        event=f"Status changed to {new_status.value}",
        note=f"Transitioned from {current_status.value} to {new_status.value}"
    )
    db.add(event)

    try:
        db.commit()
        db.refresh(referral)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database update failed")
        
    return referral
