from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "models" / "crop_recommendation_model.joblib"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Recommend a crop from soil and weather inputs.")
    parser.add_argument("--N", type=float, required=True, help="Nitrogen ratio/content in soil")
    parser.add_argument("--P", type=float, required=True, help="Phosphorous ratio/content in soil")
    parser.add_argument("--K", type=float, required=True, help="Potassium ratio/content in soil")
    parser.add_argument("--temperature", type=float, required=True, help="Temperature in Celsius")
    parser.add_argument("--humidity", type=float, required=True, help="Relative humidity in percent")
    parser.add_argument("--ph", type=float, required=True, help="Soil pH")
    parser.add_argument("--rainfall", type=float, required=True, help="Rainfall in mm")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    artifact = joblib.load(MODEL_PATH)
    features = artifact["features"]
    row = pd.DataFrame([{feature: getattr(args, feature) for feature in features}])
    model = artifact["model"]

    prediction = model.predict(row)[0]
    print(f"Recommended crop: {prediction}")

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(row)[0]
        classes = model.classes_
        ranked = sorted(zip(classes, probabilities), key=lambda item: item[1], reverse=True)[:5]
        print("Top probabilities:")
        for crop, probability in ranked:
            print(f"  {crop}: {probability:.3f}")


if __name__ == "__main__":
    main()
