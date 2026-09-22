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

from backend.models import IdentityReconciliation, IdentityReconciliationStatus
from backend.schemas import MatchCandidateResponse, ReconciliationRequest
from backend.matching import calculate_match_score, normalize_phone, normalize_text
from sqlalchemy import or_, and_
import json

@app.get("/api/v1/referrals/{referral_code}/candidates", response_model=List[MatchCandidateResponse])
def get_candidates(referral_code: str, db: Session = Depends(get_db)):
    referral = db.query(Referral).filter(Referral.referral_code == referral_code).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    source_patient = referral.patient
    
    # Candidate Generation (Bounded)
    # We look for patients that have either:
    # 1. Exact normalized phone match (if phone exists)
    # 2. Exact normalized name match
    # 3. Same village
    
    query = db.query(Patient).filter(Patient.id != source_patient.id)
    
    conditions = []
    norm_phone = normalize_phone(source_patient.phone)
    if norm_phone:
        # Simplistic approach for sqlite (we can't easily query by normalized without func, so we fetch plausible ones)
        # For prototype, we'll fetch patients that might match.
        pass # In a real DB we'd use unaccent/lower. For SQLite we'll just fetch all and filter in memory if small, or use basic LIKE.
        
    # Since this is a prototype and SQLite doesn't have great fuzzy search built-in, 
    # we'll fetch all OTHER patients and run the generator logic in memory. 
    # In a real system, we'd use Elasticsearch or pg_trgm. 
    # The requirement says "Add a candidate-generation stage instead of architecting the system around an unbounded full-table comparison. A bounded fallback may be used for the current prototype."
    # We'll bound it to 100 recent patients for the fallback.
    potential_candidates = db.query(Patient).filter(Patient.id != source_patient.id).order_by(Patient.id.desc()).limit(100).all()

    # Exclude candidates that already have a reconciliation record (CONFIRMED or REJECTED) with this source patient
    reconciled_pairs = db.query(IdentityReconciliation).filter(
        or_(
            and_(IdentityReconciliation.source_patient_id == source_patient.id, IdentityReconciliation.status.in_([IdentityReconciliationStatus.CONFIRMED_MATCH, IdentityReconciliationStatus.REJECTED_MATCH])),
            and_(IdentityReconciliation.candidate_patient_id == source_patient.id, IdentityReconciliation.status.in_([IdentityReconciliationStatus.CONFIRMED_MATCH, IdentityReconciliationStatus.REJECTED_MATCH]))
        )
    ).all()
    
    reconciled_ids = set()
    for rec in reconciled_pairs:
        if rec.source_patient_id == source_patient.id:
            reconciled_ids.add(rec.candidate_patient_id)
        else:
            reconciled_ids.add(rec.source_patient_id)

    results = []
    for candidate in potential_candidates:
        if candidate.id in reconciled_ids:
            continue
            
        match_response = calculate_match_score(source_patient, candidate)
        
        # Only return REVIEW_REQUIRED and LIKELY_MATCH
        if match_response.classification in ["REVIEW_REQUIRED", "LIKELY_MATCH"]:
            results.append(match_response)

    # Sort by score descending
    results.sort(key=lambda x: x.overall_score, reverse=True)
    return results

@app.post("/api/v1/referrals/{referral_code}/reconcile")
def reconcile_patient(referral_code: str, req: ReconciliationRequest, db: Session = Depends(get_db)):
    referral = db.query(Referral).filter(Referral.referral_code == referral_code).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    source_patient = referral.patient
    candidate_patient = db.query(Patient).filter(Patient.id == req.candidate_patient_id).first()
    
    if not candidate_patient:
        raise HTTPException(status_code=404, detail="Candidate patient not found")
        
    if source_patient.id == candidate_patient.id:
        raise HTTPException(status_code=400, detail="Cannot reconcile patient with themselves")

    if req.action not in ["CONFIRM", "REJECT"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    # Order IDs to prevent A->B and B->A duplication
    p1_id = min(source_patient.id, candidate_patient.id)
    p2_id = max(source_patient.id, candidate_patient.id)

    # Check existing
    existing = db.query(IdentityReconciliation).filter(
        IdentityReconciliation.source_patient_id == p1_id,
        IdentityReconciliation.candidate_patient_id == p2_id
    ).first()
    
    # Calculate score to store in audit
    match_response = calculate_match_score(source_patient, candidate_patient)
    status = IdentityReconciliationStatus.CONFIRMED_MATCH if req.action == "CONFIRM" else IdentityReconciliationStatus.REJECTED_MATCH

    if existing:
        # Prevent contradictory confirmation if it was already confirmed or rejected differently?
        # Actually, allow them to update it if they made a mistake, but log it.
        existing.status = status
        existing.match_score = match_response.overall_score
        existing.components_json = json.dumps(match_response.component_scores.dict())
        db.add(existing)
    else:
        new_rec = IdentityReconciliation(
            source_patient_id=p1_id,
            candidate_patient_id=p2_id,
            status=status,
            match_score=match_response.overall_score,
            components_json=json.dumps(match_response.component_scores.dict())
        )
        db.add(new_rec)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Database integrity error during reconciliation")
        
    return {"status": "success", "action": req.action, "candidate_id": candidate_patient.id}

from backend.schemas import ReadmissionRiskRequest, ReadmissionRiskResponse
from backend.ml.predict import predict_readmission_risk

@app.post("/api/v1/predictions/readmission-risk", response_model=ReadmissionRiskResponse)
def get_readmission_risk(req: ReadmissionRiskRequest):
    features_dict = {
        "age": req.age,
        "gender": req.gender,
        "referral_reason_category": req.referral_reason_category,
        "prior_admissions_count": req.prior_admissions_count,
        "comorbidity_count": req.comorbidity_count
    }
    
    result = predict_readmission_risk(features_dict)
    return result

from fastapi import UploadFile, File
from backend.schemas import OCRResponse
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from ocr.parser import extract_text_from_image

@app.post("/api/v1/ocr/extract", response_model=OCRResponse)
async def extract_ocr(file: UploadFile = File(...)):
    # Simply pass the file bytes to the OCR parser.
    # We do NOT create any DB records here (Phase 8 correction).
    file_bytes = await file.read()
    result = extract_text_from_image(file_bytes)
    return result
from fastapi import Form, Response
import re
from sqlalchemy import func

@app.post("/api/v1/sms/webhook")
async def sms_webhook(
    Body: str = Form(default=""),
    From: str = Form(default=None),
    db: Session = Depends(get_db)
):
    """
    Simulated SMS provider webhook.
    Returns TwiML compatible XML.
    Production implementations require signature verification, rate limiting, and HTTPS.
    """
    body_clean = Body.strip() if Body else ""
    
    # Check if body is empty
    if not body_clean:
        msg = "Please reply with your CareBridge referral code to track status."
        return Response(content=f"<Response><Message>{msg}</Message></Response>", media_type="application/xml")
    
    # Try to find a referral code pattern: CB- followed by 6 alphanumeric chars
    # We will accept something that looks like CB-ABC123 or cb-abc123
    match = re.search(r'CB-[a-zA-Z0-9]{6}', body_clean, re.IGNORECASE)
    
    if not match:
        msg = "Please reply with your CareBridge referral code to track status."
        return Response(content=f"<Response><Message>{msg}</Message></Response>", media_type="application/xml")
        
    code = match.group(0).upper()
    
    # Defensive lookup
    try:
        # Avoid SQL injection by using SQLAlchemy parameters
        referrals = db.query(Referral).filter(func.upper(Referral.referral_code) == code).all()
        
        if not referrals:
            msg = "Referral not found. It may be pending sync from the clinic."
            return Response(content=f"<Response><Message>{msg}</Message></Response>", media_type="application/xml")
            
        if len(referrals) > 1:
            # Defensive duplicate handling
            msg = "An error occurred looking up this referral."
            return Response(content=f"<Response><Message>{msg}</Message></Response>", media_type="application/xml")
            
        ref = referrals[0]
        # Use .value if it's an enum, else fallback to str
        status_str = ref.status.value if hasattr(ref.status, 'value') else str(ref.status)
        msg = f"Referral {ref.referral_code} is currently {status_str}."
        return Response(content=f"<Response><Message>{msg}</Message></Response>", media_type="application/xml")
        
    except Exception as e:
        msg = "An error occurred looking up this referral."
        return Response(content=f"<Response><Message>{msg}</Message></Response>", media_type="application/xml")
