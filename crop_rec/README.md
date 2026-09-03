# Crop Recommendation Model for Indian Conditions

This project trains a crop recommendation classifier using the public crop recommendation dataset built from Indian rainfall, climate, and fertilizer data.

Dataset source researched:
- Kaggle: Atharva Ingle, "Crop Recommendation Dataset", Apache 2.0
- Raw CSV mirror used by the script: Hugging Face `Dukuru/crop_pred`

Features:
- `N`, `P`, `K`: soil nutrient ratios
- `temperature`: degrees Celsius
- `humidity`: relative humidity percentage
- `ph`: soil pH
- `rainfall`: rainfall in mm
- `label`: crop to recommend

## Run Training

```powershell
python src/train_crop_model.py
```

Outputs are written to:
- `data/Crop_recommendation.csv`
- `models/crop_recommendation_model.joblib`
- `reports/metrics.json`
- `reports/model_comparison.csv`
- `reports/classification_report.csv`
- `reports/figures/*.png`

## Make A Prediction

```powershell
python src/predict_crop.py --N 90 --P 42 --K 43 --temperature 21 --humidity 82 --ph 6.5 --rainfall 203
```
