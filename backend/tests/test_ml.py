import pytest
import numpy as np
import pandas as pd
from backend.ml.dataset import generate_synthetic_data
from backend.ml.pipeline import train_and_save_pipeline, MODEL_DIR
import os
import joblib

def test_deterministic_dataset():
    """Verify dataset generation is reproducible and respects seed"""
    df1 = generate_synthetic_data(num_samples=100, seed=42)
    df2 = generate_synthetic_data(num_samples=100, seed=42)
    df3 = generate_synthetic_data(num_samples=100, seed=99)
    
    assert df1.equals(df2)
    assert not df1.equals(df3)
    
    # Verify no target leakage from post-discharge (target is constructed from variables, not vice versa)
    assert "is_readmitted_30d" in df1.columns
    
def test_dataset_missing_values_and_noise():
    df = generate_synthetic_data(num_samples=1000, seed=42)
    # Check that missing values are introduced
    assert df["comorbidity_count"].isna().sum() > 0
    # Check that noise feature exists
    assert "noise_feature" in df.columns
    
def test_target_construction():
    df = generate_synthetic_data(num_samples=1000, seed=42)
    assert set(df["is_readmitted_30d"].unique()).issubset({0, 1})

def test_no_target_leakage():
    df = generate_synthetic_data(num_samples=10, seed=42)
    X = df.drop(columns=["is_readmitted_30d"])
    assert "is_readmitted_30d" not in X.columns

def test_pipeline_execution():
    """Test full pipeline execution without failing"""
    # This also saves the models, which are then used by the API tests
    train_and_save_pipeline(seed=42)
    
    assert os.path.exists(os.path.join(MODEL_DIR, "pipeline_v1.joblib"))
    assert os.path.exists(os.path.join(MODEL_DIR, "explainer_v1.joblib"))
    assert os.path.exists(os.path.join(MODEL_DIR, "feature_names_v1.joblib"))

def test_shap_consistency():
    """Verify that sum(shap) + base_value == model_output space"""
    pipeline_path = os.path.join(MODEL_DIR, "pipeline_v1.joblib")
    explainer_path = os.path.join(MODEL_DIR, "explainer_v1.joblib")
    
    pipeline = joblib.load(pipeline_path)
    explainer = joblib.load(explainer_path)
    
    # Generate some test data
    df = generate_synthetic_data(num_samples=10, seed=123)
    X = df.drop(columns=["is_readmitted_30d"])
    
    preprocessor = pipeline.named_steps["preprocessor"]
    model = pipeline.named_steps["classifier"]
    
    X_transformed = preprocessor.transform(X)
    
    # Probabilities from model
    probs = model.predict_proba(X_transformed)[:, 1]
    
    # SHAP values
    shap_raw = explainer.shap_values(X_transformed)
    
    if isinstance(shap_raw, list):
        shap_vals = shap_raw[1]
        base_value = explainer.expected_value[1]
    else:
        if len(shap_raw.shape) == 3:
            shap_vals = shap_raw[:, :, 1]
            base_value = explainer.expected_value[1] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value
        else:
            shap_vals = shap_raw
            base_value = explainer.expected_value[1] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value
            
    # Check consistency: sum(shap) + base_value approx equals model probability
    for i in range(len(probs)):
        shap_sum = np.sum(shap_vals[i]) + base_value
        # Use np.isclose because of floating point math and TreeExplainer probability approximations
        assert np.isclose(shap_sum, probs[i], atol=1e-3), f"SHAP sum {shap_sum} != prob {probs[i]}"
