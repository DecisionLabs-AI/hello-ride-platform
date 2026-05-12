import json
from pathlib import Path

import joblib
import pandas as pd


MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
WAIT_TIME_MODEL_PATH = MODELS_DIR / "xgb_wait_time_model.joblib"
BREACH_RISK_MODEL_PATH = MODELS_DIR / "xgb_breach_risk_model.joblib"
FEATURE_COLUMNS_PATH = MODELS_DIR / "feature_columns.json"


def load_ml_assets():
    required_paths = [
        WAIT_TIME_MODEL_PATH,
        BREACH_RISK_MODEL_PATH,
        FEATURE_COLUMNS_PATH,
    ]
    if not all(path.exists() for path in required_paths):
        return {
            "available": False,
            "error": "ML model artifacts not found",
        }

    try:
        wait_time_model = joblib.load(WAIT_TIME_MODEL_PATH)
        breach_risk_model = joblib.load(BREACH_RISK_MODEL_PATH)
        with FEATURE_COLUMNS_PATH.open("r", encoding="utf-8") as file:
            feature_columns = json.load(file)

        if not isinstance(feature_columns, list):
            raise ValueError("feature_columns.json must contain a list")

        return {
            "available": True,
            "wait_time_model": wait_time_model,
            "breach_risk_model": breach_risk_model,
            "feature_columns": feature_columns,
        }
    except Exception as exc:
        return {
            "available": False,
            "error": str(exc),
        }


def predict_ops_ml(feature_row: dict):
    assets = load_ml_assets()
    if not assets.get("available"):
        return assets

    try:
        features = (
            pd.DataFrame([feature_row or {}])
            .reindex(columns=assets["feature_columns"], fill_value=0)
            .fillna(0)
        )

        predicted_wait_min = float(assets["wait_time_model"].predict(features)[0])
        breach_probability = float(
            assets["breach_risk_model"].predict_proba(features)[0][1]
        )

        return {
            "available": True,
            "predicted_wait_min": predicted_wait_min,
            "breach_probability": breach_probability,
            "is_breach_risk": breach_probability >= 0.5,
        }
    except Exception as exc:
        return {
            "available": False,
            "error": str(exc),
        }
