import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score, brier_score_loss
import shap

from backend.ml.dataset import generate_synthetic_data

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

def train_and_save_pipeline(seed: int = 42):
    """
    Trains the readmission risk model and persists it alongside the SHAP explainer.
    Ensures absolute separation of data prior to preprocessing to avoid leakage.
    """
    # 1. Deterministic data generation
    df = generate_synthetic_data(num_samples=2000, seed=seed)
    
    # Target definition
    X = df.drop(columns=["is_readmitted_30d"])
    y = df["is_readmitted_30d"]
    
    # 2. Stratified train/val/test splitting
    # 70/15/15 train/val/test split
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=seed, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=seed, stratify=y_temp
    )
    
    # 3. Preprocessing definitions
    numeric_features = ["age", "prior_admissions_count", "comorbidity_count", "noise_feature"]
    categorical_features = ["gender", "referral_reason_category"]
    
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='MISSING')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numeric_features),
            ('cat', categorical_transformer, categorical_features)
        ])
    
    # 4. Model definition
    model = RandomForestClassifier(
        n_estimators=100, 
        max_depth=6, 
        class_weight="balanced", 
        random_state=seed,
        n_jobs=-1
    )
    
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])
    
    # 5. Training
    print("Training ML Pipeline...")
    pipeline.fit(X_train, y_train)
    
    # 6. Evaluation (Strictly for pipeline integrity, NOT clinical validation)
    print("\n--- Pipeline Evaluation on Synthetic Test Data ---")
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    from sklearn.metrics import precision_score, recall_score, f1_score
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_prob)
    brier = brier_score_loss(y_test, y_prob)
    
    print("These are measurements on synthetic test data. They do not establish clinical performance.")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print(f"Brier:     {brier:.4f}")
    
    # 7. SHAP Setup
    # SHAP requires the transformed training data to build the explainer properly
    print("\nFitting SHAP Explainer...")
    X_train_transformed = preprocessor.fit_transform(X_train)
    
    # Explain probabilities (model.predict_proba)
    # Using TreeExplainer. TreeExplainer natively explains log-odds or probabilities.
    # To explain probabilities directly in scikit-learn RFC:
    # model_output='probability' is supported, but it can sometimes be slower.
    # We will use raw outputs and then map it. Wait, random forest predict_proba is just the fraction of trees.
    # For RFC, TreeExplainer default model_output is margin (log odds or just raw output). 
    # With probability, it computes exact probability contribution for RFC.
    explainer = shap.TreeExplainer(model, data=X_train_transformed, model_output='probability')
    
    # Ensure directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # 8. Extract transformed feature names
    # This ensures version-safe SHAP mappings
    num_names = numeric_features
    cat_names = preprocessor.named_transformers_['cat']['onehot'].get_feature_names_out(categorical_features)
    feature_names = num_names + list(cat_names)
    
    # Save artifacts
    pipeline_path = os.path.join(MODEL_DIR, "pipeline_v1.joblib")
    explainer_path = os.path.join(MODEL_DIR, "explainer_v1.joblib")
    features_path = os.path.join(MODEL_DIR, "feature_names_v1.joblib")
    
    joblib.dump(pipeline, pipeline_path)
    joblib.dump(explainer, explainer_path)
    joblib.dump(feature_names, features_path)
    
    print(f"\nArtifacts saved to {MODEL_DIR}")
    print("- pipeline_v1.joblib")
    print("- explainer_v1.joblib")
    print("- feature_names_v1.joblib")

if __name__ == "__main__":
    train_and_save_pipeline()
