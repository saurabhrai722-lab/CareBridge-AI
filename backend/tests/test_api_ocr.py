import pytest
import io
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import Patient, Referral
from backend.database import get_db, Base, engine

def setup_module():
    Base.metadata.create_all(bind=engine)

def teardown_module():
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_ocr_extract_success():
    # Test valid image extraction (using mock image)
    # The actual tesseract logic might fail if not installed, but it should return UNAVAILABLE status safely.
    
    # Create dummy image
    from PIL import Image
    img = Image.new('RGB', (60, 30), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr = img_byte_arr.getvalue()
    
    files = {"file": ("test.png", img_byte_arr, "image/png")}
    response = client.post("/api/v1/ocr/extract", files=files)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] in ["SUCCESS", "UNAVAILABLE"]
    assert "fields" in data
    
    # Check that it returns supported fields
    fields = data["fields"]
    assert "patient_name" in fields
    assert "phone" in fields
    assert "date_of_birth" in fields
    assert "gender" in fields
    assert "village" in fields
    assert "referring_facility" in fields
    
def test_ocr_does_not_create_records():
    # Safety test: Make sure OCR extract does not modify DB
    db = next(get_db())
    patient_count_before = db.query(Patient).count()
    referral_count_before = db.query(Referral).count()
    
    img = io.BytesIO(b"fake_image_bytes")
    files = {"file": ("test.png", img, "image/png")}
    client.post("/api/v1/ocr/extract", files=files)
    
    patient_count_after = db.query(Patient).count()
    referral_count_after = db.query(Referral).count()
    
    assert patient_count_before == patient_count_after
    assert referral_count_before == referral_count_after
