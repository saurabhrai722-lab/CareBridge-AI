from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime

class PatientBase(BaseModel):
    name: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    village: Optional[str] = None
    guardian_name: Optional[str] = None

class ReferralBase(BaseModel):
    referral_code: str
    referring_facility: str
    receiving_facility: str
    referral_reason: Optional[str] = None

class ReferralSyncPayload(BaseModel):
    patient: PatientBase
    referral: ReferralBase

class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ReferralResponse(ReferralBase):
    id: int
    patient_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ReferralEventResponse(BaseModel):
    id: int
    referral_id: int
    event: str
    note: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ReferralDetailResponse(ReferralResponse):
    patient: PatientResponse
    events: list[ReferralEventResponse] = []
    model_config = ConfigDict(from_attributes=True)

class ReferralStatusUpdate(BaseModel):
    status: str

class MatchComponentScores(BaseModel):
    name: float
    phone: float
    age_dob: float
    village: float
    guardian: float
    gender: float

class MatchCandidateResponse(BaseModel):
    candidate_patient: PatientResponse
    overall_score: float
    classification: str
    component_scores: MatchComponentScores
    unavailable_fields: list[str]
    conflicting_fields: list[str]
    existing_reconciliation_status: Optional[str] = None

class ReconciliationRequest(BaseModel):
    candidate_patient_id: int
    action: Literal['CONFIRM', 'REJECT']

# Phase 7 Schemas
class ReadmissionRiskRequest(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    referral_reason_category: Optional[str] = None
    prior_admissions_count: Optional[int] = None
    comorbidity_count: Optional[int] = None

class ShapExplanation(BaseModel):
    feature: str
    contribution: float
    description: str

class ReadmissionRiskResponse(BaseModel):
    status: str
    missing_features: Optional[List[str]] = None
    detail: Optional[str] = None
    risk_score: Optional[float] = None
    risk_category: Optional[str] = None
    base_value: Optional[float] = None
    shap_values: Optional[List[ShapExplanation]] = None

# Phase 8 Schemas
class OCRFieldResponse(BaseModel):
    value: Optional[str] = None
    confidence: Optional[float] = None

class OCRFields(BaseModel):
    patient_name: OCRFieldResponse
    phone: OCRFieldResponse
    date_of_birth: OCRFieldResponse
    gender: OCRFieldResponse
    village: OCRFieldResponse
    guardian_name: OCRFieldResponse
    referring_facility: OCRFieldResponse
    receiving_facility: OCRFieldResponse
    referral_reason: OCRFieldResponse

class OCRResponse(BaseModel):
    status: str
    is_simulated: bool
    fields: OCRFields
    detail: Optional[str] = None

