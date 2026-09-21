from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from backend.database import get_db, engine, Base
from backend.models import Patient, Referral, ReferralStatus
from backend.schemas import ReferralSyncPayload, ReferralResponse

app = FastAPI(title="CareBridge AI Backend")

# Ensure tables are created for SQLite dev usage (Phase 4 testing)
Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "carebridge-backend"}

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

@app.get("/api/v1/referrals/{referral_code}", response_model=ReferralResponse)
def get_referral(referral_code: str, db: Session = Depends(get_db)):
    referral = db.query(Referral).filter(Referral.referral_code == referral_code).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return referral
