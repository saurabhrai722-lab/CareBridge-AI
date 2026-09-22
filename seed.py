from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Patient, Referral, ReferralStatus
import uuid

def seed():
    db: Session = SessionLocal()
    
    p1 = Patient(name="Arjun Singh", phone="9876543210")
    db.add(p1)
    db.commit()
    db.refresh(p1)
    
    r1 = Referral(
        referral_code=str(uuid.uuid4())[:8],
        patient_id=p1.id,
        referring_facility="Clinic X",
        receiving_facility="Hospital Y",
        status=ReferralStatus.CREATED
    )
    db.add(r1)
    
    p2 = Patient(name="Arjun Sing", phone="9876543210")
    db.add(p2)
    db.commit()
    db.refresh(p2)
    
    r2 = Referral(
        referral_code=str(uuid.uuid4())[:8],
        patient_id=p2.id,
        referring_facility="Clinic Z",
        receiving_facility="Hospital W",
        status=ReferralStatus.CREATED
    )
    db.add(r2)
    
    db.commit()
    print("Database seeded!")

if __name__ == "__main__":
    seed()
