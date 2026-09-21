from pydantic import BaseModel, ConfigDict
from typing import Optional
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
