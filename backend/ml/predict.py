import os
import joblib
import pandas as pd
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
PIPELINE_PATH = os.path.join(MODEL_DIR, "pipeline_v1.joblib")
EXPLAINER_PATH = os.path.join(MODEL_DIR, "explainer_v1.joblib")
FEATURE_NAMES_PATH = os.path.join(MODEL_DIR, "feature_names_v1.joblib")

_pipeline = None
_explainer = None
_feature_names = None

def load_models():
    """Load models lazily into memory"""
    global _pipeline, _explainer, _feature_names
    if _pipeline is None:
        if not os.path.exists(PIPELINE_PATH):
            raise FileNotFoundError("Model pipeline not found. Run training script first.")
        _pipeline = joblib.load(PIPELINE_PATH)
        _explainer = joblib.load(EXPLAINER_PATH)
        _feature_names = joblib.load(FEATURE_NAMES_PATH)

def predict_readmission_risk(features_dict: dict):
    """
    Predict readmission risk and return SHAP explanations.
    """
    load_models()
    
    # Check for missing required features (excluding noise)
    required_features = ["age", "gender", "referral_reason_category", "prior_admissions_count", "comorbidity_count"]
    missing = [f for f in required_features if features_dict.get(f) is None]
    if missing:
        return {
            "status": "INSUFFICIENT_FEATURES",
            "missing_features": missing,
            "detail": "Cannot perform prediction. Required clinical features are unavailable."
        }
    
    # Ensure noise_feature exists in input since the pipeline expects it
    if "noise_feature" not in features_dict:
        features_dict["noise_feature"] = 0.5
        
    df = pd.DataFrame([features_dict])
    
    # Extract preprocessor from pipeline
    preprocessor = _pipeline.named_steps["preprocessor"]
    
    # Transform features
    df_transformed = preprocessor.transform(df)
    
    # Get probability
    # model.predict_proba returns [[prob_0, prob_1]]
    model = _pipeline.named_steps["classifier"]
    prob = model.predict_proba(df_transformed)[0, 1]
    
    # Calculate SHAP values for the transformed data
    shap_values_raw = _explainer.shap_values(df_transformed)
    
    # TreeExplainer with model_output="probability" and RFC:
    # shape of shap_values_raw depends on SHAP version and model. 
    # For binary classification it's usually a list of two arrays [shap_class_0, shap_class_1] or just an array for class 1
    if isinstance(shap_values_raw, list):
        shap_vals = shap_values_raw[1][0]
        base_value = _explainer.expected_value[1]
    else:
        # shap >= 0.40 sometimes returns a single array with shape (1, num_features, 2)
        if len(shap_values_raw.shape) == 3:
            shap_vals = shap_values_raw[0, :, 1]
            if isinstance(_explainer.expected_value, (list, np.ndarray)):
                base_value = _explainer.expected_value[1]
            else:
                base_value = _explainer.expected_value
        else:
            shap_vals = shap_values_raw[0]
            if isinstance(_explainer.expected_value, (list, np.ndarray)):
                base_value = _explainer.expected_value[1]
            else:
                base_value = _explainer.expected_value
    
    # Ensure base_value is a scalar float
    if isinstance(base_value, np.ndarray):
        base_value = base_value.item()

    # Create SHAP response mapping
    shap_explanations = []
    for fname, sval in zip(_feature_names, shap_vals):
        if fname == "noise_feature":
            continue # Don't show noise feature to user
            
        desc = "increased the model's estimated risk" if sval > 0 else "decreased the model's estimated risk"
        if abs(sval) > 0.01: # Filter out near-zero contributions for UX
            shap_explanations.append({
                "feature": fname,
                "contribution": float(sval),
                "description": desc
            })
            
    # Sort by absolute contribution magnitude (descending)
    shap_explanations.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    
    if prob < 0.3:
        category = "LOW"
    elif prob < 0.6:
        category = "MEDIUM"
    else:
        category = "HIGH"

    return {
        "status": "SUCCESS",
        "risk_score": float(prob),
        "risk_category": category,
        "base_value": float(base_value),
        "shap_values": shap_explanations
    }
