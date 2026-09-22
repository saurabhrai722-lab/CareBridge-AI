import io
import pytesseract
from PIL import Image

def extract_text_from_image(image_bytes: bytes) -> dict:
    """
    Extracts fields from a referral document image using OCR.
    If OCR is unavailable (e.g. tesseract not installed), returns a simulated 'UNAVAILABLE' state.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        # Attempt to run OCR. If tesseract is not installed, this will throw an error.
        text = pytesseract.image_to_string(image)
        
        # We will do a very basic parsing based on text. For prototype:
        # We're extracting specific supported fields.
        
        # In a real scenario we'd use regex/NLP to parse fields. 
        # For prototype, we'll try to find keywords or just return empty for clinician to fill.
        
        extracted_fields = {
            "patient_name": {"value": None, "confidence": None},
            "phone": {"value": None, "confidence": None},
            "date_of_birth": {"value": None, "confidence": None},
            "gender": {"value": None, "confidence": None},
            "village": {"value": None, "confidence": None},
            "guardian_name": {"value": None, "confidence": None},
            "referring_facility": {"value": None, "confidence": None},
            "receiving_facility": {"value": None, "confidence": None},
            "referral_reason": {"value": None, "confidence": None}
        }
        
        return {
            "status": "SUCCESS",
            "is_simulated": False,
            "fields": extracted_fields,
            "raw_text": text
        }
    except Exception as e:
        # Fallback if tesseract isn't installed or image is invalid
        extracted_fields = {
            "patient_name": {"value": None, "confidence": None},
            "phone": {"value": None, "confidence": None},
            "date_of_birth": {"value": None, "confidence": None},
            "gender": {"value": None, "confidence": None},
            "village": {"value": None, "confidence": None},
            "guardian_name": {"value": None, "confidence": None},
            "referring_facility": {"value": None, "confidence": None},
            "receiving_facility": {"value": None, "confidence": None},
            "referral_reason": {"value": None, "confidence": None}
        }
        
        return {
            "status": "UNAVAILABLE",
            "is_simulated": True,
            "fields": extracted_fields,
            "detail": f"OCR engine unavailable or unreadable file: {str(e)}"
        }
