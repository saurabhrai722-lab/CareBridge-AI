import numpy as np
import pandas as pd

def generate_synthetic_data(num_samples: int = 1500, seed: int = 42) -> pd.DataFrame:
    """
    Generate deterministic synthetic data for readmission risk modeling.
    Simulates non-linear relationships, missing values, and realistic noise.
    """
    np.random.seed(seed)
    
    # 1. Age: 18 to 90
    age = np.random.normal(loc=55, scale=15, size=num_samples)
    age = np.clip(age, 18, 90).astype(int)
    
    # 2. Gender: Male, Female
    gender = np.random.choice(["Male", "Female"], size=num_samples, p=[0.5, 0.5])
    
    # 3. Prior Admissions Count: 0 to 5
    prior_admissions = np.random.poisson(lam=0.8, size=num_samples)
    prior_admissions = np.clip(prior_admissions, 0, 5)
    
    # 4. Comorbidity Count: 0 to 5
    # Correlated slightly with age
    base_comorb = np.random.poisson(lam=0.5, size=num_samples)
    age_factor = (age > 65).astype(int) + (age > 75).astype(int)
    comorbidity_count = np.clip(base_comorb + age_factor, 0, 5)
    
    # Introduce some missing values to test robustness (approx 5% missing)
    mask = np.random.rand(num_samples) < 0.05
    comorbidity_count_with_nans = comorbidity_count.astype(float)
    comorbidity_count_with_nans[mask] = np.nan
    
    # 5. Referral Reason Category
    reasons = ["CARDIAC", "RESPIRATORY", "NEUROLOGICAL", "ORTHOPEDIC", "OTHER"]
    referral_reason = np.random.choice(reasons, size=num_samples, p=[0.25, 0.2, 0.15, 0.2, 0.2])
    
    # 6. Uninformative Feature (Noise) to ensure model doesn't overfit
    noise_feature = np.random.rand(num_samples)
    
    # Calculate underlying Readmission Risk (Log-Odds)
    # Target definition: 30-day readmission
    
    # Base risk (low)
    log_odds = -2.5
    
    # Age factor: sharp increase after 70
    log_odds += np.where(age > 70, (age - 70) * 0.05, 0)
    
    # Prior admissions: strong linear effect
    log_odds += prior_admissions * 0.6
    
    # Comorbidity: strong effect
    log_odds += comorbidity_count * 0.4
    
    # Non-linear interaction: high age AND high comorbidity
    interaction = ((age > 75) & (comorbidity_count >= 3)).astype(float)
    log_odds += interaction * 1.2
    
    # Reason factor
    reason_effects = {
        "CARDIAC": 0.8,
        "RESPIRATORY": 0.6,
        "NEUROLOGICAL": 0.4,
        "ORTHOPEDIC": -0.5,
        "OTHER": 0.0
    }
    for i, r in enumerate(referral_reason):
        log_odds[i] += reason_effects[r]
        
    # Gender effect: slight increase for male
    log_odds += np.where(gender == "Male", 0.1, 0.0)
    
    # Add gaussian noise (unexplained variance)
    log_odds += np.random.normal(loc=0, scale=0.8, size=num_samples)
    
    # Convert log-odds to probability
    prob = 1 / (1 + np.exp(-log_odds))
    
    # Target generation (1 = readmitted within 30 days)
    is_readmitted_30d = (np.random.rand(num_samples) < prob).astype(int)
    
    # Create DataFrame
    df = pd.DataFrame({
        "age": age,
        "gender": gender,
        "prior_admissions_count": prior_admissions,
        "comorbidity_count": comorbidity_count_with_nans,
        "referral_reason_category": referral_reason,
        "noise_feature": noise_feature,
        "is_readmitted_30d": is_readmitted_30d
    })
    
    return df
