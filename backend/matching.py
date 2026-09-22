import re
from rapidfuzz import fuzz, utils
from backend.models import Patient
from backend.schemas import MatchCandidateResponse, MatchComponentScores

def normalize_text(text: str) -> str:
    if not text:
        return ""
    cleaned = utils.default_process(text)
    cleaned = re.sub(r'[^\w\s]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    return re.sub(r'\D', '', phone)

def calculate_match_score(source: Patient, candidate: Patient) -> MatchCandidateResponse:
    component_scores = {
        "name": 0.0,
        "phone": 0.0,
        "age_dob": 0.0,
        "village": 0.0,
        "guardian": 0.0,
        "gender": 0.0
    }
    
    unavailable = []
    conflicting = []
    
    # 1. Name Similarity (Weight: 40%)
    name_src = normalize_text(source.name)
    name_cand = normalize_text(candidate.name)
    if name_src and name_cand:
        name_score = fuzz.QRatio(name_src, name_cand) / 100.0
        component_scores["name"] = name_score
    else:
        unavailable.append("name")

    # 2. Phone Similarity (Weight: 30%)
    phone_src = normalize_phone(source.phone)
    phone_cand = normalize_phone(candidate.phone)
    if phone_src and phone_cand:
        if phone_src == phone_cand:
            component_scores["phone"] = 1.0
        else:
            component_scores["phone"] = 0.0
            conflicting.append("phone")
    else:
        unavailable.append("phone")

    # 3. Age/DOB (Weight: 20%)
    dob_src = source.date_of_birth
    dob_cand = candidate.date_of_birth
    if dob_src and dob_cand:
        # Simple string comparison for now. A real system would parse and compare dates.
        if dob_src == dob_cand:
            component_scores["age_dob"] = 1.0
        else:
            component_scores["age_dob"] = 0.0
            conflicting.append("date_of_birth")
    else:
        unavailable.append("date_of_birth")

    # 4. Village (Weight: 5%)
    vill_src = normalize_text(source.village)
    vill_cand = normalize_text(candidate.village)
    if vill_src and vill_cand:
        vill_score = fuzz.QRatio(vill_src, vill_cand) / 100.0
        component_scores["village"] = vill_score
    else:
        unavailable.append("village")

    # 5. Guardian (Weight: 5%)
    guard_src = normalize_text(source.guardian_name)
    guard_cand = normalize_text(candidate.guardian_name)
    if guard_src and guard_cand:
        guard_score = fuzz.QRatio(guard_src, guard_cand) / 100.0
        component_scores["guardian"] = guard_score
    else:
        unavailable.append("guardian_name")
        
    # 6. Gender (Weight: 0% to score, but can conflict)
    gender_src = normalize_text(source.gender)
    gender_cand = normalize_text(candidate.gender)
    if gender_src and gender_cand:
        if gender_src == gender_cand:
            component_scores["gender"] = 1.0
        else:
            component_scores["gender"] = 0.0
            conflicting.append("gender")
    else:
        unavailable.append("gender")

    # Calculate overall weighted score based ONLY on available fields
    # Weights for available components
    weights = {
        "name": 0.40,
        "phone": 0.30,
        "age_dob": 0.20,
        "village": 0.05,
        "guardian": 0.05
    }
    
    total_weight = 0.0
    weighted_sum = 0.0
    
    # We only sum weights of fields that are NOT unavailable
    if "name" not in unavailable:
        total_weight += weights["name"]
        weighted_sum += component_scores["name"] * weights["name"]
        
    if "phone" not in unavailable:
        total_weight += weights["phone"]
        weighted_sum += component_scores["phone"] * weights["phone"]
        
    if "date_of_birth" not in unavailable:
        total_weight += weights["age_dob"]
        weighted_sum += component_scores["age_dob"] * weights["age_dob"]
        
    if "village" not in unavailable:
        total_weight += weights["village"]
        weighted_sum += component_scores["village"] * weights["village"]
        
    if "guardian_name" not in unavailable:
        total_weight += weights["guardian"]
        weighted_sum += component_scores["guardian"] * weights["guardian"]

    # Base score
    overall_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    # Penalties for strong conflicts
    if "phone" in conflicting:
        overall_score -= 0.3
    if "date_of_birth" in conflicting:
        overall_score -= 0.2
    if "gender" in conflicting:
        overall_score -= 0.1
        
    overall_score = max(0.0, min(1.0, overall_score))

    # Classification
    classification = "NO_MATCH"
    if overall_score >= 0.85:
        # Prevent high score from name alone
        if component_scores["name"] > 0.9 and ("phone" in unavailable and "date_of_birth" in unavailable):
             classification = "REVIEW_REQUIRED"
        else:
             classification = "LIKELY_MATCH"
    elif overall_score >= 0.65:
        classification = "REVIEW_REQUIRED"
        
    # If there are strong conflicting signals, downgrade LIKELY_MATCH to REVIEW_REQUIRED or NO_MATCH
    if len(conflicting) > 0 and classification == "LIKELY_MATCH":
        classification = "REVIEW_REQUIRED"

    return MatchCandidateResponse(
        candidate_patient=candidate, # Need to make sure this can be serialized correctly later
        overall_score=overall_score,
        classification=classification,
        component_scores=MatchComponentScores(
            name=component_scores["name"],
            phone=component_scores["phone"],
            age_dob=component_scores["age_dob"],
            village=component_scores["village"],
            guardian=component_scores["guardian"],
            gender=component_scores["gender"],
        ),
        unavailable_fields=unavailable,
        conflicting_fields=conflicting,
        existing_reconciliation_status=None # Set in API
    )
